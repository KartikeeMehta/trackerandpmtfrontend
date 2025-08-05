const mongoose = require("mongoose");

// Define the schema for each phase (without status)
const phaseSchema = new mongoose.Schema(
  {
    phase_id: { type: String },
    title: { type: String, required: true },
    description: { type: String },
    dueDate: { type: String, required: true },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed"],
      default: "Pending",
    },
  },
  { _id: false } // Optional: keep true if you want phase _id
);

// Main project schema
const projectSchema = new mongoose.Schema(
  {
    project_id: { type: String, required: true, unique: true },
    project_name: { type: String, required: true },
    client_name: { type: String, required: true },
    project_description: { type: String, required: true },
    start_date: { type: String, required: true },
    end_date: { type: String, required: true },
    phases: [phaseSchema], // ✅ Phases added, no status
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
    completion_note: { type: String },
    team_id: { type: String },
    companyName: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

// ✅ Subtask Schema
const subtaskSchema = new mongoose.Schema(
  {
    subtask_id: { type: String, unique: true },
    subtask_title: { type: String, required: true },
    description: { type: String },
    assigned_team: { type: String },
    assigned_member: { type: String },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed"],
      default: "Pending",
    },
    phase_id: { type: String, required: true }, // Link to which phase this subtask belongs
    companyName: { type: String, required: true },
    images: [{ type: String }], // Array of image URLs or file paths
  },
  {
    timestamps: true,
  }
);

const Project = mongoose.model("Project", projectSchema);
const Subtask = mongoose.model("Subtask", subtaskSchema);

module.exports = {
  Project: mongoose.model("Project", projectSchema),
  Subtask: mongoose.model("Subtask", subtaskSchema),
};
