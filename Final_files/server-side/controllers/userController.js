const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const Employee = require("../models/Employee");

// APIs for user(company/owner) - registration, login, update
exports.register = async (req, res) => {
  try {
    const {
      companyName,
      companyDomain,
      companyID,
      companyAddress,
      founded_year,
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
    } = req.body;

    if (
      !companyName ||
      !companyDomain ||
      !companyID ||
      !companyAddress ||
      !founded_year ||
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !confirmPassword
    ) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const existingCompany = await User.findOne({ companyName });
    if (existingCompany) {
      return res.status(400).json({ message: "Company already registered" });
    }

    const existingDomain = await User.findOne({ companyDomain });
    if (existingDomain) {
      return res
        .status(400)
        .json({ message: "Company Domain already registered" });
    }

    const existingID = await User.findOne({ companyID });
    if (existingID) {
      return res.status(400).json({ message: "Company ID already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);
    // Generate employeeID if not provided
    const employeeID = `EMP${Math.floor(Math.random() * 1e12)}`;
    const joinDate = new Date();
    const newUser = new User({
      companyName,
      companyDomain,
      companyID,
      companyAddress,
      founded_year,
      firstName,
      lastName,
      email,
      password: hashed,
      employeeID,
      joinDate,
      accountStatus: "non-active",
      emailVerified: true,
      lastLogin: joinDate,
      accountType: "Standard",
    });
    await newUser.save();

    await sendEmail(
      email,
      "🎉 Registration Successful - Welcome to ProjectFlow!",
      `Dear ${
        firstName + lastName
      },\n\nThank you for registering with ProjectFlow.\n\nWe’re excited to have you on board! Your account has been successfully created, and you are now registered as an Owner on our platform.\n\nYou can now log in to your dashboard and begin managing your team, tracking progress, and streamlining your operations.\n\n Login here: [http://localhost:5173/login]\n\nIf you need any assistance getting started, our support team is here to help.\n\nWelcome to a better way to manage your team.\n\nBest regards,\nProjectFlow Support\n[http://localhost:5173]`
    );

    res.status(201).json({ message: "Registered as owner" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    // Try User login first
    const userWithPassword = await User.findOne({ email });
    if (userWithPassword) {
      const isMatch = await bcrypt.compare(password, userWithPassword.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Wrong password" });
      }

      // Activate account if it's first login
      if (userWithPassword.accountStatus === "non-active") {
        userWithPassword.accountStatus = "active";
      }

      let token = userWithPassword.token;
      let isTokenValid = false;
      if (token) {
        try {
          jwt.verify(token, "secret123");
          isTokenValid = true;
        } catch (err) {
          isTokenValid = false;
        }
      }
      if (!isTokenValid) {
        token = jwt.sign({ id: userWithPassword._id }, "secret123", {
          expiresIn: "7d",
        });
        userWithPassword.token = token;
      }

      userWithPassword.lastLogin = new Date();
      await userWithPassword.save();

      const { password: _, ...userDetails } = userWithPassword.toObject();
      return res.json({
        message: "Login successful",
        token,
        user: userDetails,
        type: "user",
      });
    }

    // Try Employee login
    const employee = await Employee.findOne({ email });
    if (employee) {
      const isMatch = await bcrypt.compare(password, employee.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Wrong password" });
      }

      let token = employee.token;
      let isTokenValid = false;
      if (token) {
        try {
          jwt.verify(token, "secret123");
          isTokenValid = true;
        } catch (err) {
          isTokenValid = false;
        }
      }
      if (!isTokenValid) {
        token = jwt.sign({ id: employee._id }, "secret123", {
          expiresIn: "7d",
        });
        employee.token = token;
      }

      employee.lastLogin = new Date();
      await employee.save();

      const { password: _, ...employeeDetails } = employee.toObject();
      return res.json({
        message: "Login successful",
        token,
        employee: employeeDetails,
        type: "employee",
      });
    }

    return res.status(404).json({ message: "User not found" });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.update = async (req, res) => {
  try {
    // In update, allow updating new fields
    const {
      companyName,
      companyDomain,
      companyAddress,
      email,
      website,
      industry,
      department,
      accountType,
    } = req.body;

    // Handle companyLogo upload
    let companyLogo;
    if (req.file) {
      companyLogo = `/uploads/companyLogos/${req.file.filename}`;
    }

    const updateFields = {
      companyName,
      companyDomain,
      companyAddress,
      email,
      website,
      industry,
      department,
      accountType,
    };
    if (companyLogo) updateFields.companyLogo = companyLogo;

    const updated = await User.findByIdAndUpdate(req.user._id, updateFields, {
      new: true,
    }).select("-password");

    res.json({ message: "Updated", user: updated });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// To get user profile
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    // First check in User collection
    const user = await User.findById(userId).select("-password");
    if (user) {
      return res.json({ type: "user", user });
    }

    // Then check in Employee collection
    const employee = await Employee.findById(userId).select("-password");
    if (employee) {
      return res.json({ type: "employee", employee });
    }

    return res.status(404).json({ message: "User not found" });
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Change Password API
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    const userId = req.user._id;

    // Validate required fields
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return res
        .status(400)
        .json({ message: "All password fields are required" });
    }

    // Check if new password matches confirmation
    if (newPassword !== confirmNewPassword) {
      return res
        .status(400)
        .json({ message: "New password and confirmation do not match" });
    }

    // Validate new password length
    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long" });
    }

    // Check if new password is same as current password
    if (currentPassword === newPassword) {
      return res.status(400).json({
        message: "New password must be different from current password",
      });
    }

    // First try to find user in User collection
    let user = await User.findById(userId);
    if (user) {
      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password
      );
      if (!isCurrentPasswordValid) {
        return res
          .status(400)
          .json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      user.password = hashedNewPassword;
      await user.save();

      return res.json({ message: "Password changed successfully" });
    }

    // If not found in User collection, try Employee collection
    let employee = await Employee.findById(userId);
    if (employee) {
      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        employee.password
      );
      if (!isCurrentPasswordValid) {
        return res
          .status(400)
          .json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // Update password and reset mustChangePassword flag
      employee.password = hashedNewPassword;
      employee.mustChangePassword = false;
      employee.passwordExpiresAt = new Date(
        Date.now() + 90 * 24 * 60 * 60 * 1000
      ); // 90 days from now
      await employee.save();

      return res.json({ message: "Password changed successfully" });
    }

    return res.status(404).json({ message: "User not found" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Tracker pairing functionality
exports.generatePairingOTP = async (req, res) => {
  try {
    const requester = req.user; // could be User or Employee

    // Generate a 6-digit OTP
    const pairingOTP = Math.floor(100000 + Math.random() * 900000).toString();

    // Set expiry time (5 minutes from now)
    const pairingOTPExpiry = new Date(Date.now() + 5 * 60 * 1000);

    // Update user with OTP and expiry
    let updatedUser = null;
    if (requester.role) {
      // Employee model
      updatedUser = await Employee.findByIdAndUpdate(
        requester._id,
        {
          pairingOTP,
          pairingOTPExpiry,
          pairingStatus: "pending",
        },
        { new: true }
      );
    } else {
      // Owner User
      updatedUser = await User.findByIdAndUpdate(
        requester._id,
        {
          pairingOTP,
          pairingOTPExpiry,
          pairingStatus: "pending",
        },
        { new: true }
      );
    }

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      pairingOTP,
      pairingOTPExpiry,
      message: "OTP generated successfully",
    });
  } catch (error) {
    console.error("Error generating pairing OTP:", error);
    res.status(500).json({ success: false, message: "Failed to generate OTP" });
  }
};

exports.verifyPairingOTP = async (req, res) => {
  try {
    const { email, pairingOTP } = req.body;

    if (!email || !pairingOTP) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    // Find user by email
    // Find in User or Employee by email
    let user = await User.findOne({ email });
    let isEmployee = false;
    if (!user) {
      user = await Employee.findOne({ email });
      isEmployee = !!user;
    }
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Check if OTP matches and is not expired
    if (user.pairingOTP !== pairingOTP) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (user.pairingOTPExpiry < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired",
      });
    }

    // Update pairing status to connected
    user.pairingStatus = "paired";
    user.pairingOTP = null;
    user.pairingOTPExpiry = null;
    user.lastPaired = new Date();
    await user.save();

    res.json({
      success: true,
      message: "Tracker paired successfully",
      userId: user._id,
      companyName: user.companyName,
    });
  } catch (error) {
    console.error("Error verifying pairing OTP:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify OTP",
    });
  }
};

exports.getPairingStatus = async (req, res) => {
  try {
    const userId = req.user._id;
    let doc = await User.findById(userId).select("pairingStatus lastPaired");
    if (!doc) {
      doc = await Employee.findById(userId).select("pairingStatus lastPaired");
    }
    if (!doc) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json({ success: true, status: doc.pairingStatus || "not_paired", lastPaired: doc.lastPaired });
  } catch (error) {
    console.error("Error getting pairing status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get pairing status",
    });
  }
};

exports.disconnectTracker = async (req, res) => {
  try {
    const userId = req.user._id;
    let updated = await User.findByIdAndUpdate(
      userId,
      { pairingStatus: "not_paired", pairingOTP: null, pairingOTPExpiry: null, lastPaired: null },
      { new: true }
    );
    if (!updated) {
      updated = await Employee.findByIdAndUpdate(
        userId,
        { pairingStatus: "not_paired", pairingOTP: null, pairingOTPExpiry: null, lastPaired: null },
        { new: true }
      );
    }
    if (!updated) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json({ success: true, message: "Tracker disconnected successfully" });
  } catch (error) {
    console.error("Error disconnecting tracker:", error);
    res.status(500).json({
      success: false,
      message: "Failed to disconnect tracker",
    });
  }
};

// For desktop app on forced exit: disconnect by email without auth token
exports.disconnectByEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email required" });
    let updated = await User.findOneAndUpdate(
      { email },
      { pairingStatus: "not_paired", pairingOTP: null, pairingOTPExpiry: null, lastPaired: null },
      { new: true }
    );
    if (!updated) {
      updated = await Employee.findOneAndUpdate(
        { email },
        { pairingStatus: "not_paired", pairingOTP: null, pairingOTPExpiry: null, lastPaired: null },
        { new: true }
      );
    }
    if (!updated) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, message: "Disconnected" });
  } catch (e) {
    res.status(500).json({ success: false, message: "Failed to disconnect" });
  }
};
