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
const taskRoutes = require("./routes/taskRoutes");
const otpRoutes = require("./routes/otpRoutes");
const chatRoutes = require("./routes/chatRoutes"); // NEW
const { Project } = require("./models/Project");
const Activity = require("./models/Activity");
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
app.use("/api/tasks", taskRoutes);
app.use("/api/otp", otpRoutes);
app.use("/api/chat", chatRoutes); // NEW

// Auto-permanent delete job: runs every day at 2am
cron.schedule("0 2 * * *", async () => {
  console.log("[CRON] Running auto-permanent delete for projects...");
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
  const projectsToDelete = await Project.find({
    project_status: "deleted",
    deletedAt: { $lte: fiveDaysAgo },
  });
  console.log(`[CRON] Found ${projectsToDelete.length} projects to delete.`);
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
      console.log(
        `[CRON] Permanently deleted project: ${project.project_name}`
      );
    } catch (err) {
      console.error(
        "[CRON] Error auto-deleting project:",
        project.project_id,
        err
      );
    }
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
    console.log("Socket user id from token:", userId);

    if (!userId) {
      console.log("No user ID found, disconnecting");
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
        console.log("Employee found in DB for id:", userId);
      } else {
        console.log("User/Employee not found in DB for id:", userId);
        return socket.disconnect(true);
      }
    } else {
      console.log("User found in DB for id:", userId);
    }

    const fullName = isEmployee
      ? user.name
      : `${user.firstName} ${user.lastName}`;
    console.log(
      "New user connected:",
      fullName,
      isEmployee ? "(Employee)" : "(User)"
    );

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
      console.log("Missing companyName on user; defaulting to globalRoom");
      socket.join("globalRoom");
    } else {
      const companyRoom = `companyRoom:${companyName}`;
      socket.join(companyRoom);
      console.log(`Joined company room: ${companyRoom}`);
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
      console.log("Server received sendMessage:", messageData);

      // Broadcast to company-scoped room if available, else global
      const companyName = socket.isEmployee
        ? socket.userDetails.companyName
        : socket.userDetails.companyName;
      const targetRoom = companyName
        ? `companyRoom:${companyName}`
        : "globalRoom";
      io.to(targetRoom).emit("receiveMessage", {
        sender: {
          _id: user._id,
          name: fullName,
          email: user.email,
        },
        message: messageData.message,
        timestamp: new Date(),
      });
    });

    // Handle explicit company room joining
    socket.on("joinCompanyRoom", (data) => {
      if (data.companyName) {
        const companyRoom = `companyRoom:${data.companyName}`;
        socket.join(companyRoom);
        console.log(
          `User ${fullName} explicitly joined company room: ${companyRoom}`
        );

        // Send confirmation
        socket.emit("roomJoined", {
          companyName: data.companyName,
          message: `Joined ${data.companyName} chat room`,
        });

        // Debug: List all rooms this socket is in
        const socketRooms = Array.from(socket.rooms);
        console.log(`User ${fullName} is now in rooms:`, socketRooms);

        // Debug: List all rooms in the system
        const allRooms = Array.from(io.sockets.adapter.rooms.keys());
        console.log("All system rooms:", allRooms);
      }
    });

    // Handle test messages for debugging
    socket.on("testMessage", (data) => {
      console.log("Received test message from client:", data);

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
      console.log(`🔍 Room status check from ${fullName}:`, data);

      // Get all rooms this socket is in
      const socketRooms = Array.from(socket.rooms);
      console.log(`User ${fullName} is in rooms:`, socketRooms);

      // Get all system rooms
      const allRooms = Array.from(io.sockets.adapter.rooms.keys());
      console.log("All system rooms:", allRooms);

      // Send room status back to client
      socket.emit("roomStatus", {
        socketRooms,
        allRooms,
        message: `You are in ${socketRooms.length} room(s)`,
      });
    });

    // Handle company room broadcasting test
    socket.on("testCompanyRoom", (data) => {
      console.log(`🌐 Company room test from ${fullName}:`, data);

      if (data.companyName) {
        const companyRoom = `companyRoom:${data.companyName}`;
        console.log(`Broadcasting test message to room: ${companyRoom}`);

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

        console.log(`✅ Test message broadcasted to ${companyRoom}`);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", fullName);
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
