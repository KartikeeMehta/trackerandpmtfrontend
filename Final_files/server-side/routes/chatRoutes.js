const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const chatMiddleware = require("../middleware/chatMiddleware");
const authMiddleware = require("../middleware/authMiddleware");
const EmployeeController = require("../controllers/EmployeeController");

// POST a message
router.post("/send", authMiddleware, chatController.sendMessage);

// GET all messages
router.get("/", authMiddleware, chatController.getMessages);

// Lightweight directory for @mentions (name + teamMemberId)
router.get(
  "/directory",
  authMiddleware,
  async (req, res) => {
    try {
      const Employee = require("../models/Employee");
      const User = require("../models/User");
      const [emps, owner] = await Promise.all([
        Employee.find({ companyName: req.user.companyName })
          .select("name teamMemberId")
          .lean(),
        User.findOne({ companyName: req.user.companyName })
          .select("firstName lastName role")
          .lean(),
      ]);
      const list = Array.isArray(emps) ? emps : [];
      if (owner) {
        list.unshift({ name: `${owner.firstName} ${owner.lastName}`.trim(), teamMemberId: "OWNER" });
      }
      res.json({ people: list });
    } catch (e) {
      res.status(500).json({ people: [], message: "Failed to load directory" });
    }
  }
);

// Edit a message
router.post("/edit", authMiddleware, chatController.editMessage);

// Delete a message
router.post("/delete", authMiddleware, chatController.deleteMessage);

module.exports = router;