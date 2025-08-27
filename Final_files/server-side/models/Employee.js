const mongoose = require("mongoose");

const generalSubtaskSchema = new mongoose.Schema(
  {
    subtask_id: { type: String, required: true },
    subtask_title: { type: String, required: true },
    description: { type: String },
    priority: {
      type: String,
      enum: ["Low", "High", "Critical"],
      default: "Low",
    },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed"],
      default: "Pending",
    },
    dueDate: { type: Date },
    images: [{ type: String }],
    assignedBy: { type: String }, // teamMemberId of assigner
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const employeeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    teamMemberId: { type: String, required: true, unique: true },
    designation: { type: String }, // ✅ renamed from lead-member
    phoneNo: { type: String, required: true }, // ✅ already present
    companyName: { type: String, required: true }, // ✅ new field
    profileLogo: { type: String }, // ✅ new field

    mustChangePassword: { type: Boolean, default: true },
    passwordExpiresAt: { type: Date, default: () => Date.now() + 5 * 60 * 1000 },
    tempPasswordResent: { type: Boolean, default: false }, // ✅ track one-time resend
    lastLogin: { type: Date },

    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: { type: String, default: "teamMember" }, // teamMember, teamLead, admin, manager
    token: { type: String },
    location: { type: String },
    resetOTP: { type: String },
    resetOTPExpiry: { type: Date },
    // General (non-project) subtasks assigned to this employee (admins/managers)
    generalSubtasks: [generalSubtaskSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Employee", employeeSchema);
