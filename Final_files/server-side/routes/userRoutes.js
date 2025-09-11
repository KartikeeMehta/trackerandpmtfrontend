const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const hrSettingsController = require("../controllers/hrSettingsController");

const authMiddleware = require("../middleware/authMiddleware");
const EmployeeController = require("../controllers/EmployeeController");

// Multer setup for company logo upload
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure upload directory exists with better error handling
const uploadDir = path.join(__dirname, "../uploads/companyLogos");
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`Created upload directory: ${uploadDir}`);
  }
} catch (error) {
  console.error(`Error creating upload directory: ${error.message}`);
  // Fallback to temp directory if needed
  const tempDir = path.join(process.cwd(), "temp_uploads");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Check if directory exists and is writable
    if (fs.existsSync(uploadDir) && fs.accessSync(uploadDir, fs.constants.W_OK)) {
      cb(null, uploadDir);
    } else {
      console.error(`Upload directory not accessible: ${uploadDir}`);
      cb(new Error('Upload directory not accessible'));
    }
  },
  filename: function (req, file, cb) {
    // Sanitize filename for production
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + originalName);
  },
});

// Enhanced multer configuration with error handling
const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Error handling middleware for multer
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 5MB.' });
    }
    return res.status(400).json({ message: 'File upload error: ' + error.message });
  } else if (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ message: 'File upload failed. Please try again.' });
  }
  next();
};

router.post("/register", userController.register);
router.post("/login", userController.login);
router.post("/update", authMiddleware, userController.update);
router.patch(
  "/update",
  authMiddleware,
  upload.single("companyLogo"),
  handleUploadError,
  userController.update
);
router.get("/profile", authMiddleware, userController.getUserProfile);
router.post("/change-password", authMiddleware, userController.changePassword);
// HR settings endpoints (owner/admin)
router.get("/hr-settings", authMiddleware, hrSettingsController.getSettings);
router.post("/hr-settings", authMiddleware, hrSettingsController.updateSettings);
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

module.exports = router;