const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
	{
		companyName: { type: String, required: true },
		type: {
			type: String,
			enum: [
				"project_created",
				"project_completed",
				"project_deadline",
				"phase_added",
				"phase_deadline",
				"subtask_assigned",
				"subtask_deadline",
				"team_created",
				"team_member_added",
				"project_member_added",
				"chat_mention",
			],
			required: true,
		},
		title: { type: String, required: true },
		message: { type: String, required: true },
		link: { type: String },
		projectId: { type: String }, // stores project_id (business id)
		phaseId: { type: String },
		subtaskId: { type: String },
		recipientTeamMemberId: { type: String, required: true }, // Employee.teamMemberId
		read: { type: Boolean, default: false },
	},
	{ timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);


