const Chat = require("../models/Chat");

exports.sendMessage = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ message: "Message cannot be empty" });
    }

    const newMessage = await Chat.create({
      sender: req.user._id,
      message,
    });

    const io = req.app.get("io");
    io.to("globalRoom").emit("receiveMessage", {
      sender: req.user.name,
      message,
      createdAt: newMessage.createdAt,
    });

    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const messages = await Chat.find()
      .populate("sender", "name email")
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};