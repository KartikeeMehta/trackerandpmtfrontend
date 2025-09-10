const express = require("express");
const router = express.Router();
const employeeTrackerController = require("../controllers/employeeTrackerController");
const authMiddleware = require("../middleware/authMiddleware");

// All routes require authentication
router.use(authMiddleware);

// Basic tracking operations
router.post("/punch-in", employeeTrackerController.punchIn);
router.post("/punch-out", employeeTrackerController.punchOut);

router.post("/idle/start", employeeTrackerController.idleStart);
router.post("/idle/end", employeeTrackerController.idleEnd);
router.post("/activity/update", employeeTrackerController.updateActivity);
router.post("/break/start", employeeTrackerController.breakStart);
router.post("/break/end", employeeTrackerController.breakEnd);

// Status and data retrieval
router.get("/status", employeeTrackerController.getCurrentStatus);
router.get("/summary/daily", employeeTrackerController.getDailySummary);
router.get("/breaks", employeeTrackerController.getBreaksForDate);
// HR attendance (owner/admin)
router.get("/attendance", employeeTrackerController.getAttendanceForDate);

module.exports = router;
