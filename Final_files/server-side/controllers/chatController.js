const User = require("../models/User");
const Employee = require("../models/Employee");
const CompanyChat = require("../models/CompanyChat");

exports.sendMessage = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ message: "Message cannot be empty" });
    }

    // Derive companyName from authenticated principal
    const companyName =
      req.user.companyName || req.user.company_name || req.user.company || null;
    if (!companyName) {
      return res
        .status(400)
        .json({ message: "companyName missing on user context" });
    }

    // Determine if the sender is a user or employee
    const user = await User.findById(req.user._id);
    const employee = await Employee.findById(req.user._id);

    let senderName;

    if (user) {
      senderName = `${user.firstName} ${user.lastName}`;
    } else if (employee) {
      senderName = employee.name;
    } else {
      return res.status(404).json({ message: "Sender not found" });
    }

    // Determine sender model type (Owner or Employee)
    let senderModel = "Owner";
    if (employee) {
      senderModel = "Employee";
    }

    // Append to per-company daily bucket only
    const now = new Date();
    const bucket = now.toISOString().slice(0, 10); // YYYY-MM-DD

    // Create the message object first
    const messageObj = {
      sender: req.user._id,
      senderModel,
      message,
      createdAt: now,
    };

    const updatedChat = await CompanyChat.findOneAndUpdate(
      { companyName, bucket },
      {
        $push: {
          messages: messageObj,
        },
      },
      { upsert: true, new: true }
    );

    // Get the actual message ID from the database
    const savedMessage = updatedChat.messages[updatedChat.messages.length - 1];
    const messageId = savedMessage._id;

    const io = req.app.get("io");
    const messageData = {
      _id: messageId, // Use the actual database ID
      sender: {
        _id: req.user._id,
        name: senderName,
        email: req.user.email,
      },
      message,
      createdAt: now,
      timestamp: now, // Add timestamp for compatibility
    };

    // Get all connected sockets in the company room
    const companyRoom = `companyRoom:${companyName}`;
    const roomSockets = io.sockets.adapter.rooms.get(companyRoom);

    // Broadcast to company room - this is the key fix for real-time updates
    io.to(companyRoom).emit("receiveMessage", messageData);

    res.status(201).json(messageData);
  } catch (error) {
    console.error("SendMessage - Error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const companyName =
      req.user.companyName || req.user.company_name || req.user.company || null;
    if (!companyName) {
      return res
        .status(400)
        .json({ message: "companyName missing on user context" });
    }

    // Load all company buckets, flatten messages, and hydrate senders in batch
    const companyBuckets = await CompanyChat.find({ companyName }).select(
      "messages"
    );

    const flatMessages = [];
    for (const bucket of companyBuckets) {
      for (const msg of bucket.messages) {
        flatMessages.push({
          sender: msg.sender,
          senderModel: msg.senderModel,
          message: msg.message,
          createdAt: msg.createdAt,
        });
      }
    }

    flatMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    // Batch hydrate senders
    const userIds = flatMessages
      .filter((m) => m.senderModel === "Owner")
      .map((m) => m.sender);
    const employeeIds = flatMessages
      .filter((m) => m.senderModel === "Employee")
      .map((m) => m.sender);

    const [users, employees] = await Promise.all([
      User.find({ _id: { $in: userIds } }).select("firstName lastName email"),
      Employee.find({ _id: { $in: employeeIds } }).select("name email"),
    ]);

    const userMap = new Map(users.map((u) => [String(u._id), u]));
    const employeeMap = new Map(employees.map((e) => [String(e._id), e]));

    const transformedMessages = flatMessages.map((m) => {
      let senderName = "Unknown User";
      let senderEmail = "unknown@email.com";
      if (m.senderModel === "Owner") {
        const u = userMap.get(String(m.sender));
        if (u) {
          senderName = `${u.firstName} ${u.lastName}`;
          senderEmail = u.email;
        }
      } else if (m.senderModel === "Employee") {
        const e = employeeMap.get(String(m.sender));
        if (e) {
          senderName = e.name;
          senderEmail = e.email;
        }
      }
      return {
        sender: { _id: m.sender, name: senderName, email: senderEmail },
        message: m.message,
        createdAt: m.createdAt,
      };
    });

    res.status(200).json(transformedMessages);
  } catch (error) {
    console.error("GetMessages - Error:", error);
    res.status(500).json({ message: error.message });
  }
};
