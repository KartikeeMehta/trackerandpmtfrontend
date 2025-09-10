const User = require("../models/User");
const Employee = require("../models/Employee");
const CompanyChat = require("../models/CompanyChat");
const { sendNotification } = require("../utils/notify");

exports.sendMessage = async (req, res) => {
  try {
    const { message, mentions } = req.body;
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
      mentions: Array.isArray(mentions) ? mentions.slice(0, 10) : [],
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
        role: req.user.role || null,
      },
      senderModel,
      message,
      createdAt: now,
      timestamp: now, // Add timestamp for compatibility
      mentions: Array.isArray(mentions) ? mentions.slice(0, 10) : [],
    };

    // Get all connected sockets in the company room
    const companyRoom = `companyRoom:${companyName}`;
    const roomSockets = io.sockets.adapter.rooms.get(companyRoom);

    // Broadcast to company room - this is the key fix for real-time updates
    io.to(companyRoom).emit("receiveMessage", messageData);

    // Resolve @mentions (names) to Employee recipients and notify
    try {
      const names = Array.isArray(mentions)
        ? mentions.map((n) => String(n || "").trim()).filter(Boolean)
        : [];
      if (names.length) {
        // Fetch employees within company and resolve each token robustly
        const employees = await Employee.find({ companyName })
          .select("teamMemberId name")
          .lean();
        const normalized = employees.map((e) => ({
          id: String(e.teamMemberId || ""),
          name: String(e.name || ""),
          key: String(e.name || "").trim().toLowerCase(),
        }));
        // Also resolve owner name so mentions can target owner
        const ownerUser = await User.findOne({ companyName }).select("firstName lastName").lean();
        let ownerFullName = ownerUser ? `${ownerUser.firstName || ""} ${ownerUser.lastName || ""}`.trim() : "";
        const ownerKey = ownerFullName.toLowerCase();
        const tokens = names.map((n) => n.trim().toLowerCase());
        const recipientIds = [];
        for (const t of tokens) {
          let match = normalized.find((e) => e.key === t);
          if (!match) match = normalized.find((e) => e.key.includes(t));
          if (match && match.id) {
            recipientIds.push(match.id);
          } else if (ownerKey && (t === ownerKey || ownerFullName.toLowerCase().includes(t))) {
            recipientIds.push("OWNER");
          }
        }
        // de-duplicate
        const seen = new Set();
        const uniqueRecipientIds = recipientIds.filter((id) => (id && !seen.has(id) ? (seen.add(id), true) : false));
        if (uniqueRecipientIds.length) {
          await sendNotification({
            io,
            companyName,
            type: "chat_mention",
            title: `You were mentioned by ${senderName}`,
            message: `chat_mention: ${message}`,
            link: "/messaging",
            recipientTeamMemberIds: uniqueRecipientIds,
          });
        }
      }
    } catch (err) {
      console.error("Mention notification failed:", err.message);
    }

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
          _id: msg._id,
          editedAt: msg.editedAt || null,
          mentions: Array.isArray(msg.mentions) ? msg.mentions : [],
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
        senderModel: m.senderModel,
        message: m.message,
        createdAt: m.createdAt,
        _id: m._id,
        editedAt: m.editedAt,
        mentions: m.mentions,
      };
    });

    res.status(200).json(transformedMessages);
  } catch (error) {
    console.error("GetMessages - Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Edit a message (sender-only)
exports.editMessage = async (req, res) => {
  try {
    const { messageId, message } = req.body;
    if (!messageId || !message) {
      return res.status(400).json({ message: "messageId and message required" });
    }
    const companyName =
      req.user.companyName || req.user.company_name || req.user.company || null;
    if (!companyName) {
      return res.status(400).json({ message: "companyName missing on user context" });
    }
    // Find today's and past buckets that may contain the message
    const doc = await CompanyChat.findOne({
      companyName,
      "messages._id": messageId,
      "messages.sender": req.user._id,
    });
    if (!doc) return res.status(404).json({ message: "Message not found" });
    const msg = doc.messages.id(messageId);
    if (!msg) return res.status(404).json({ message: "Message not found" });
    if (String(msg.sender) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not allowed" });
    }
    msg.message = message;
    msg.editedAt = new Date();
    await doc.save();

    const io = req.app.get("io");
    const out = {
      _id: msg._id,
      message: msg.message,
      editedAt: msg.editedAt,
    };
    io.to(`companyRoom:${companyName}`).emit("messageEdited", out);
    res.json({ success: true, ...out });
  } catch (error) {
    console.error("EditMessage - Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Delete a message (sender or owner/admin)
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.body;
    if (!messageId) return res.status(400).json({ message: "messageId required" });
    const companyName =
      req.user.companyName || req.user.company_name || req.user.company || null;
    if (!companyName) {
      return res.status(400).json({ message: "companyName missing on user context" });
    }

    // Find the doc containing the message
    const doc = await CompanyChat.findOne({ companyName, "messages._id": messageId });
    if (!doc) return res.status(404).json({ message: "Message not found" });
    const msg = doc.messages.id(messageId);
    if (!msg) return res.status(404).json({ message: "Message not found" });

    // Authorization rules:
    // - Sender can delete their own
    // - Owner can delete anyone's
    // - Admin can delete anyone's EXCEPT owner's
    const isSender = String(msg.sender) === String(req.user._id);
    const role = (req.user.role || "").toLowerCase();

    if (!isSender) {
      if (role === "owner") {
        // allowed
      } else if (role === "admin") {
        // Need to ensure target is not an Owner message
        const targetIsOwner = msg.senderModel === "Owner";
        if (targetIsOwner) {
          return res.status(403).json({ message: "Admins cannot delete owner's messages" });
        }
      } else {
        return res.status(403).json({ message: "Not allowed" });
      }
    }

    msg.deleteOne();
    await doc.save();

    const io = req.app.get("io");
    io.to(`companyRoom:${companyName}`).emit("messageDeleted", { _id: messageId });
    res.json({ success: true, _id: messageId });
  } catch (error) {
    console.error("DeleteMessage - Error:", error);
    res.status(500).json({ message: error.message });
  }
};
