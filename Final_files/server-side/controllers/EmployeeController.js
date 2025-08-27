const Employee = require("../models/Employee");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");
const User = require("../models/User"); // Required for companyName
const Activity = require("../models/Activity");
const { sendNotification } = require("../utils/notify");

const getPerformer = (user) =>
  user?.firstName
    ? user.firstName + (user.lastName ? " " + user.lastName : "")
    : user?.name || user?.email || "Unknown";

// API: Add new Employee
exports.addEmployee = async (req, res) => {
  if (req.user.role !== "owner" && req.user.role !== "admin") {
    return res
      .status(403)
      .json({ message: "Only owners and admins can add employees" });
  }

  const { name, email, designation, role, location, phoneNo, profileLogo } =
    req.body;

  if (!name || !email || !phoneNo) {
    return res
      .status(400)
      .json({ message: "Name, email, and phoneNo are required" });
  }

  try {
    const existingEmployee = await Employee.findOne({ email });
    if (existingEmployee) {
      return res
        .status(400)
        .json({ message: "Email already exists for an employee" });
    }

    // Determine company from current user (works for owner and admin)
    const companyName = req.user.companyName;
    if (!companyName) {
      return res.status(400).json({ message: "Company not found for user" });
    }

    // Generate company initials from company name
    const companyInitials = companyName
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase())
      .join("");

    // Find the last employee with the same company initials pattern
    const lastEmployee = await Employee.findOne({
      teamMemberId: {
        $regex: new RegExp(
          `^${companyInitials.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-\\d+$`
        ),
      },
      companyName: companyName,
    })
      .sort({ teamMemberId: -1 })
      .collation({ locale: "en", numericOrdering: true });

    let newIdNumber = 1;
    if (lastEmployee && lastEmployee.teamMemberId) {
      const lastNumber = parseInt(lastEmployee.teamMemberId.split("-")[1]);
      newIdNumber = lastNumber + 1;
    }
    const teamMemberId = `${companyInitials}-${newIdNumber
      .toString()
      .padStart(3, "0")}`;

    const autoPassword = crypto.randomBytes(6).toString("hex");
    const hashedPassword = await bcrypt.hash(autoPassword, 10);
    const passwordExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    const newEmployee = new Employee({
      name,
      email,
      phoneNo,
      teamMemberId,
      designation,
      role,
      profileLogo,
      location,
      password: hashedPassword,
      passwordExpiresAt,
      addedBy: req.user._id,
      companyName: companyName, // ✅ from current user (owner/admin)
    });

    await newEmployee.save();
    await Activity.create({
      type: "Employee",
      action: "add",
      name: newEmployee.name,
      description: `Added new employee ${newEmployee.name}`,
      performedBy: getPerformer(req.user),
      companyName: req.user.companyName,
    });

    // Respond immediately; move email + notification to background
    res
      .status(201)
      .json({ message: "Employee added successfully", employee: newEmployee });

    // Fire-and-forget background tasks (won't block the response)
    setImmediate(async () => {
      try {
        await sendEmail(
          email,
          "Welcome to the Team",
          `Hi ${name},

You've been added as an employee in ${companyName}.

Login Email: ${email}
Password: ${autoPassword}

To set your password and activate your account, please log in here (valid for 30 minutes):
https://project-flow.digiwbs.com/emp-login

Note: This is an auto-generated password and it will expire in 30 minutes. If you do not set your password in time, your account will be deleted automatically.`
        );
      } catch (e) {
        console.error("employee add email failed:", e?.message || e);
      }

      try {
        const io = req.app.get("io");
        await sendNotification({
          io,
          companyName,
          type: "team_member_added",
          title: `Welcome to ${companyName}`,
          message: `Your account is created. Please check your email for credentials.`,
          link: `/profile`,
          recipientTeamMemberIds: [newEmployee.teamMemberId],
        });
      } catch (e) {
        console.error("employee add notify failed:", e?.message || e);
      }
    });
  } catch (err) {
    console.error("Error adding employee:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// API: First Login - Password Update
exports.employeeFirstLogin = async (req, res) => {
  const { email, oldPassword, newPassword, confirmPassword } = req.body;

  if (!email || !oldPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const employee = await Employee.findOne({ email });
  if (!employee) return res.status(404).json({ message: "Employee not found" });

  if (employee.passwordExpiresAt && new Date() > employee.passwordExpiresAt) {
    return res.status(403).json({
      message:
        "Temporary password expired. A new email with a new temporary password has been sent.",
    });
  }

  if (!employee.mustChangePassword)
    return res
      .status(400)
      .json({ message: "Password already updated, use login instead" });

  const isMatch = await bcrypt.compare(oldPassword, employee.password);
  if (!isMatch) {
    if (employee.tempPasswordResent && employee.mustChangePassword) {
      return res.status(400).json({
        message:
          "Temporary password expired. A new email with a new temporary password has been sent.",
      });
    }
    return res.status(400).json({ message: "Old password is incorrect" });
  }

  if (newPassword !== confirmPassword)
    return res.status(400).json({ message: "New passwords do not match" });

  if (newPassword.length < 6)
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters long" });

  employee.password = await bcrypt.hash(newPassword, 10);
  employee.passwordExpiresAt = null;
  employee.mustChangePassword = false;
  employee.tempPasswordResent = false; // reset resend tracking on successful first login
  employee.lastLogin = new Date();
  // Email verification is inferred from mustChangePassword being false

  await employee.save();

  res
    .status(200)
    .json({ message: "Password updated successfully. Please login." });
};

// Edit employee using teamMemberId
exports.editEmployee = async (req, res) => {
  const { teamMemberId } = req.params;
  const { name, email, designation, role, location, phoneNo, profileLogo } =
    req.body;

  if (!teamMemberId) {
    return res.status(400).json({ message: "teamMemberId is required" });
  }

  try {
    const userCompany = req.user.companyName;
    const employee = await Employee.findOne({
      teamMemberId,
      companyName: userCompany,
    });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Authorization:
    // - Owners/Admins/Managers can edit any employee in their company
    // - Team leads/members can edit ONLY their own profile (matched by teamMemberId)
    const isElevated =
      req.user.role === "owner" ||
      req.user.role === "admin" ||
      req.user.role === "manager";
    const isSelfEdit =
      (req.user.role === "teamLead" || req.user.role === "teamMember") &&
      req.user.teamMemberId &&
      req.user.teamMemberId === teamMemberId;

    if (!isElevated && !isSelfEdit) {
      return res.status(403).json({ message: "Unauthorized to edit employee" });
    }

    if (name) employee.name = name;
    if (designation !== undefined) employee.designation = designation;
    if (location) employee.location = location;
    if (phoneNo) employee.phoneNo = phoneNo;
    if (profileLogo) {
      // Accept base64 or a direct URL/path; store as-is
      employee.profileLogo = profileLogo;
    }
    // Restrict sensitive fields for self-edit
    if (isElevated) {
      if (email) employee.email = email;
      if (role) employee.role = role;
    }

    await employee.save();
    await Activity.create({
      type: "Employee",
      action: "edit",
      name: employee.name,
      description: `Edited employee ${employee.name}`,
      performedBy: getPerformer(req.user),
      companyName: req.user.companyName,
    });

    res
      .status(200)
      .json({ message: "Employee updated successfully", employee });
  } catch (error) {
    console.error("❌ Error updating employee:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Delete employee by teamMemberId
exports.deleteEmployee = async (req, res) => {
  const { teamMemberId } = req.params;
  if (!teamMemberId) {
    return res.status(400).json({ message: "teamMemberId is required" });
  }
  try {
    const userCompany = req.user.companyName;
    const employee = await Employee.findOne({
      teamMemberId,
      companyName: userCompany,
    });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    await Employee.deleteOne({ teamMemberId, companyName: userCompany });
    await Activity.create({
      type: "Employee",
      action: "delete",
      name: employee.name,
      description: `Deleted employee ${employee.name}`,
      performedBy: getPerformer(req.user),
      companyName: req.user.companyName,
    });
    res.status(200).json({ message: "Employee deleted successfully" });
  } catch (error) {
    console.error("Error deleting employee:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get all employees
exports.getAllEmployees = async (req, res) => {
  try {
    const userCompany = req.user.companyName;
    const employees = await Employee.find({ companyName: userCompany }).select(
      "-password"
    );
    res.status(200).json(employees);
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get all employees with role: "teamLead"
exports.getAllTeamLeads = async (req, res) => {
  try {
    const userCompany = req.user.companyName;
    const teamLeads = await Employee.find({
      role: "teamLead",
      companyName: userCompany,
    }).select("-password");
    res.status(200).json(teamLeads);
  } catch (error) {
    console.error("Error fetching team leads:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get all employees with role: "admin"
exports.getAllAdmins = async (req, res) => {
  try {
    const userCompany = req.user.companyName;
    const admins = await Employee.find({
      role: "admin",
      companyName: userCompany,
    }).select("-password");
    res.status(200).json(admins);
  } catch (error) {
    console.error("Error fetching admins:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get all employees with role: "manager"
exports.getAllManagers = async (req, res) => {
  try {
    const userCompany = req.user.companyName;
    const managers = await Employee.find({
      role: "manager",
      companyName: userCompany,
    }).select("-password");
    res.status(200).json(managers);
  } catch (error) {
    console.error("Error fetching managers:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get all employees with role: "teamMember"
exports.getAllTeamMembers = async (req, res) => {
  try {
    const userCompany = req.user.companyName;
    const teamMembers = await Employee.find({
      role: "teamMember",
      companyName: userCompany,
    }).select("-password");
    res.status(200).json(teamMembers);
  } catch (error) {
    console.error("Error fetching team members:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get general subtasks for a specific admin/manager with role-based visibility
exports.getGeneralSubtasks = async (req, res) => {
  try {
    const companyName = req.user.companyName;
    const requesterRole = req.user.role;
    const requesterTmId = req.user.teamMemberId;
    const targetTmId = req.params.teamMemberId;

    if (!targetTmId) return res.status(400).json({ message: "teamMemberId is required" });

    const Employee = require("../models/Employee");
    const target = await Employee.findOne({ teamMemberId: targetTmId, companyName });
    if (!target) return res.status(404).json({ message: "Employee not found" });

    // Visibility rules
    const targetRole = (target.role || "").toLowerCase();
    const reqRole = (requesterRole || "").toLowerCase();
    let allowed = false;
    if (targetRole === "admin") {
      allowed = reqRole === "owner" || reqRole === "admin";
    } else if (targetRole === "manager") {
      allowed = reqRole === "owner" || reqRole === "admin" || (reqRole === "manager" && requesterTmId === targetTmId);
    }
    if (!allowed) return res.status(403).json({ message: "Not authorized to view general subtasks" });

    return res.status(200).json({ generalSubtasks: target.generalSubtasks || [] });
  } catch (err) {
    console.error("Error fetching general subtasks:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update status of a general subtask
exports.updateGeneralSubtaskStatus = async (req, res) => {
  try {
    const companyName = req.user.companyName;
    const requesterRole = (req.user.role || "").toLowerCase();
    const requesterTmId = req.user.teamMemberId;
    const { teamMemberId, subtask_id, status } = req.body;

    if (!teamMemberId || !subtask_id || !status) {
      return res.status(400).json({ message: "teamMemberId, subtask_id and status are required" });
    }

    const Employee = require("../models/Employee");
    const target = await Employee.findOne({ teamMemberId, companyName });
    if (!target) return res.status(404).json({ message: "Employee not found" });

    const targetRole = (target.role || "").toLowerCase();
    let allowed = false;
    if (targetRole === "admin") {
      allowed = requesterRole === "owner" || requesterRole === "admin";
    } else if (targetRole === "manager") {
      allowed = requesterRole === "owner" || requesterRole === "admin" || (requesterRole === "manager" && requesterTmId === teamMemberId);
    }
    if (!allowed) return res.status(403).json({ message: "Not authorized to update this subtask" });

    const result = await Employee.updateOne(
      { teamMemberId, companyName, "generalSubtasks.subtask_id": subtask_id },
      {
        $set: {
          "generalSubtasks.$.status": status,
          "generalSubtasks.$.updatedAt": new Date(),
        },
      }
    );

    if (result.modifiedCount === 0) return res.status(404).json({ message: "General subtask not found" });
    res.status(200).json({ success: true, message: "Status updated" });
  } catch (err) {
    console.error("Error updating general subtask status:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete a general subtask
exports.deleteGeneralSubtask = async (req, res) => {
  try {
    const companyName = req.user.companyName;
    const requesterRole = (req.user.role || "").toLowerCase();
    const requesterTmId = req.user.teamMemberId;
    const { teamMemberId, subtask_id } = req.body;

    if (!teamMemberId || !subtask_id) {
      return res.status(400).json({ message: "teamMemberId and subtask_id are required" });
    }

    const Employee = require("../models/Employee");
    const target = await Employee.findOne({ teamMemberId, companyName });
    if (!target) return res.status(404).json({ message: "Employee not found" });

    const targetRole = (target.role || "").toLowerCase();
    let allowed = false;
    if (targetRole === "admin") {
      allowed = requesterRole === "owner" || requesterRole === "admin";
    } else if (targetRole === "manager") {
      allowed = requesterRole === "owner" || requesterRole === "admin" || (requesterRole === "manager" && requesterTmId === teamMemberId);
    }
    if (!allowed) return res.status(403).json({ message: "Not authorized to delete this subtask" });

    const result = await Employee.updateOne(
      { teamMemberId, companyName },
      { $pull: { generalSubtasks: { subtask_id } } }
    );
    if (result.modifiedCount === 0) return res.status(404).json({ message: "General subtask not found" });

    res.status(200).json({ success: true, message: "General subtask deleted" });
  } catch (err) {
    console.error("Error deleting general subtask:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get recent activity
exports.getRecentActivity = async (req, res) => {
  try {
    console.log("getRecentActivity called");
    console.log("User:", req.user);
    const userCompany = req.user.companyName;
    console.log("User company:", userCompany);

    const activities = await require("../models/Activity")
      .find({ companyName: userCompany })
      .sort({ timestamp: -1 })
      .limit(20);

    console.log("Found activities:", activities.length);
    res.status(200).json({ activities });
  } catch (error) {
    console.error("getRecentActivity error:", error);
    res.status(500).json({ message: "Failed to fetch activity", error });
  }
};

// Get all available roles
exports.getAllRoles = async (req, res) => {
  try {
    const roles = [
      { value: "admin", label: "Admin" },
      { value: "manager", label: "Manager" },
      { value: "teamLead", label: "Team Lead" },
      { value: "teamMember", label: "Team Member" },
    ];

    res.status(200).json({
      success: true,
      roles: roles,
    });
  } catch (error) {
    console.error("Error fetching roles:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
