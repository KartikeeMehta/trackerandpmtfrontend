const mongoose = require("mongoose");

// ✅ Comment Schema (embedded inside phases)
const commentSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    commentedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // ✅ Updated to match your User model
      required: true,
    },
    // Store display name at write-time to support employees and legacy users
    commentedByName: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

// ✅ Subtask Schema (embedded inside phases)
const subtaskSchema = new mongoose.Schema(
  {
    subtask_id: { type: String, required: true },
    subtask_title: { type: String, required: true },
    description: { type: String },
    assigned_team: { type: String },
    assigned_member: { type: String },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed"],
      default: "Pending",
    },
    dueDate: { type: Date },
    images: [{ type: String }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// ✅ Phase Schema (with embedded comments and subtasks)
const phaseSchema = new mongoose.Schema(
  {
    phase_id: { type: String },
    title: { type: String, required: true },
    description: { type: String },
    dueDate: { type: String, required: true },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed", "final_checks"],
      default: "Pending",
    },
    comments: [commentSchema], // ✅ Embedded comments
    subtasks: [subtaskSchema], // ✅ Embedded subtasks
  },
  { _id: false }
);

// ✅ Main Project Schema
const projectSchema = new mongoose.Schema(
  {
    project_id: { type: String, required: true, unique: true },
    project_name: { type: String, required: true },
    client_name: { type: String, required: true },
    project_description: { type: String, required: true },
    start_date: { type: String, required: true },
    end_date: { type: String, required: true },
    phases: [phaseSchema], // ✅ Updated to include commentSchema and subtaskSchema
    project_status: {
      type: String,
      enum: ["ongoing", "completed", "on hold", "deleted"],
      default: "ongoing",
    },
    project_lead: {
      type: String, // teamMemberId
      required: true,
    },
    team_members: [
      {
        type: String, // teamMemberId
        required: true,
      },
    ],
    starred: { type: Boolean, default: false },
    completion_note: { type: String },
    team_id: { type: String },
    companyName: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

const Project = mongoose.model("Project", projectSchema);

module.exports = {
  Project,
};
