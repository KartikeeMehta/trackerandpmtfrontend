require("dotenv").config();

if (process.env.QUIET === "true") {
  console.log = () => {};
  console.error = () => {};
  console.warn = () => {};
}

const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const cron = require("node-cron");
const http = require("http");
const socketIo = require("socket.io");
const User = require("./models/User"); // Adjust path to your User model
const Employee = require("./models/Employee"); // Add Employee model import
const userRoutes = require("./routes/userRoutes");
const teamRoutes = require("./routes/teamRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const projectRoutes = require("./routes/projectRoutes");

const otpRoutes = require("./routes/otpRoutes");
const chatRoutes = require("./routes/chatRoutes"); // NEW
const { Project } = require("./models/Project");
const Activity = require("./models/Activity");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const sendEmail = require("./utils/sendEmail");
const {
  deleteMultipleImagesFromCloudinary,
} = require("./utils/cloudinaryUpload");

// ✅ New middleware for Socket.IO authentication
const chatAuthMiddleware = require("./middleware/chatMiddleware");

const app = express();
const server = http.createServer(app); // Needed for socket.io
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:5173", // frontend URL
    credentials: true,
    methods: ["GET", "POST"],
  },
});

// Attach io to app so controllers can use it
app.set("io", io);

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected Successfully"))
  .catch((err) => console.log("MongoDb Connection error", err));

