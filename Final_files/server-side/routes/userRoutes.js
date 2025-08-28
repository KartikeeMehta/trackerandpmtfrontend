const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const trackerController = require("../controllers/trackerController");
const authMiddleware = require("../middleware/authMiddleware");
const EmployeeController = require("../controllers/EmployeeController");

// Multer setup for company logo upload
const multer = require("multer");
const path = require("path");
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../uploads/companyLogos"));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});
const upload = multer({ storage });

router.post("/register", userController.register);
router.post("/login", userController.login);
router.post("/update", authMiddleware, userController.update);
router.patch(
  "/update",
  authMiddleware,
  upload.single("companyLogo"),
  userController.update
);
router.get("/profile", authMiddleware, userController.getUserProfile);
router.post("/change-password", authMiddleware, userController.changePassword);
router.get(
  "/activity/recent",
  authMiddleware,
  EmployeeController.getRecentActivity
);

// Tracker pairing routes
router.post(
  "/pairing/generate",
  authMiddleware,
  userController.generatePairingOTP
);
// OTP verification must be accessible to the desktop app (no auth token available)
router.post("/pairing/verify", userController.verifyPairingOTP);
router.get("/pairing/status", authMiddleware, userController.getPairingStatus);
router.delete(
  "/pairing/disconnect",
  authMiddleware,
  userController.disconnectTracker
);
// Desktop emergency disconnect by email (no auth)
router.post("/pairing/disconnect-by-email", userController.disconnectByEmail);

// Tracker APIs (desktop app will call these; verifyPairing already pairs)
// router.post("/tracker/start", trackerController.startSession);
// router.post("/tracker/stop", trackerController.stopSession);
// router.post("/tracker/idle", trackerController.pushIdle);
// router.post("/tracker/break", trackerController.pushBreak);
// router.get("/tracker/stats/today", trackerController.statsToday);
// router.get("/tracker/sessions/today", trackerController.listToday);

router.post("/tracker/start", trackerController.punchIn);

// Punch Out → end session
router.post("/tracker/stop", trackerController.punchOut);

// Push Idle periods
router.post("/tracker/idle", trackerController.pushIdle);

// Break Start
router.post("/tracker/break/start", trackerController.breakStart);

// Break End
router.post("/tracker/break/end", trackerController.breakEnd);

// Stats Today
router.get("/tracker/stats/today", trackerController.statsToday);

// List Today's Sessions
router.get("/tracker/sessions/today", trackerController.listToday);



module.exports = router;
