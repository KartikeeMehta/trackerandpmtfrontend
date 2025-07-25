const Team = require("../models/Team");
const Employee = require("../models/Employee");
const Activity = require("../models/Activity");

const getPerformer = (user) =>
  user?.firstName
    ? user.firstName + (user.lastName ? " " + user.lastName : "")
    : user?.name || user?.email || "Unknown";

// APIs for createTeam, deleteTeam, addMember, removeMember
exports.createTeam = async (req, res) => {
  try {
    const { teamName, description, teamLead, teamMembers } = req.body;

    if (!req.user || req.user.role !== "owner") {
      return res.status(403).json({ message: "Only owner can create teams" });
    }

    // Validate team lead using teamMemberId and role
    const teamLeadUser = await Employee.findOne({
      teamMemberId: teamLead.trim(),
      role: "teamLead",
    });
    if (!teamLeadUser) {
      return res
        .status(400)
        .json({ message: "Provided teamMemberId is not a valid team lead" });
    }

    // Validate team members using teamMemberId and role
    let memberIds = [];
    if (Array.isArray(teamMembers) && teamMembers.length > 0) {
      const members = await Employee.find({
        teamMemberId: { $in: teamMembers.map((id) => id.trim()) },
        role: "teamMember",
      });

      if (members.length !== teamMembers.length) {
        return res.status(400).json({
          message:
            "One or more provided teamMemberIds are invalid or not team members",
        });
      }

      memberIds = members.map((member) => member._id);
    }

    // Create the team
    const team = await Team.create({
      teamName,
      description,
      createdBy: req.user._id,
      teamLead: teamLeadUser._id,
      members: memberIds,
    });
    await Activity.create({
      type: "Team",
      action: "add",
      name: team.teamName,
      description: `Created team ${team.teamName}`,
      performedBy: getPerformer(req.user),
    });

    res.status(201).json({ message: "Team created successfully", team });
  } catch (err) {
    console.error("Error creating team:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteTeam = async (req, res) => {
  try {
    const { teamName } = req.query;

    if (!req.user || req.user.role !== "owner") {
      return res.status(403).json({ message: "Only admin can delete teams" });
    }

    if (!teamName) {
      return res.status(400).json({ message: "Team name is required" });
    }

    const team = await Team.findOne({ teamName: teamName.trim() });
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    await Team.deleteOne({ _id: team._id });
    await Activity.create({
      type: "Team",
      action: "delete",
      name: team.teamName,
      description: `Deleted team ${team.teamName}`,
      performedBy: getPerformer(req.user),
    });

    return res
      .status(200)
      .json({ message: `Team '${teamName}' deleted successfully` });
  } catch (err) {
    console.error("Error deleting team:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.updateTeam = async (req, res) => {
  try {
    const { teamName, description, teamLead, teamMembers } = req.body;

    if (!req.user || req.user.role !== "owner") {
      return res.status(403).json({ message: "Only owner can edit teams" });
    }

    if (!teamName) {
      return res.status(400).json({ message: "Team name is required" });
    }

    const team = await Team.findOne({ teamName: teamName.trim() });
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    if (description !== undefined) team.description = description;

    // Convert teamLead (teamMemberId) to ObjectId
    if (teamLead !== undefined) {
      const leadDoc = await Employee.findOne({ teamMemberId: teamLead });
      if (!leadDoc) {
        return res.status(400).json({ message: "Invalid team lead" });
      }
      team.teamLead = leadDoc._id;
    }

    // Convert teamMembers (array of teamMemberId) to ObjectIds
    if (teamMembers !== undefined) {
      const memberDocs = await Employee.find({
        teamMemberId: { $in: teamMembers },
      });
      if (memberDocs.length !== teamMembers.length) {
        return res
          .status(400)
          .json({ message: "One or more team members are invalid" });
      }
      team.members = memberDocs.map((m) => m._id);
    }

    await team.save();

    res.status(200).json({ message: "Team updated successfully", team });
  } catch (err) {
    console.error("Error updating team:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all Team Leads
exports.getAllTeamLeads = async (req, res) => {
  try {
    const teamLeads = await Employee.find({ role: "teamLead" }).select(
      "-password"
    ); // exclude password
    res.status(200).json({ teamLeads });
  } catch (err) {
    console.error("Error fetching team leads:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all Team Members
exports.getAllTeamMembers = async (req, res) => {
  try {
    const teamMembers = await Employee.find({ role: "teamMember" }).select(
      "-password"
    );
    res.status(200).json({ teamMembers });
  } catch (err) {
    console.error("Error fetching team members:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get All Teams
exports.getAllTeams = async (req, res) => {
  try {
    const teams = await Team.find()
      .populate("teamLead", "name email teamMemberId") // Show basic info of teamLead
      .populate("members", "name email teamMemberId") // Show basic info of members
      .populate("createdBy", "firstName lastName email"); // Show who created it (owner)

    res.status(200).json({ teams });
  } catch (err) {
    console.error("Error fetching teams:", err);
    res.status(500).json({ message: "Server error" });
  }
};
