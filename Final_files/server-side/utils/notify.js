const Notification = require("../models/Notification");
const NotificationPreference = require("../models/NotificationPreference");

/**
 * Send notifications to employee recipients by teamMemberId.
 * Creates Notification docs and emits via Socket.IO to personal rooms.
 *
 * @param {object} params
 * @param {object} params.io - socket server instance
 * @param {string} params.companyName - company scope
 * @param {string} params.type - notification type
 * @param {string} params.title - brief title
 * @param {string} params.message - message body
 * @param {string} [params.link] - optional deeplink
 * @param {string} [params.projectId]
 * @param {string} [params.phaseId]
 * @param {string} [params.subtaskId]
 * @param {string[]} params.recipientTeamMemberIds - array of Employee.teamMemberId strings
 */
async function sendNotification(params) {
	const {
		io,
		companyName,
		type,
		title,
		message,
		link,
		projectId,
		phaseId,
		subtaskId,
		recipientTeamMemberIds = [],
	} = params || {};

	if (!companyName || !type || !title || !message || !Array.isArray(recipientTeamMemberIds)) {
		return;
	}

	const docs = recipientTeamMemberIds.map((tmid) => ({
		companyName,
		type,
		title,
		message,
		link,
		projectId,
		phaseId,
		subtaskId,
		recipientTeamMemberId: tmid,
	}));

	try {
		// Respect user preferences (default to enabled when no prefs exist)
		const filteredDocs = [];
		for (const d of docs) {
			try {
				const pref = await NotificationPreference.findOne({
					companyName: d.companyName,
					recipientTeamMemberId: d.recipientTeamMemberId,
				}).lean();
				if (!pref || pref[d.type] !== false) {
					filteredDocs.push(d);
				}
			} catch (_) {
				filteredDocs.push(d);
			}
		}

		if (filteredDocs.length === 0) return;

		const inserted = await Notification.insertMany(filteredDocs);
		// Emit to each recipient's personal room
		for (const n of inserted) {
			const room = `userRoom:${n.companyName}:${n.recipientTeamMemberId}`;
			if (io) {
				io.to(room).emit("notification:new", {
					_id: n._id,
					type: n.type,
					title: n.title,
					message: n.message,
					link: n.link,
					projectId: n.projectId,
					phaseId: n.phaseId,
					subtaskId: n.subtaskId,
					read: n.read,
					createdAt: n.createdAt,
				});
			}
		}
	} catch (err) {
		console.error("Failed to send notifications:", err.message);
	}
}

module.exports = { sendNotification };


