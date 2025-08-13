const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'senderModel',  // Use refPath for dynamic referencing
    required: true,
  },
  senderModel: {
    type: String,
    required: true,
    enum: ['User', 'Employee']  // Only allow these two models
  },
  companyName: {
    type: String,
    required: true,
    index: true,
  },
  message: {
    type: String,
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

// Optimize common query patterns
chatSchema.index({ companyName: 1, createdAt: 1 });

module.exports = mongoose.model("Chat", chatSchema);