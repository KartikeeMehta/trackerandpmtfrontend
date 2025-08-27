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
  resetOTP: { type: String },
  resetOTPExpiry: { type: Date },
  // Tracker pairing fields
  pairingOTP: { type: String },
  pairingOTPExpiry: { type: Date },
  pairingStatus: {
    type: String,
    enum: ["not_paired", "pending", "paired"],
    default: "not_paired",
  },
  lastPaired: { type: Date },
});

module.exports = mongoose.model("User", userSchema);
