const mongoose = require("mongoose");

const notificationPreferenceSchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true },
    recipientTeamMemberId: { type: String, required: true, index: true },
    // Each type default enabled
    project_created: { type: Boolean, default: true },
    project_completed: { type: Boolean, default: true },
    project_deadline: { type: Boolean, default: true },
    phase_added: { type: Boolean, default: true },
    phase_deadline: { type: Boolean, default: true },
    subtask_assigned: { type: Boolean, default: true },
    subtask_deadline: { type: Boolean, default: true },
    team_created: { type: Boolean, default: true },
    team_member_added: { type: Boolean, default: true },
    project_member_added: { type: Boolean, default: true },
    // Chat mentions
    chat_mention: { type: Boolean, default: true },
  },
  { timestamps: true }
);

notificationPreferenceSchema.index({ companyName: 1, recipientTeamMemberId: 1 }, { unique: true });

module.exports = mongoose.model("NotificationPreference", notificationPreferenceSchema);


