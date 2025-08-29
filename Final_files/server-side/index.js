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
const notificationRoutes = require("./routes/notificationRoutes");
const { Project } = require("./models/Project");
const Activity = require("./models/Activity");
const Notification = require("./models/Notification");
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
// Base path when app is deployed under a subdirectory (e.g., /backend)
const BASE_PATH = process.env.BASE_PATH || "/backend";
// Allow one or more origins via env FRONTEND_ORIGIN (comma separated)
const allowedOrigins = (
  process.env.FRONTEND_ORIGIN ||
  "http://localhost:5173,https://railwayselfpmtdeployed-production.up.railway.app,https://project-flow.digiwbs.com"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  },
});

// Attach io to app so controllers can use it
app.set("io", io);

// Comprehensive CORS configuration
app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Allow requests from any of the allowed origins
  if (origin && allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  } else if (!origin) {
    // Allow requests with no origin (like mobile apps or curl requests)
    res.header("Access-Control-Allow-Origin", "*");
  }

  // Set all necessary CORS headers
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS, PATCH"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers"
  );
  res.header("Access-Control-Max-Age", "86400"); // 24 hours

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling preflight request");
    res.status(200).end();
    return;
  }

  next();
});

// Also use the cors middleware as backup
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
      "Access-Control-Request-Method",
      "Access-Control-Request-Headers",
    ],
    optionsSuccessStatus: 200,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Global request logger (debug)
app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.originalUrl}`);
  next();
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
// Also serve uploads under base path
app.use(
  `${BASE_PATH}/uploads`,
  express.static(path.join(__dirname, "uploads"))
);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected Successfully"))
  .catch((err) => console.log("MongoDb Connection error", err));

// ROUTES (root)
app.use("/api", userRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/otp", otpRoutes);
app.use("/api/chat", chatRoutes); // NEW
app.use("/api/notifications", notificationRoutes);

// ROUTES (with base path prefix for cPanel Application Manager Base URL)
app.use(`${BASE_PATH}/api`, userRoutes);
app.use(`${BASE_PATH}/api/teams`, teamRoutes);
app.use(`${BASE_PATH}/api/employees`, employeeRoutes);
app.use(`${BASE_PATH}/api/projects`, projectRoutes);
app.use(`${BASE_PATH}/api/otp`, otpRoutes);
app.use(`${BASE_PATH}/api/chat`, chatRoutes);
app.use(`${BASE_PATH}/api/notifications`, notificationRoutes);

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
// Deadline reminder job: runs hourly
cron.schedule("0 * * * *", async () => {
  try {
    const now = new Date();
    const in48h = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const projects = await Project.find({ project_status: { $ne: "deleted" } });
    for (const p of projects) {
      // Project end_date
      if (p.end_date) {
        const end = new Date(p.end_date);
        if (end >= now && end <= in48h) {
          const recipients = [p.project_lead, ...(p.team_members || [])].filter(
            Boolean
          );
          await Notification.updateMany(
            {
              companyName: p.companyName,
              type: "project_deadline",
              projectId: p.project_id,
              recipientTeamMemberId: { $in: recipients },
              message: { $regex: /due soon/i },
            },
            { $setOnInsert: { title: "Project deadline approaching" } },
            { upsert: false }
          );
          const io = app.get("io");
          for (const r of recipients) {
            const exists = await Notification.findOne({
              companyName: p.companyName,
              type: "project_deadline",
              projectId: p.project_id,
              recipientTeamMemberId: r,
              createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            });
            if (!exists) {
              const doc = await Notification.create({
                companyName: p.companyName,
                type: "project_deadline",
                title: "Project deadline approaching",
                message: `Project ${p.project_name} is due soon (${p.end_date}).`,
                link: `/projects/${p.project_id}`,
                projectId: p.project_id,
                recipientTeamMemberId: r,
              });
              io.to(`userRoom:${p.companyName}:${r}`).emit(
                "notification:new",
                doc
              );
            }
          }
        }
      }

      // Phases deadlines
      for (const ph of p.phases || []) {
        if (ph.dueDate) {
          const phDue = new Date(ph.dueDate);
          if (phDue >= now && phDue <= in48h) {
            const recipients = [
              p.project_lead,
              ...(p.team_members || []),
            ].filter(Boolean);
            for (const r of recipients) {
              const exists = await Notification.findOne({
                companyName: p.companyName,
                type: "phase_deadline",
                projectId: p.project_id,
                phaseId: ph.phase_id,
                recipientTeamMemberId: r,
                createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
              });
              if (!exists) {
                const doc = await Notification.create({
                  companyName: p.companyName,
                  type: "phase_deadline",
                  title: "Phase deadline approaching",
                  message: `Phase '${ph.title}' in project ${p.project_name} is due soon (${ph.dueDate}).`,
                  link: `/projects/${p.project_id}`,
                  projectId: p.project_id,
                  phaseId: ph.phase_id,
                  recipientTeamMemberId: r,
                });
                const io = app.get("io");
                io.to(`userRoom:${p.companyName}:${r}`).emit(
                  "notification:new",
                  doc
                );
              }
            }
          }
        }

        // Subtasks deadlines
        for (const st of ph.subtasks || []) {
          if (st.dueDate && st.assigned_member) {
            const stDue = new Date(st.dueDate);
            if (stDue >= now && stDue <= in48h) {
              const r = st.assigned_member;
              const exists = await Notification.findOne({
                companyName: p.companyName,
                type: "subtask_deadline",
                projectId: p.project_id,
                phaseId: ph.phase_id,
                subtaskId: st.subtask_id,
                recipientTeamMemberId: r,
                createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
              });
              if (!exists) {
                const doc = await Notification.create({
                  companyName: p.companyName,
                  type: "subtask_deadline",
                  title: "Subtask deadline approaching",
                  message: `Subtask '${
                    st.subtask_title
                  }' is due soon (${new Date(
                    st.dueDate
                  ).toLocaleDateString()}).`,
                  link: `/projects/${p.project_id}`,
                  projectId: p.project_id,
                  phaseId: ph.phase_id,
                  subtaskId: st.subtask_id,
                  recipientTeamMemberId: r,
                });
                const io = app.get("io");
                io.to(`userRoom:${p.companyName}:${r}`).emit(
                  "notification:new",
                  doc
                );
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("[CRON] Deadline notification error:", err.message);
  }
});

// Auto-disconnect trackers paired more than 3 days ago
cron.schedule("0 3 * * *", async () => {
  try {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const users = await User.updateMany(
      { pairingStatus: "paired", lastPaired: { $lt: threeDaysAgo } },
      {
        $set: {
          pairingStatus: "not_paired",
          pairingOTP: null,
          pairingOTPExpiry: null,
        },
        $unset: { lastPaired: "" },
      }
    );
    if (users?.modifiedCount) {
      console.log(`[CRON] Auto-disconnected ${users.modifiedCount} trackers inactive >3 days`);
    }
  } catch (err) {
    console.error("[CRON] Auto-disconnect job failed:", err.message);
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
      emp.passwordExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
      emp.tempPasswordResent = true;
      await emp.save();
      try {
        await sendEmail(
          emp.email,
          "Your new temporary password",
          `Hi ${emp.name},\n\nA new temporary password has been generated for your account at ${emp.companyName}.\n\nLogin Email: ${emp.email}\nPassword: ${newTemp}\n\nThis password is vloid for 30 minutes. Please login here to set your permanent password:\nhttps://project-flow.digiwbs.com/emp-login\n\nIf you have already set your password, please ignore this email.`
        );
      } catch (e) {
        // Do not throw; log and continue to avoid blocking future runs
        console.error(
          "[CRON] Failed to send temp password email to",
          emp.email,
          e.message
        );
      }
    }
  } catch (err) {
    console.error("[CRON] Resend temp password job failed:", err);
  }
});