// ROUTES
app.use("/api", userRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/projects", projectRoutes);

app.use("/api/otp", otpRoutes);
app.use("/api/chat", chatRoutes); // NEW

// Auto-permanent delete job: runs every day at 2am
cron.schedule("0 2 * * *", async () => {
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
  const projectsToDelete = await Project.find({
    project_status: "deleted",
    deletedAt: { $lte: fiveDaysAgo },
  });

  for (const project of projectsToDelete) {
    try {
      const imageUrls = [];
      if (project.phases && Array.isArray(project.phases)) {
        project.phases.forEach((phase) => {
          if (phase.subtasks && Array.isArray(phase.subtasks)) {
            phase.subtasks.forEach((subtask) => {
              if (subtask.images && Array.isArray(subtask.images)) {
                imageUrls.push(...subtask.images);
              }
            });
          }
        });
      }
      if (imageUrls.length > 0) {
        await deleteMultipleImagesFromCloudinary(imageUrls);
      }
      await Project.findByIdAndDelete(project._id);
      await Activity.create({
        type: "Project",
        action: "permanently_delete",
        name: project.project_name,
        description: `Auto-permanently deleted project ${project.project_name} and ${imageUrls.length} associated images`,
        performedBy: "system-cron",
        companyName: project.companyName,
      });
    } catch (err) {
      console.error(
        "[CRON] Error auto-deleting project:",
        project.project_id,
        err
      );
    }
  }
});

// Resend temporary password if not used within 5 minutes (one-time)
cron.schedule("* * * * *", async () => {
  try {
    const now = new Date();
    // Find employees whose temp password expired, still must change password, no lastLogin yet, and not resent before
    const candidates = await Employee.find({
      mustChangePassword: true,
      tempPasswordResent: { $ne: true },
      lastLogin: { $exists: false },
      passwordExpiresAt: { $lte: now },
    }).limit(50);

    for (const emp of candidates) {
      const newTemp = crypto.randomBytes(6).toString("hex");
      const hashed = await bcrypt.hash(newTemp, 10);
      emp.password = hashed;
      emp.passwordExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
      emp.tempPasswordResent = true;
      await emp.save();
      try {
        await sendEmail(
          emp.email,
          "Your new temporary password",
          `Hi ${emp.name},\n\nA new temporary password has been generated for your account at ${emp.companyName}.\n\nLogin Email: ${emp.email}\nPassword: ${newTemp}\n\nThis password is valid for 5 minutes. Please login here to set your permanent password:\nhttp://localhost:5173/emp-login\n\nIf you have already set your password, please ignore this email.`
        );
      } catch (e) {
        // Do not throw; log and continue to avoid blocking future runs
        console.error("[CRON] Failed to send temp password email to", emp.email, e.message);
      }
    }
  } catch (err) {
    console.error("[CRON] Resend temp password job failed:", err);
  }
});

// Simple test route
app.get("/api/test", (req, res) => {
  res.json({ message: "API is working" });
});

// ✅ Apply chat middleware for Socket.IO connections
io.use(chatAuthMiddleware);

// SOCKET.IO EVENTS
io.on("connection", async (socket) => {
  try {
    const userId = socket.user?.id;

    if (!userId) {
      return socket.disconnect(true);
    }

    // Try to find user first, then employee
    let user = await User.findById(userId).select(
      "firstName lastName email companyName"
    );
    let isEmployee = false;

    if (!user) {
      // Try to find employee
      user = await Employee.findById(userId).select("name email companyName");
      if (user) {
        isEmployee = true;
      } else {
        return socket.disconnect(true);
      }
    }

    const fullName = isEmployee
      ? user.name
      : `${user.firstName} ${user.lastName}`;

    socket.userDetails = user;
    socket.isEmployee = isEmployee;

    // Determine companyName for scoping rooms
    let companyName = null;
    if (isEmployee) {
      // Employee model contains companyName
      companyName = user.companyName || null;
    } else {
      // Owner user model contains companyName
      companyName = user.companyName || null;
    }

    if (!companyName) {
      socket.join("globalRoom");
    } else {
      const companyRoom = `companyRoom:${companyName}`;
      socket.join(companyRoom);
    }

    // Send welcome message only to this user
    socket.emit("receiveMessage", {
      sender: {
        _id: user._id,
        name: fullName,
        email: user.email,
      },
      message: "Welcome message from server on connect",
      timestamp: new Date(),
    });

    // Listen for incoming chat messages
    socket.on("sendMessage", (messageData) => {
      // Broadcast to company-scoped room if available, else global
      const companyName = socket.isEmployee
        ? socket.userDetails.companyName
        : socket.userDetails.companyName;
      const targetRoom = companyName
        ? `companyRoom:${companyName}`
        : "globalRoom";

      // Create a proper message object with ID
      const broadcastMessage = {
        _id: `socket_${Date.now()}_${Math.random()}`, // Generate unique ID for socket messages
        sender: {
          _id: user._id,
          name: fullName,
          email: user.email,
        },
        message: messageData.message,
        createdAt: new Date(),
        timestamp: new Date(),
      };

      io.to(targetRoom).emit("receiveMessage", broadcastMessage);
    });

    // Handle explicit company room joining
    socket.on("joinCompanyRoom", (data) => {
      if (data.companyName) {
        const companyRoom = `companyRoom:${data.companyName}`;

        // Leave any existing company rooms first
        const currentRooms = Array.from(socket.rooms);
        currentRooms.forEach((room) => {
          if (room.startsWith("companyRoom:")) {
            socket.leave(room);
          }
        });

        // Join the new company room
        socket.join(companyRoom);

        // Send confirmation
        socket.emit("roomJoined", {
          companyName: data.companyName,
          message: `Joined ${data.companyName} chat room`,
        });

        // Debug: List all rooms this socket is in
        const socketRooms = Array.from(socket.rooms);

        // Debug: List all rooms in the system
        const allRooms = Array.from(io.sockets.adapter.rooms.keys());

        // Send room status back to client
        socket.emit("roomStatus", {
          socketRooms,
          allRooms,
          message: `You are in ${socketRooms.length} room(s)`,
        });
      }
    });

    // Handle test messages for debugging
    socket.on("testMessage", (data) => {
      // Echo back the test message to confirm real-time communication
      socket.emit("receiveMessage", {
        _id: `test_${Date.now()}`,
        sender: {
          _id: user._id,
          name: fullName,
          email: user.email,
        },
        message: `Echo: ${data.message}`,
        timestamp: new Date(),
      });
    });

    // Handle room status check for debugging
    socket.on("checkRoomStatus", (data) => {
      // Get all rooms this socket is in
      const socketRooms = Array.from(socket.rooms);

      // Get all system rooms
      const allRooms = Array.from(io.sockets.adapter.rooms.keys());

      // Send room status back to client
      socket.emit("roomStatus", {
        socketRooms,
        allRooms,
        message: `You are in ${socketRooms.length} room(s)`,
      });
    });

    // Handle company room broadcasting test
    socket.on("testCompanyRoom", (data) => {
      if (data.companyName) {
        const companyRoom = `companyRoom:${data.companyName}`;

        // Broadcast the test message to the company room
        io.to(companyRoom).emit("receiveMessage", {
          _id: `test_${Date.now()}`,
          sender: {
            _id: user._id,
            name: fullName,
            email: user.email,
          },
          message: `Broadcast Test: ${data.message}`,
          createdAt: new Date(),
        });
      }
    });

    socket.on("disconnect", () => {
      // User disconnected - no logging needed
    });
  } catch (err) {
    console.error("Socket connection error:", err);
    socket.disconnect(true);
  }
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
