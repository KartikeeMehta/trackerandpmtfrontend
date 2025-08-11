const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const chatMiddleware = require("../middleware/chatMiddleware");
const authMiddleware = require("../middleware/authMiddleware");

// POST a message
router.post("/send", authMiddleware, chatController.sendMessage);

// GET all messages
router.get("/", authMiddleware, chatController.getMessages);

module.exports = router;