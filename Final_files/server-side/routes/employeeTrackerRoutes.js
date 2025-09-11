const express = require("express");
const router = express.Router();
const employeeTrackerController = require("../controllers/employeeTrackerController");
const authMiddleware = require("../middleware/authMiddleware");
const hrGuard = require("../middleware/hrGuard");

// All routes require authentication
router.use(authMiddleware);

// Basic tracking operations
router.post("/punch-in", hrGuard, employeeTrackerController.punchIn);
router.post("/punch-out", hrGuard, employeeTrackerController.punchOut);

router.post("/idle/start", hrGuard, employeeTrackerController.idleStart);
router.post("/idle/end", hrGuard, employeeTrackerController.idleEnd);
router.post("/activity/update", hrGuard, employeeTrackerController.updateActivity);
router.post("/break/start", hrGuard, employeeTrackerController.breakStart);
router.post("/break/end", hrGuard, employeeTrackerController.breakEnd);

// Status and data retrieval
router.get("/status", hrGuard, employeeTrackerController.getCurrentStatus);
router.get("/summary/daily", hrGuard, employeeTrackerController.getDailySummary);
router.get("/summary/monthly", hrGuard, employeeTrackerController.getMonthlySummary);
router.get("/breaks", hrGuard, employeeTrackerController.getBreaksForDate);
// HR attendance (owner/admin)
router.get("/attendance", hrGuard, employeeTrackerController.getAttendanceForDate);
// Leaderboard (company-wide monthly)
router.get(
  "/leaderboard/monthly",
  hrGuard,
  employeeTrackerController.getLeaderboardMonthly
);

module.exports = router;
