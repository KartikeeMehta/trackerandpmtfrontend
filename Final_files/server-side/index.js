require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const app = express();
const bodyParser = require("body-parser");
const userRoutes = require("./routes/userRoutes");
const teamRoutes = require("./routes/teamRoutes");
const employeeRoutes = require("./routes/employeeRoutes"); // updated
const projectRoutes = require('./routes/projectRoutes');
const taskRoutes = require('./routes/taskRoutes'); // task routes
const path = require("path");
const cors = require("cors");

app.use(
  cors({
    origin: "http://localhost:5173", // frontend URL
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected Successfully "))
  .catch((err) => console.log("MongoDb Connection error", err));

app.use("/api", userRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/employees", employeeRoutes); // updated
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes); // task routes

// Simple test route for debugging
app.get("/api/test", (req, res) => {
  res.json({ message: "API is working" });
});

app.listen(8000, () => {
  console.log("Server is running on port 8000");
});

