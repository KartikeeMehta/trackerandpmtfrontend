const mongoose = require("mongoose");

// Define the schema for each phase (without status)
const phaseSchema = new mongoose.Schema(
  {
    phase_id: { type: String},
    title: { type: String, required: true },
    description: { type: String },
    dueDate: { type: String, required: true },
     status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed"],
      default: "Pending"
    }
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

module.exports = mongoose.model("Project", projectSchema);