// Simple test route
app.get("/", (req, res) => {
  res.json({ message: "Backend OK", base: "/backend", api: "/backend/api" });
});
app.get("/api/test", (req, res) => {
  res.json({ message: "API is working" });
});
app.get(`${BASE_PATH}/`, (req, res) => {
  res.json({ message: "Backend OK", base: BASE_PATH, api: `${BASE_PATH}/api` });
});
app.get(`${BASE_PATH}/api/test`, (req, res) => {
  res.json({ message: "API is working" });
});

// Debug route to check CORS headers
app.get("/api/cors-test", (req, res) => {
  res.json({
    message: "CORS test successful",
    origin: req.headers.origin,
    allowedOrigins: allowedOrigins,
    timestamp: new Date().toISOString(),
  });
});
app.get(`${BASE_PATH}/api/cors-test`, (req, res) => {
  res.json({
    message: "CORS test successful",
    origin: req.headers.origin,
    allowedOrigins: allowedOrigins,
    timestamp: new Date().toISOString(),
  });
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
      user = await Employee.findById(userId).select(
        "name email companyName teamMemberId"
      );
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

    // Join personal room for employees to receive notifications
    if (isEmployee && user.teamMemberId) {
      const personalRoom = `userRoom:${companyName}:${user.teamMemberId}`;
      socket.join(personalRoom);
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

// Catch-all 404 logger and JSON response
app.use((req, res) => {
  console.warn(`[404] ${req.method} ${req.originalUrl}`);
  res.status(404).json({ success: false, message: 'Not Found', path: req.originalUrl });
});
