const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const employeeTrackerController = require("../controllers/employeeTrackerController");
const authMiddleware = require("../middleware/authMiddleware");

// All routes require authentication
router.use(authMiddleware);

// Setup multer for screenshot uploads
const uploadDir = path.join(__dirname, "../uploads/screenshots");
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`Created screenshots directory: ${uploadDir}`);
  }
} catch (error) {
  console.error(`Error creating screenshots directory: ${error.message}`);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (fs.existsSync(uploadDir)) {
      cb(null, uploadDir);
    } else {
      cb(new Error('Screenshots directory not accessible'));
    }
  },
  filename: function (req, file, cb) {
    // Generate unique filename: timestamp_employeeId_originalname
    const employeeId = req.user._id;
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}_${employeeId}_${originalName}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for screenshots
  },
  fileFilter: (req, file, cb) => {
    // Check file type - only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for screenshots'), false);
    }
  }
});

// Error handling middleware for multer
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        success: false,
        message: 'Screenshot file too large. Maximum size is 10MB.' 
      });
    }
    return res.status(400).json({ 
      success: false,
      message: 'Screenshot upload error: ' + error.message 
    });
  } else if (error) {
    console.error('Screenshot upload error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Screenshot upload failed. Please try again.' 
    });
  }
  next();
};

// Basic tracking operations
router.post("/punch-in", employeeTrackerController.punchIn);
router.post("/punch-out", employeeTrackerController.punchOut);

// Break management
router.post("/break/start", employeeTrackerController.startBreak);
router.post("/break/end", employeeTrackerController.endBreak);

// Activity tracking
router.post("/activity", employeeTrackerController.updateActivity);
router.post("/idle", employeeTrackerController.addIdleTime);

// Screenshot management
router.post("/screenshot", 
  upload.single("screenshot"),
  handleUploadError,
  employeeTrackerController.addScreenshot
);

// Status and data retrieval
router.get("/status", employeeTrackerController.getCurrentStatus);
router.get("/daily-summary", employeeTrackerController.getDailySummary);
router.get("/date-range", employeeTrackerController.getDateRangeSummary);
router.get("/screenshots", employeeTrackerController.getScreenshots);
router.get("/stats", employeeTrackerController.getOverallStats);

// Settings management
router.patch("/settings", employeeTrackerController.updateSettings);

// Admin routes (for company admins to view all employees)
router.get("/admin/all-employees", employeeTrackerController.getAllEmployeesData);

module.exports = router;