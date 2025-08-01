const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  teamMemberId: { type: String, required: true, unique: true },
  designation: { type: String }, // ✅ renamed from lead-member
  phoneNo: { type: String, required: true }, // ✅ already present
  companyName: { type: String, required: true }, // ✅ new field
  profileLogo: { type: String }, // ✅ new field

  mustChangePassword: { type: Boolean, default: true },
  passwordExpiresAt: { type: Date, default: () => Date.now() + 5 * 60 * 1000 },

  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  role: { type: String, default: "employee" },
  token: { type: String },
  location: { type: String },

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

module.exports = mongoose.model("Employee", employeeSchema);
