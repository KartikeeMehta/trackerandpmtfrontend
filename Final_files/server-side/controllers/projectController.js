const Project = require("../models/Project");
const Employee = require("../models/Employee");
const Activity = require("../models/Activity");

const getPerformer = (user) =>
  user?.firstName
    ? user.firstName + (user.lastName ? " " + user.lastName : "")
    : user?.name || user?.email || "Unknown";

exports.createProject = async (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res.status(403).json({ message: "Only owner can add projects" });
    }

    const {
      project_name,
      client_name,
      project_description,
      start_date,
      end_date,
      project_lead, // teamMemberId of the project lead
      team_members = [], // Array of teamMemberIds
      project_status,
      team_id,
    } = req.body;

    // Count existing projects to generate next ID
    const count = await Project.countDocuments();
    const generatedProjectId = `Pr-${count + 1}`;

    // Validate team_members presence
    if (!Array.isArray(team_members) || team_members.length === 0) {
      return res.status(400).json({ message: "Team members are required" });
    }

    // Vaidate Team Lead
    const lead = await Employee.findOne({ teamMemberId: project_lead });
    if (!lead || lead.role !== "teamLead") {
      return res
        .status(404)
        .json({ message: "Team Lead not found or invalid" });
    }

    // Validate team members
    const validMembers = await Employee.find({
      teamMemberId: { $in: team_members },
      role: "teamMember",
    });

    if (validMembers.length !== team_members.length) {
      return res
        .status(400)
        .json({ message: "One or more team members are invalid" });
    }

    // Create project
    const newProject = new Project({
      project_id: generatedProjectId,
      project_name,
      client_name,
      project_description,
      start_date,
      end_date,
      project_lead: lead.teamMemberId,
      team_members: validMembers.map((m) => m.teamMemberId),
      project_status,
      team_id,
    });

    await newProject.save();

    // Create activity log
    await Activity.create({
      type: "Project",
      action: "add",
      name: newProject.project_name,
      description: `Created project ${newProject.project_name}`,
      performedBy: getPerformer(req.user),
    });

    res.status(201).json({ message: "Project created", project: newProject });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getProjectById = async (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res.status(403).json({ message: "Only owner can view projects" });
    }

    const project = await Project.findOne({ project_id: req.params.projectId });
    if (!project) return res.status(404).json({ message: "Project not found" });

    res.status(200).json({ project });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getAllProjects = async (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res.status(403).json({ message: "Only owner can view projects" });
    }

    const projects = await Project.find().sort({ createdAt: -1 });
    res.status(200).json({ projects });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateProject = async (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res
        .status(403)
        .json({ message: "Only owner can update projects" });
    }

    const { add_members = [], remove_members = [], ...otherUpdates } = req.body;

    const project = await Project.findOne({ project_id: req.params.projectId });
    if (!project) return res.status(404).json({ message: "Project not found" });

    // 🔍 Validate and add members
    if (Array.isArray(add_members) && add_members.length > 0) {
      const validAdditions = await Employee.find({
        teamMemberId: { $in: add_members },
      });

      if (validAdditions.length !== add_members.length) {
        return res
          .status(400)
          .json({ message: "One or more added members are invalid" });
      }

      // Prevent duplicates
      project.team_members = [
        ...new Set([...project.team_members, ...add_members]),
      ];
    }

    // ❌ Remove members
    if (Array.isArray(remove_members) && remove_members.length > 0) {
      project.team_members = project.team_members.filter(
        (memberId) => !remove_members.includes(memberId)
      );
    }

    // Store original end date if marking as completed
    if (
      otherUpdates.project_status === "completed" &&
      otherUpdates.end_date &&
      project.end_date &&
      project.end_date !== otherUpdates.end_date
    ) {
      project.completion_note = `Original planned completion date was ${project.end_date}, but project was completed on ${otherUpdates.end_date}.`;
      // Optionally, store the original planned end date as a separate field
      project.original_end_date = project.end_date;
    }

    // Update other fields if present (like project_name, description, etc.)
    Object.assign(project, otherUpdates);

    await project.save();

    await Activity.create({
      type: "Project",
      action: "edit",
      name: project.project_name,
      description: `Updated project ${project.project_name}`,
      performedBy: getPerformer(req.user),
    });

    res.status(200).json({ message: "Project updated", project });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res
        .status(403)
        .json({ message: "Only owner can delete projects" });
    }

    const project = await Project.findOne({ project_id: req.params.projectId });
    if (!project) return res.status(404).json({ message: "Project not found" });

    project.project_status = "deleted";
    await project.save();

    await Activity.create({
      type: "Project",
      action: "delete",
      name: project.project_name,
      description: `Soft deleted project ${project.project_name}`,
      performedBy: getPerformer(req.user),
    });

    res.status(200).json({ message: "Project marked as deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getProjectsByTeamMember = async (req, res) => {
  try {
    const { teamMemberId } = req.params;
    console.log("Looking for projects for teamMemberId:", teamMemberId);

    // Role-based access control - allow owner, admin, and team leads to view any member's projects
    if (
      req.user.role === "employee" &&
      req.user.teamMemberId !== teamMemberId
    ) {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const employee = await Employee.findOne({ teamMemberId });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    console.log("Employee found:", employee.name);

    const projects = await Project.find(
      {
        $or: [
          { team_members: teamMemberId },
          { project_lead: teamMemberId }
        ],
        project_status: { $ne: "deleted" },
      }
    );

    console.log("Found projects:", projects.length);

    // Return empty array instead of 404 error
    res.status(200).json({ projects });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};