const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  companyName: { type: String, required: true, unique: true },
  companyDomain: { type: String, required: true, unique: true },
  companyID: { type: String, required: true, unique: true },
  companyAddress: { type: String, required: true },
  founded_year: { type: Number, required: true },
  website: { type: String },
  industry: { type: String },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "owner" },
  employeeID: { type: String, unique: true },
  department: { type: String },
  joinDate: { type: Date },
  accountStatus: { type: String, default: "Active" },
  emailVerified: { type: Boolean, default: true },
  lastLogin: { type: Date },
  accountType: { type: String, default: "Standard" },
  token: { type: String },
  companyLogo: { type: String },
  // 2FA fields
  twoFactorSecret: { type: String },
  twoFactorEnabled: { type: Boolean, default: false },
  backupCodes: [{ type: String }],
  trustedDevices: [
    {
      deviceId: { type: String, required: true },
      deviceName: { type: String, required: true },
      lastUsed: { type: Date, default: Date.now },
      expiresAt: { type: Date, required: true },
      ipAddress: { type: String },
      userAgent: { type: String },
    },
  ],
  settings: {
    notifications: {
      emailNotifications: { type: Boolean, default: true },
      taskReminders: { type: Boolean, default: true },
      projectUpdates: { type: Boolean, default: true },
      teamMessages: { type: Boolean, default: true },
      weeklyReports: { type: Boolean, default: false },
      dailyDigest: { type: Boolean, default: false },
    },
    appearance: {
      theme: { type: String, default: "light" },
      sidebarCollapsed: { type: Boolean, default: false },
      compactMode: { type: Boolean, default: false },
      showAvatars: { type: Boolean, default: true },
      showStatusIndicators: { type: Boolean, default: true },
    },
    security: {
      twoFactorAuth: { type: Boolean, default: false },
      sessionTimeout: { type: Number, default: 30 },
      loginNotifications: { type: Boolean, default: true },
      passwordExpiry: { type: Number, default: 90 },
    },
    privacy: {
      profileVisibility: { type: String, default: "team" },
      activityVisibility: { type: String, default: "team" },
      showOnlineStatus: { type: Boolean, default: true },
      allowDirectMessages: { type: Boolean, default: true },
    },
  },
});

module.exports = mongoose.model("User", userSchema);
