const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const ctrl = require("../controllers/notificationController");

router.get("/mine", auth, ctrl.getMyNotifications);
router.get("/unread-count", auth, ctrl.getUnreadCount);
router.patch("/:id/read", auth, ctrl.markRead);
router.patch("/read-all", auth, ctrl.markAllRead);
router.get("/preferences/mine", auth, ctrl.getMyPreferences);
router.patch("/preferences/mine", auth, ctrl.updateMyPreferences);
router.delete("/clear-all", auth, ctrl.clearMyNotifications);
router.delete("/:id", auth, ctrl.deleteNotification);
router.post("/cleanup-read", auth, ctrl.cleanupReadNotifications);

module.exports = router;


