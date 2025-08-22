const Notification = require("../models/Notification");
const auth = require("../middleware/authMiddleware");
const NotificationPreference = require("../models/NotificationPreference");

// List current user's notifications (Employee only)
exports.getMyNotifications = async (req, res) => {
	try {
		const companyName = req.user.companyName;
		const teamMemberId = req.user.teamMemberId; // only Employee has this
		if (!companyName || !teamMemberId) {
			return res.status(200).json({ notifications: [] });
		}
		const notifications = await Notification.find({
			companyName,
			recipientTeamMemberId: teamMemberId,
		})
			.sort({ createdAt: -1 })
			.limit(100);
		return res.status(200).json({ notifications });
	} catch (err) {
		console.error("getMyNotifications error:", err);
		return res.status(500).json({ message: "Failed to fetch notifications" });
	}
};

// Unread count
exports.getUnreadCount = async (req, res) => {
	try {
		const companyName = req.user.companyName;
		const teamMemberId = req.user.teamMemberId;
		if (!companyName || !teamMemberId) {
			return res.status(200).json({ count: 0 });
		}
		const count = await Notification.countDocuments({
			companyName,
			recipientTeamMemberId: teamMemberId,
			read: false,
		});
		return res.status(200).json({ count });
	} catch (err) {
		console.error("getUnreadCount error:", err);
		return res.status(500).json({ message: "Failed to fetch unread count" });
	}
};

// Mark one as read
exports.markRead = async (req, res) => {
	try {
		const { id } = req.params;
		const companyName = req.user.companyName;
		const teamMemberId = req.user.teamMemberId;
		if (!companyName || !teamMemberId) {
			return res.status(403).json({ message: "Not allowed" });
		}
		await Notification.updateOne(
			{ _id: id, companyName, recipientTeamMemberId: teamMemberId },
			{ $set: { read: true } }
		);
		return res.status(200).json({ message: "Marked as read" });
	} catch (err) {
		console.error("markRead error:", err);
		return res.status(500).json({ message: "Failed to mark as read" });
	}
};

// Mark all as read
exports.markAllRead = async (req, res) => {
	try {
		const companyName = req.user.companyName;
		const teamMemberId = req.user.teamMemberId;
		if (!companyName || !teamMemberId) {
			return res.status(200).json({ message: "No notifications" });
		}
		await Notification.updateMany(
			{ companyName, recipientTeamMemberId: teamMemberId, read: false },
			{ $set: { read: true } }
		);
		return res.status(200).json({ message: "All marked as read" });
	} catch (err) {
		console.error("markAllRead error:", err);
		return res
			.status(500)
			.json({ message: "Failed to mark all notifications as read" });
	}
};

// Clear (delete) all my notifications
exports.clearMyNotifications = async (req, res) => {
  try {
    const companyName = req.user.companyName;
    const teamMemberId = req.user.teamMemberId;
    if (!companyName || !teamMemberId) return res.status(200).json({ cleared: 0 });
    const result = await Notification.deleteMany({ companyName, recipientTeamMemberId: teamMemberId });
    return res.status(200).json({ cleared: result?.deletedCount || 0 });
  } catch (err) {
    console.error("clearMyNotifications error:", err);
    return res.status(500).json({ message: "Failed to clear notifications" });
  }
};

// Delete specific notification by ID
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const companyName = req.user.companyName;
    const teamMemberId = req.user.teamMemberId;
    
    if (!companyName || !teamMemberId) {
      return res.status(403).json({ message: "Not allowed" });
    }
    
    const result = await Notification.deleteOne({
      _id: id,
      companyName,
      recipientTeamMemberId: teamMemberId
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Notification not found" });
    }
    
    return res.status(200).json({ message: "Notification deleted" });
  } catch (err) {
    console.error("deleteNotification error:", err);
    return res.status(500).json({ message: "Failed to delete notification" });
  }
};

// Clean up old read notifications (keep only 15 most recent)
exports.cleanupReadNotifications = async (req, res) => {
  try {
    const companyName = req.user.companyName;
    const teamMemberId = req.user.teamMemberId;
    
    if (!companyName || !teamMemberId) {
      return res.status(403).json({ message: "Not allowed" });
    }
    
    // Get all read notifications sorted by creation date (oldest first)
    const readNotifications = await Notification.find({
      companyName,
      recipientTeamMemberId: teamMemberId,
      read: true
    }).sort({ createdAt: 1 });
    
    // If there are more than 15 read notifications, delete the oldest ones
    if (readNotifications.length > 15) {
      const notificationsToDelete = readNotifications.slice(0, readNotifications.length - 15);
      const idsToDelete = notificationsToDelete.map(n => n._id);
      
      const result = await Notification.deleteMany({
        _id: { $in: idsToDelete },
        companyName,
        recipientTeamMemberId: teamMemberId
      });
      
      return res.status(200).json({ 
        message: `Cleaned up ${result.deletedCount} old read notifications`,
        deletedCount: result.deletedCount
      });
    }
    
    return res.status(200).json({ message: "No cleanup needed" });
  } catch (err) {
    console.error("cleanupReadNotifications error:", err);
    return res.status(500).json({ message: "Failed to cleanup notifications" });
  }
};

// Get or create my preferences
exports.getMyPreferences = async (req, res) => {
  try {
    const companyName = req.user.companyName;
    const teamMemberId = req.user.teamMemberId;
    if (!companyName || !teamMemberId) return res.status(200).json({});
    let pref = await NotificationPreference.findOne({ companyName, recipientTeamMemberId: teamMemberId });
    if (!pref) {
      pref = await NotificationPreference.create({ companyName, recipientTeamMemberId: teamMemberId });
    }
    return res.status(200).json(pref);
  } catch (err) {
    console.error("getMyPreferences error:", err);
    return res.status(500).json({ message: "Failed to fetch preferences" });
  }
};

// Update my preferences
exports.updateMyPreferences = async (req, res) => {
  try {
    const companyName = req.user.companyName;
    const teamMemberId = req.user.teamMemberId;
    if (!companyName || !teamMemberId) return res.status(403).json({ message: "Not allowed" });
    const updates = req.body || {};
    const pref = await NotificationPreference.findOneAndUpdate(
      { companyName, recipientTeamMemberId: teamMemberId },
      { $set: updates },
      { upsert: true, new: true }
    );
    return res.status(200).json(pref);
  } catch (err) {
    console.error("updateMyPreferences error:", err);
    return res.status(500).json({ message: "Failed to update preferences" });
  }
};


