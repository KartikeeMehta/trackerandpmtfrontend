const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed'],
    default: 'pending',
  },
  assignedTo: {
    type: String, // Now storing teamMemberId (e.g., WS-001)
    required: true,
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  assignedByRole: {
    type: String,
    enum: ['owner', 'admin', 'team_lead'],
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
  completedAt: Date,
});

module.exports = mongoose.model('Task', taskSchema);
