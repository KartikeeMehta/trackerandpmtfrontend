const Chat = require("../models/Chat");
const User = require("../models/User");
const Employee = require("../models/Employee");

exports.sendMessage = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ message: "Message cannot be empty" });
    }

    console.log("SendMessage - req.user:", req.user);
    console.log("SendMessage - req.user._id:", req.user._id);

    // Determine if the sender is a user or employee
    const user = await User.findById(req.user._id);
    const employee = await Employee.findById(req.user._id);
    
    console.log("SendMessage - Found user:", user);
    console.log("SendMessage - Found employee:", employee);
    
    let senderName;
    
    if (user) {
      senderName = `${user.firstName} ${user.lastName}`;
      console.log("SendMessage - Using user name:", senderName);
    } else if (employee) {
      senderName = employee.name;
      console.log("SendMessage - Using employee name:", senderName);
    } else {
      console.log("SendMessage - No user or employee found");
      return res.status(404).json({ message: "Sender not found" });
    }

    // Determine sender model type
    let senderModel = 'User';
    if (employee) {
      senderModel = 'Employee';
    }

    console.log("SendMessage - Creating message with senderModel:", senderModel);

    const newMessage = await Chat.create({
      sender: req.user._id,
      senderModel: senderModel,
      message,
    });

    console.log("SendMessage - Message created:", newMessage);

    const io = req.app.get("io");
    const messageData = {
      sender: {
        _id: req.user._id,
        name: senderName,
        email: req.user.email
      },
      message,
      createdAt: newMessage.createdAt,
    };
    
    console.log("SendMessage - Broadcasting message data:", messageData);
    io.to("globalRoom").emit("receiveMessage", messageData);

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("SendMessage - Error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    console.log("GetMessages - Starting to fetch messages");
    
    const messages = await Chat.find()
      .populate({
        path: 'sender',
        select: 'firstName lastName email name',
        refPath: 'senderModel'
      })
      .sort({ createdAt: 1 });

    console.log("GetMessages - Raw messages from DB:", messages.length);

    // Transform the messages to include the full name
    const transformedMessages = await Promise.all(messages.map(async (message) => {
      console.log("GetMessages - Processing message:", message._id);
      console.log("GetMessages - Message sender:", message.sender);
      
      let senderName = 'Unknown User';
      let senderEmail = 'unknown@email.com';
      let senderId = message._id;

      if (message.sender) {
        senderId = message.sender._id;
        senderEmail = message.sender.email || 'unknown@email.com';
        
        // Check if it's a user (has firstName and lastName)
        if (message.sender.firstName && message.sender.lastName) {
          senderName = `${message.sender.firstName} ${message.sender.lastName}`;
          console.log("GetMessages - User name:", senderName);
        } 
        // Check if it's an employee (has name field)
        else if (message.sender.name) {
          senderName = message.sender.name;
          console.log("GetMessages - Employee name:", senderName);
        } 
        // If neither, try to fetch the sender details directly
        else {
          console.log("GetMessages - Sender details not populated, fetching directly");
          
          // Try to find as user first
          const user = await User.findById(message.sender._id).select("firstName lastName email");
          if (user) {
            senderName = `${user.firstName} ${user.lastName}`;
            senderEmail = user.email;
            console.log("GetMessages - Found user directly:", senderName);
          } else {
            // Try to find as employee
            const employee = await Employee.findById(message.sender._id).select("name email");
            if (employee) {
              senderName = employee.name;
              senderEmail = employee.email;
              console.log("GetMessages - Found employee directly:", senderName);
            } else {
              console.log("GetMessages - No user or employee found for ID:", message.sender._id);
            }
          }
        }
      } else {
        console.log("GetMessages - No sender found for message:", message._id);
      }

      const transformedMessage = {
        ...message.toObject(),
        sender: {
          _id: senderId,
          name: senderName,
          email: senderEmail
        }
      };
      
      console.log("GetMessages - Transformed message sender:", transformedMessage.sender);
      return transformedMessage;
    }));

    console.log("GetMessages - Returning", transformedMessages.length, "messages");
    res.status(200).json(transformedMessages);
  } catch (error) {
    console.error("GetMessages - Error:", error);
    res.status(500).json({ message: error.message });
  }
};