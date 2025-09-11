const Employee = require("../models/Employee");
const Activity = require("../models/Activity");
const User = require("../models/User");
const { Project } = require("../models/Project");
const { uploadCompressedImage } = require("../utils/cloudinaryUpload");
const mongoose = require("mongoose");
const { sendNotification } = require("../utils/notify");

const getPerformer = (user) =>
  user?.firstName
    ? user.firstName + (user.lastName ? " " + user.lastName : "")
    : user?.name || user?.email || "Unknown";

exports.createProject = async (req, res) => {
  try {
    if (
      req.user.role !== "owner" &&
      req.user.role !== "admin" &&
      req.user.role !== "manager"
    ) {
      return res
        .status(403)
        .json({ message: "Only owner, admin, and manager can add projects" });
    }

    const {
      project_name,
      client_name,
      project_description,
      start_date,
      end_date,
      project_lead,
      team_members = [],
      project_status,
      team_id,
    } = req.body;

    const companyName = req.user.companyName;

    // ✅ Get initials from company name (e.g., "Web Blaze" => "WB")
    const initials = companyName
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase())
      .join("");

    // ✅ Find latest project ID for the company
    const lastProject = await Project.findOne({ companyName })
      .sort({ createdAt: -1 })
      .lean();

    let lastNumber = 0;

    if (lastProject && lastProject.project_id) {
      const match = lastProject.project_id.match(/(\d+)$/);
      if (match) {
        lastNumber = parseInt(match[1]);
      }
    }

    const generatedProjectId = `${initials}-Pr-${lastNumber + 1}`;

    if (!Array.isArray(team_members) || team_members.length === 0) {
      return res.status(400).json({ message: "Team members are required" });
    }

    const lead = await Employee.findOne({ teamMemberId: project_lead });
    if (!lead || lead.role !== "teamLead") {
      return res
        .status(404)
        .json({ message: "Team Lead not found or invalid" });
    }

    const validMembers = await Employee.find({
      teamMemberId: { $in: team_members },
      role: "teamMember",
    });

    if (validMembers.length !== team_members.length) {
      return res
        .status(400)
        .json({ message: "One or more team members are invalid" });
    }

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
      companyName,
      createdBy: req.user._id,
    });

    await newProject.save();

    await Activity.create({
      type: "Project",
      action: "add",
      name: newProject.project_name,
      description: `Created project ${newProject.project_name}`,
      performedBy: getPerformer(req.user),
      companyName,
    });

    // Notify project lead and team members
    try {
      const io = req.app.get("io");
      const recipientIds = [
        newProject.project_lead,
        ...newProject.team_members,
      ].filter(Boolean);
      await sendNotification({
        io,
        companyName,
        type: "project_created",
        title: `New project assigned: ${newProject.project_name}`,
        message: `You have been added to project ${newProject.project_name}.`,
        link: `/projects/${newProject.project_id}`,
        projectId: newProject.project_id,
        recipientTeamMemberIds: recipientIds,
      });
    } catch (e) {
      console.error("project create notify failed:", e.message);
    }

    res.status(201).json({ message: "Project created", project: newProject });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getProjectById = async (req, res) => {
  try {
    const userCompany = req.user.companyName;
    const userRole = req.user.role;
    const userTeamMemberId = req.user.teamMemberId;

    let project;

    // Owner, Admin, and Manager can view any project
    if (
      userRole === "owner" ||
      userRole === "admin" ||
      userRole === "manager"
    ) {
      project = await Project.findOne({
        project_id: req.params.projectId,
        companyName: userCompany,
      });
    }
    // Team Lead and Team Member can only view projects they are part of
    else if (userRole === "teamLead" || userRole === "teamMember") {
      project = await Project.findOne({
        project_id: req.params.projectId,
        companyName: userCompany,
        $or: [
          { project_lead: userTeamMemberId },
          { team_members: userTeamMemberId },
        ],
      });
    }
    // Any other role gets no access
    else {
      return res.status(403).json({
        message:
          "Access denied. Insufficient permissions to view this project.",
      });
    }

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.status(200).json({ project });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getAllProjects = async (req, res) => {
  try {
    const userCompany = req.user.companyName;
    const userRole = req.user.role;
    const userTeamMemberId = req.user.teamMemberId;

    let projects;

    // Owner, Admin, and Manager can see all projects
    if (
      userRole === "owner" ||
      userRole === "admin" ||
      userRole === "manager"
    ) {
      projects = await Project.find({ companyName: userCompany }).sort({
        createdAt: -1,
      });
    }
    // Team Lead and Team Member can only see projects they are part of
    else if (userRole === "teamLead" || userRole === "teamMember") {
      projects = await Project.find({
        companyName: userCompany,
        $or: [
          { project_lead: userTeamMemberId },
          { team_members: userTeamMemberId },
        ],
      }).sort({
        createdAt: -1,
      });
    }
    // Any other role gets no access
    else {
      return res.status(403).json({
        message: "Access denied. Insufficient permissions to view projects.",
      });
    }

    res.status(200).json({ projects });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateProject = async (req, res) => {
  try {
    if (
      req.user.role !== "owner" &&
      req.user.role !== "admin" &&
      req.user.role !== "manager"
    ) {
      return res.status(403).json({
        message: "Only owner, admin, and manager can update projects",
      });
    }

    let { add_members = [], remove_members = [], ...otherUpdates } = req.body;

    const userCompany = req.user.companyName;
    const project = await Project.findOne({
      project_id: req.params.projectId,
      companyName: userCompany,
    });
    if (!project) return res.status(404).json({ message: "Project not found" });

    // If client sends the full team_members array (common in edit UI), infer additions/removals
    if (Array.isArray(otherUpdates.team_members)) {
      const incoming = [...new Set(otherUpdates.team_members.map(String))];
      const existing = (project.team_members || []).map(String);
      const inferredAdds = incoming.filter((id) => !existing.includes(id));
      const inferredRemovals = existing.filter((id) => !incoming.includes(id));
      if (inferredAdds.length > 0)
        add_members = [...new Set([...(add_members || []), ...inferredAdds])];
      if (inferredRemovals.length > 0)
        remove_members = [
          ...new Set([...(remove_members || []), ...inferredRemovals]),
        ];
    }

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
    // Avoid blindly overwriting team_members because we already set it above when needed
    const { team_members: _, ...restUpdates } = otherUpdates;
    Object.assign(project, restUpdates);

    // Handle starred toggle (since this route already restricts to owner/admin/manager)
    if (Object.prototype.hasOwnProperty.call(otherUpdates, "starred")) {
      project.starred = Boolean(otherUpdates.starred);
    }

    await project.save();

    await Activity.create({
      type: "Project",
      action: "edit",
      name: project.project_name,
      description: `Updated project ${project.project_name}`,
      performedBy: getPerformer(req.user),
      companyName: req.user.companyName,
    });

    // Notifications for completion or member changes
    try {
      const io = req.app.get("io");
      const companyName = req.user.companyName;
      // If project completed, notify all members
      if (project.project_status === "completed") {
        const recipients = [
          project.project_lead,
          ...project.team_members,
        ].filter(Boolean);
        await sendNotification({
          io,
          companyName,
          type: "project_completed",
          title: `Project completed: ${project.project_name}`,
          message: `Project ${project.project_name} has been marked completed.`,
          link: `/projects/${project.project_id}`,
          projectId: project.project_id,
          recipientTeamMemberIds: recipients,
        });
      }

      // If members added, notify added members only
      if (Array.isArray(add_members) && add_members.length > 0) {
        await sendNotification({
          io,
          companyName,
          type: "project_member_added",
          title: `Added to project: ${project.project_name}`,
          message: `You were added to project ${project.project_name}.`,
          link: `/projects/${project.project_id}`,
          projectId: project.project_id,
          recipientTeamMemberIds: add_members,
        });
      }
    } catch (e) {
      console.error("project update notify failed:", e.message);
    }

    res.status(200).json({ message: "Project updated", project });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update only summary and track metadata
exports.updateProjectSummary = async (req, res) => {
  try {
    const { projectId, summary } = req.body || {};
    if (!projectId) {
      return res
        .status(400)
        .json({ success: false, message: "projectId is required" });
    }

    const role = (req.user?.role || "").toLowerCase();
    if (!["owner", "admin", "manager", "teamlead"].includes(role)) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    const project = await Project.findOne({
      project_id: projectId,
      companyName: req.user.companyName,
    });
    if (!project)
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });

    project.summary = String(summary || "");
    // Build a proper human name, avoid showing emails
    let editorName = req.user?.name || req.user?.fullName || "";
    // Try User model
    if (!editorName) {
      try {
        const User = require("../models/User");
        const u = await User.findById(req.user?._id);
        if (u?.name) editorName = u.name;
      } catch (_) {}
    }
    // Try Employee model
    if (!editorName) {
      try {
        const Employee = require("../models/Employee");
        const emp = await Employee.findOne({
          $or: [
            { teamMemberId: req.user?.teamMemberId },
            { _id: req.user?._id },
          ],
        });
        if (emp?.name) editorName = emp.name;
      } catch (_) {}
    }
    // Fallback: derive from email before @ and title-case
    if (!editorName) {
      const email = req.user?.email || "";
      if (email.includes("@")) {
        const base = email.split("@")[0].replace(/[._-]+/g, " ");
        editorName = base
          .split(" ")
          .filter(Boolean)
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join(" ");
      }
    }
    if (!editorName) editorName = req.user?.username || "Unknown";

    project.summaryMeta = {
      lastEditedBy: req.user._id,
      lastEditedByName: editorName,
      lastEditedAt: new Date(),
    };

    await project.save();

    // Log activity
    try {
      await Activity.create({
        type: "ProjectSummary",
        action: "edit",
        name: project.project_name,
        description: `Summary updated by ${editorName}`,
        performedBy: getPerformer(req.user),
        companyName: req.user.companyName,
        meta: { projectId: project.project_id },
      });
    } catch (_) {}
    return res.json({
      success: true,
      summary: project.summary,
      summaryMeta: project.summaryMeta,
    });
  } catch (e) {
    console.error("updateProjectSummary error:", e);
    return res.status(500).json({
      success: false,
      message: e.message || "Failed to update summary",
    });
  }
};

// Get recent activity for project summary
exports.getProjectSummaryActivity = async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!projectId)
      return res
        .status(400)
        .json({ success: false, message: "projectId required" });
    const companyName = req.user.companyName;
    const items = await Activity.find({
      companyName,
      type: "ProjectSummary",
      "meta.projectId": projectId,
    })
      .sort({ createdAt: -1 })
      .limit(20);
    return res.json({ success: true, activities: items });
  } catch (e) {
    console.error("getProjectSummaryActivity error:", e);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch activity" });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    if (
      req.user.role !== "owner" &&
      req.user.role !== "admin" &&
      req.user.role !== "manager"
    ) {
      return res.status(403).json({
        message: "Only owner, admin, and manager can delete projects",
      });
    }

    const userCompany = req.user.companyName;
    const project = await Project.findOne({
      project_id: req.params.projectId,
      companyName: userCompany,
    });
    if (!project) return res.status(404).json({ message: "Project not found" });

    project.project_status = "deleted";
    project.deletedAt = new Date();
    await project.save();

    await Activity.create({
      type: "Project",
      action: "delete",
      name: project.project_name,
      description: `Soft deleted project ${project.project_name}`,
      performedBy: getPerformer(req.user),
      companyName: req.user.companyName,
    });

    res.status(200).json({ message: "Project marked as deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Permanent project deletion with Cloudinary image cleanup
exports.permanentlyDeleteProject = async (req, res) => {
  console.log(
    "permanentlyDeleteProject called with projectId:",
    req.params.projectId
  );
  console.log("User:", req.user);

  try {
    if (
      req.user.role !== "owner" &&
      req.user.role !== "admin" &&
      req.user.role !== "manager"
    ) {
      console.log("User role not authorized:", req.user.role);
      return res.status(403).json({
        message:
          "Only owner, admin, and manager can permanently delete projects",
      });
    }

    const userCompany = req.user.companyName;
    console.log("Looking for project with company:", userCompany);

    const project = await Project.findOne({
      project_id: req.params.projectId,
      companyName: userCompany,
    });

    if (!project) {
      console.log("Project not found");
      return res.status(404).json({ message: "Project not found" });
    }

    console.log("Project found:", project.project_name);

    // Collect all image URLs from project phases and subtasks
    const imageUrls = [];

    if (project.phases && Array.isArray(project.phases)) {
      project.phases.forEach((phase) => {
        if (phase.subtasks && Array.isArray(phase.subtasks)) {
          phase.subtasks.forEach((subtask) => {
            if (subtask.images && Array.isArray(subtask.images)) {
              imageUrls.push(...subtask.images);
            }
          });
        }
      });
    }

    console.log(
      `Found ${imageUrls.length} images to delete from Cloudinary for project ${project.project_id}`
    );

    // Delete images from Cloudinary if any exist
    if (imageUrls.length > 0) {
      const {
        deleteMultipleImagesFromCloudinary,
      } = require("../utils/cloudinaryUpload");
      const cloudinaryResult = await deleteMultipleImagesFromCloudinary(
        imageUrls
      );
      console.log("Cloudinary deletion result:", cloudinaryResult);
    }

    // Permanently delete the project from database
    await Project.findByIdAndDelete(project._id);
    console.log("Project deleted from database");

    await Activity.create({
      type: "Project",
      action: "permanently_delete",
      name: project.project_name,
      description: `Permanently deleted project ${project.project_name} and ${imageUrls.length} associated images`,
      performedBy: getPerformer(req.user),
      companyName: req.user.companyName,
    });

    console.log("Activity logged successfully");

    res.status(200).json({
      message: "Project permanently deleted",
      deletedImages: imageUrls.length,
    });
  } catch (err) {
    console.error("Error permanently deleting project:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getProjectsByTeamMember = async (req, res) => {
  try {
    const { teamMemberId } = req.params;
    console.log("Looking for projects for teamMemberId:", teamMemberId);

    // Role-based access control - allow owner, admin, manager, and team leads to view any member's projects
    if (
      req.user.role === "teamMember" &&
      req.user.teamMemberId !== teamMemberId
    ) {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const employee = await Employee.findOne({ teamMemberId });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    console.log("Employee found:", employee.name);

    const userCompany = req.user.companyName;
    const projects = await Project.find({
      $or: [{ team_members: teamMemberId }, { project_lead: teamMemberId }],
      project_status: { $ne: "deleted" },
      companyName: userCompany,
    });

    console.log("Found projects:", projects.length);

    // Return empty array instead of 404 error
    res.status(200).json({ projects });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.addProjectPhase = async (req, res) => {
  try {
    const { projectId, projectName, title, description, dueDate } = req.body;
    const companyName = req.user.companyName;
    const userRole = req.user.role;
    const userTeamMemberId = req.user.teamMemberId;

    console.log("Incoming body:", req.body);
    console.log("User's company:", companyName);
    console.log("User role:", userRole);

    // Role-based access control
    if (userRole === "teamMember") {
      return res.status(403).json({
        success: false,
        message: "Team members cannot add project phases",
      });
    }

    let project;

    // Try finding by project_id
    if (projectId) {
      project = await Project.findOne({ project_id: projectId, companyName });
    }

    // If not found, try project_name
    if (!project && projectName) {
      project = await Project.findOne({
        project_name: projectName,
        companyName,
      });
    }

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // For team leads, check if they are the project lead
    if (userRole === "teamLead" && project.project_lead !== userTeamMemberId) {
      return res.status(403).json({
        success: false,
        message: "You can only add phases to projects you lead",
      });
    }

    // Managers are allowed to add phases for all projects

    // STEP 1: Get company initials (e.g., Webblaze Softech → WS)
    const initials = companyName
      .split(" ")
      .map((word) => word[0].toUpperCase())
      .join("");

    // STEP 2: Count existing phases in this specific project
    const existingPhasesInProject = (project.phases || []).length;

    // STEP 3: Generate phase_id with project ID: projectId-ph-{index}
    const phaseId = `${project.project_id}-ph-${existingPhasesInProject + 1}`;
    console.log("🔍 Generated phase_id:", phaseId);

    const newPhase = {
      phase_id: phaseId,
      title,
      description,
      dueDate,
      status: "Pending", // default
    };

    project.phases.push(newPhase);
    await project.save();

    res.status(200).json({
      success: true,
      message: "Phase added successfully",
      phase: newPhase,
    });

    // Notify project members about new phase
    try {
      const io = req.app.get("io");
      const recipients = [project.project_lead, ...project.team_members].filter(
        Boolean
      );
      await sendNotification({
        io,
        companyName,
        type: "phase_added",
        title: `New phase in ${project.project_name}`,
        message: `Phase '${title}' has been added to project ${project.project_name}.`,
        link: `/projects/${project.project_id}`,
        projectId: project.project_id,
        phaseId: phaseId,
        recipientTeamMemberIds: recipients,
      });
    } catch (e) {
      console.error("phase add notify failed:", e.message);
    }
  } catch (error) {
    console.error("Error in addProjectPhase:", error);
    res.status(500).json({
      success: false,
      message: "Error adding phase",
      error: error.message,
    });
  }
};

exports.updatePhaseStatus = async (req, res) => {
  try {
    const { projectId, projectName, phaseTitle, phaseId, status } = req.body;
    const companyName = req.user.companyName;
    const userRole = req.user.role;
    const userTeamMemberId = req.user.teamMemberId;

    console.log("Incoming body:", req.body);
    console.log("User's company:", companyName);
    console.log("User role:", userRole);

    if (projectId) {
      console.log("Trying to find project with project_id:", projectId);
    }
    if (projectName) {
      console.log("Trying to find project with project_name:", projectName);
    }

    // Validate status
    if (
      !["Pending", "In Progress", "Completed", "final_checks"].includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    // Special validation for final_checks status - only owner, admin, manager can set it
    if (
      status === "final_checks" &&
      !["owner", "admin", "manager"].includes(userRole)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Only owner, admin, and manager can set phase status to final_checks",
      });
    }

    let project;

    // Try by projectId first
    if (projectId) {
      project = await Project.findOne({ project_id: projectId, companyName });
    }

    // Fallback to projectName if not found or projectId not given
    if (!project && projectName) {
      project = await Project.findOne({
        project_name: projectName,
        companyName,
      });
    }

    if (!project) {
      console.log("Project not found in DB");
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Role-based restrictions:
    // - teamMember: cannot update any phase status
    // - teamLead: can update only for projects they lead
    // - owner/admin/manager: allowed
    if (userRole === "teamMember") {
      return res.status(403).json({
        success: false,
        message: "Team members cannot update phase status",
      });
    }

    // Phase matching logic
    let phase;
    if (phaseId) {
      phase = project.phases.find((p) => p.phase_id === phaseId);
    } else if (phaseTitle) {
      phase = project.phases.find((p) => p.title === phaseTitle);
    }

    if (!phase) {
      return res.status(404).json({
        success: false,
        message: "Phase not found",
      });
    }

    // Enforce completion rule: cannot mark Completed unless all subtasks are Completed
    if (status === "Completed") {
      const subtasks = Array.isArray(phase.subtasks) ? phase.subtasks : [];
      const allDone =
        subtasks.length === 0 ||
        subtasks.every(
          (s) => (s.status || "").toLowerCase() === "completed".toLowerCase()
        );
      if (!allDone) {
        return res.status(400).json({
          success: false,
          message: "All subtasks are not completed.",
        });
      }
    }

    // Team lead check: allow if they lead the project OR are on the project's team
    if (userRole === "teamLead") {
      const isLead =
        String(project.project_lead || "") === String(userTeamMemberId || "");
      const isOnTeam = Array.isArray(project.team_members)
        ? project.team_members
            .map(String)
            .includes(String(userTeamMemberId || ""))
        : false;
      if (!isLead && !isOnTeam) {
        return res.status(403).json({
          success: false,
          message:
            "Team leads can update phases only for projects they lead or are assigned to",
        });
      }
    }

    // Update status
    phase.status = status;
    await project.save();

    return res.status(200).json({
      success: true,
      message: "Phase status updated successfully",
      phase,
    });
  } catch (error) {
    console.error("Error in updatePhaseStatus:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating phase status",
      error: error.message,
    });
  }
};

// Edit phase details (title, description, dueDate)
exports.editPhaseDetails = async (req, res) => {
  try {
    const { projectId, phaseId, title, description, dueDate } = req.body;
    const companyName = req.user.companyName;
    const userRole = req.user.role;
    const userTeamMemberId = req.user.teamMemberId;

    if (!projectId || !phaseId) {
      return res.status(400).json({
        success: false,
        message: "projectId and phaseId are required",
      });
    }

    // Find project within company
    const project = await Project.findOne({
      project_id: projectId,
      companyName,
    });
    if (!project) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    }

    // Role-based access: deny teamMember; teamLead must be project lead
    if (userRole === "teamMember") {
      return res.status(403).json({
        success: false,
        message: "Team members cannot edit project phases",
      });
    }
    if (
      userRole === "teamLead" &&
      String(project.project_lead) !== String(userTeamMemberId)
    ) {
      return res.status(403).json({
        success: false,
        message: "Team leads can edit phases only for projects they lead",
      });
    }

    // Locate phase
    const phase = project.phases.find((p) => p.phase_id === phaseId);
    if (!phase) {
      return res
        .status(404)
        .json({ success: false, message: "Phase not found" });
    }

    // Apply updates (only provided fields)
    if (typeof title === "string" && title.trim().length > 0) {
      phase.title = title.trim();
    }
    if (typeof description === "string") {
      phase.description = description;
    }
    if (dueDate !== undefined) {
      // Keep same format used elsewhere (string or empty)
      phase.dueDate = dueDate || "";
    }

    await project.save();
    return res
      .status(200)
      .json({ success: true, message: "Phase updated", phase });
  } catch (error) {
    console.error("Error editing phase details:", error);
    return res.status(500).json({
      success: false,
      message: "Error editing phase",
      error: error.message,
    });
  }
};

exports.getProjectPhases = async (req, res) => {
  try {
    const { projectId } = req.params;
    const companyName = req.user.companyName;
    const userRole = req.user.role;
    const userTeamMemberId = req.user.teamMemberId;

    console.log(
      "Fetching phases for project:",
      projectId,
      "from company:",
      companyName,
      "User role:",
      userRole
    );

    let project;

    // Role-based project access
    if (
      userRole === "owner" ||
      userRole === "admin" ||
      userRole === "manager"
    ) {
      project = await Project.findOne({
        project_id: projectId,
        companyName,
      });
    } else if (userRole === "teamLead" || userRole === "teamMember") {
      project = await Project.findOne({
        project_id: projectId,
        companyName,
        $or: [
          { project_lead: userTeamMemberId },
          { team_members: userTeamMemberId },
        ],
      });
    } else {
      return res.status(403).json({
        success: false,
        message: "Access denied. Insufficient permissions.",
      });
    }

    if (!project) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    }

    return res.status(200).json({
      success: true,
      phases: project.phases,
    });
  } catch (error) {
    console.error("Error fetching project phases:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.deleteProjectPhase = async (req, res) => {
  try {
    const { projectId, projectName, phase_id, title } = req.body;
    const companyName = req.user.companyName;
    const userRole = req.user.role;
    const userTeamMemberId = req.user.teamMemberId;

    // Role-based access control
    if (userRole === "teamMember") {
      return res.status(403).json({
        success: false,
        message: "Team members cannot delete project phases",
      });
    }

    if (!projectId && !projectName) {
      return res.status(400).json({
        success: false,
        message: "Project ID or Project Name is required",
      });
    }

    if (!phase_id && !title) {
      return res
        .status(400)
        .json({ success: false, message: "Phase ID or Title is required" });
    }

    // Find the project
    let project;
    if (projectId) {
      project = await Project.findOne({ project_id: projectId, companyName });
    }
    if (!project && projectName) {
      project = await Project.findOne({
        project_name: projectName,
        companyName,
      });
    }

    if (!project) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    }

    // For team leads, check if they are the project lead
    if (userRole === "teamLead" && project.project_lead !== userTeamMemberId) {
      return res.status(403).json({
        success: false,
        message: "You can only delete phases from projects you lead",
      });
    }

    // Managers are allowed to delete phases for all projects

    const initialLength = project.phases.length;

    // Filter out the phase
    project.phases = project.phases.filter((phase) => {
      if (phase_id) return phase.phase_id !== phase_id;
      if (title) return phase.title !== title;
    });

    if (project.phases.length === initialLength) {
      return res
        .status(404)
        .json({ success: false, message: "Phase not found" });
    }

    await project.save();

    return res.status(200).json({
      success: true,
      message: "Phase deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteProjectPhase:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting phase",
      error: error.message,
    });
  }
};

exports.updateSubtaskStatus = async (req, res) => {
  try {
    const { subtask_id, status } = req.body;
    const companyName = req.user.companyName;
    const userRole = req.user.role;
    const userTeamMemberId = req.user.teamMemberId;

    if (!subtask_id || !status) {
      return res.status(400).json({
        success: false,
        message: "Subtask ID and status are required",
      });
    }

    // Find the project containing the subtask
    const project = await Project.findOne({
      "phases.subtasks.subtask_id": subtask_id,
      companyName,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Subtask not found",
      });
    }

    // Find the specific subtask
    let targetSubtask = null;
    for (const phase of project.phases) {
      const subtask = phase.subtasks.find((s) => s.subtask_id === subtask_id);
      if (subtask) {
        targetSubtask = subtask;
        break;
      }
    }

    if (!targetSubtask) {
      return res.status(404).json({
        success: false,
        message: "Subtask not found",
      });
    }

    // Role-based access control for subtask status updates
    if (userRole === "teamMember") {
      // Team members can only update their own subtasks
      if (targetSubtask.assigned_member !== userTeamMemberId) {
        return res.status(403).json({
          success: false,
          message: "You can only update subtasks assigned to you",
        });
      }
    } else if (userRole === "teamLead") {
      // Team leads can update subtasks in their projects or subtasks assigned to their team members
      if (project.project_lead !== userTeamMemberId) {
        // Check if subtask is assigned to a team member under this team lead
        const Employee = require("../models/Employee");
        const assignedEmployee = await Employee.findOne({
          teamMemberId: targetSubtask.assigned_member,
          teamLead: userTeamMemberId,
        });
        if (!assignedEmployee) {
          return res.status(403).json({
            success: false,
            message:
              "You can only update subtasks in your projects or assigned to your team members",
          });
        }
      }
    }
    // Owner, admin, and manager have full access to modify any subtask

    // Validate allowed statuses for subtasks
    const allowed = ["Pending", "In Progress", "Paused", "Completed"];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${allowed.join(", ")}`,
      });
    }

    // Update the subtask status using array update
    const result = await Project.updateOne(
      {
        companyName,
        "phases.subtasks.subtask_id": subtask_id,
      },
      {
        $set: {
          "phases.$[].subtasks.$[subtask].status": status,
          "phases.$[].subtasks.$[subtask].updatedAt": new Date(),
        },
      },
      {
        arrayFilters: [{ "subtask.subtask_id": subtask_id }],
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Subtask not found or no changes made",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Subtask status updated successfully",
    });

    // Optionally inform assignee about status change by others (skip if self?)
  } catch (error) {
    console.error("Error updating subtask status:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating subtask status",
      error: error.message,
    });
  }
};

exports.editSubtask = async (req, res) => {
  try {
    const subtask_id = req.body.subtask_id;
    const subtask_title = req.body.subtask_title;
    const description = req.body.description;
    const assigned_member = req.body.assigned_member;
    const priority = req.body.priority;
    const existing_images = req.body.existing_images;
    const companyName = req.user.companyName;
    const userRole = req.user.role;
    const userTeamMemberId = req.user.teamMemberId;

    if (!subtask_id) {
      return res.status(400).json({
        success: false,
        message: "Subtask ID is required",
      });
    }

    // Role-based access control
    if (userRole === "teamMember") {
      return res.status(403).json({
        success: false,
        message: "Team members cannot edit subtasks",
      });
    }

    // Find the project containing the subtask
    const project = await Project.findOne({
      "phases.subtasks.subtask_id": subtask_id,
      companyName,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Subtask not found",
      });
    }

    // Find the current subtask to get existing images
    let currentSubtask = null;
    for (const phase of project.phases) {
      const subtask = phase.subtasks.find((s) => s.subtask_id === subtask_id);
      if (subtask) {
        currentSubtask = subtask;
        break;
      }
    }

    if (!currentSubtask) {
      return res.status(404).json({
        success: false,
        message: "Subtask not found",
      });
    }

    // Role-based access control for editing subtasks
    if (userRole === "teamLead") {
      // Team leads can edit subtasks in their projects or assign to their team members
      if (project.project_lead !== userTeamMemberId) {
        return res.status(403).json({
          success: false,
          message: "You can only edit subtasks in projects you lead",
        });
      }

      // If assigning to someone, check if they are a team member
      if (
        assigned_member &&
        assigned_member !== currentSubtask.assigned_member
      ) {
        const Employee = require("../models/Employee");
        const assignedEmployee = await Employee.findOne({
          teamMemberId: assigned_member,
          role: "teamMember",
        });
        if (!assignedEmployee) {
          return res.status(403).json({
            success: false,
            message: "You can only assign subtasks to team members",
          });
        }
      }
    } else if (userRole === "manager") {
      // Managers can edit subtasks to any project in their company
      // No additional restrictions needed
    }
    // Owner and admin have full access

    // Get current images from the subtask
    const currentImages = currentSubtask.images || [];

    // Handle file uploads if present
    let finalImages = [];

    // Add existing images if provided
    if (existing_images) {
      try {
        const parsedExistingImages = JSON.parse(existing_images);
        finalImages = [...parsedExistingImages];
      } catch (error) {
        console.error("Error parsing existing images:", error);
      }
    }

    // Handle new uploaded files - upload to Cloudinary
    if (req.files && req.files.length > 0) {
      console.log(
        `Processing ${req.files.length} uploaded files (max 2 allowed)`
      );
      console.log(
        "Files received:",
        req.files.map((f) => ({ name: f.originalname, size: f.size }))
      );

      const uploadPromises = req.files.map(async (file, index) => {
        try {
          const timestamp = Date.now();
          const randomString = Math.random().toString(36).substring(2, 15);
          const filename = `subtask_${timestamp}_${randomString}_${index}`;

          console.log(`Uploading file ${index + 1} to Cloudinary:`, filename);
          console.log(`File details:`, {
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            bufferLength: file.buffer ? file.buffer.length : "No buffer",
          });

          const result = await uploadCompressedImage(file.buffer, filename);
          console.log(
            `Cloudinary upload successful for file ${index + 1}:`,
            result.secure_url
          );

          return result.secure_url;
        } catch (error) {
          console.error(
            `Error uploading file ${index + 1} to Cloudinary:`,
            error
          );
          throw error;
        }
      });

      try {
        const uploadedUrls = await Promise.all(uploadPromises);
        finalImages = [...finalImages, ...uploadedUrls];
        console.log(
          `Successfully uploaded ${uploadedUrls.length} images to Cloudinary`
        );
        console.log("Final images array:", finalImages);
      } catch (error) {
        console.error("Error uploading images to Cloudinary:", error);
        return res.status(500).json({
          success: false,
          message: "Error uploading images to Cloudinary",
          error: error.message,
        });
      }
    } else {
      console.log("No files received in request");
    }

    // Find images that were removed and delete them from Cloudinary
    const removedImages = currentImages.filter(
      (img) => !finalImages.includes(img)
    );
    if (removedImages.length > 0) {
      console.log(
        `Found ${removedImages.length} images to delete from Cloudinary:`,
        removedImages
      );

      try {
        const {
          deleteMultipleImagesFromCloudinary,
        } = require("../utils/cloudinaryUpload");
        const cloudinaryResult = await deleteMultipleImagesFromCloudinary(
          removedImages
        );
        console.log(
          "Cloudinary deletion result for removed images:",
          cloudinaryResult
        );
      } catch (error) {
        console.error("Error deleting removed images from Cloudinary:", error);
        // Continue with the update even if Cloudinary deletion fails
      }
    }

    // Prepare update object
    const updateFields = {
      "phases.$[].subtasks.$[subtask].updatedAt": new Date(),
    };

    if (subtask_title) {
      updateFields["phases.$[].subtasks.$[subtask].subtask_title"] =
        subtask_title;
    }
    if (description) {
      updateFields["phases.$[].subtasks.$[subtask].description"] = description;
    }
    if (req.body.dueDate !== undefined) {
      updateFields["phases.$[].subtasks.$[subtask].dueDate"] = req.body.dueDate
        ? new Date(req.body.dueDate)
        : null;
    }
    if (assigned_member) {
      updateFields["phases.$[].subtasks.$[subtask].assigned_member"] =
        assigned_member;
    }
    if (priority) {
      updateFields["phases.$[].subtasks.$[subtask].priority"] = priority;
    }
    if (finalImages.length > 0) {
      updateFields["phases.$[].subtasks.$[subtask].images"] = finalImages;
    }

    console.log("Updating subtask with images:", finalImages);

    // Update the subtask using array update
    const result = await Project.updateOne(
      {
        companyName,
        "phases.subtasks.subtask_id": subtask_id,
      },
      {
        $set: updateFields,
      },
      {
        arrayFilters: [{ "subtask.subtask_id": subtask_id }],
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Subtask not found or no changes made",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Subtask updated successfully",
      images: finalImages,
    });

    // Notify new assignee if changed
    try {
      if (
        assigned_member &&
        assigned_member !== currentSubtask.assigned_member
      ) {
        const io = req.app.get("io");
        await sendNotification({
          io,
          companyName,
          type: "subtask_assigned",
          title: `Subtask assigned: ${
            subtask_title || currentSubtask.subtask_title
          }`,
          message: `You have been assigned a subtask in project ${project.project_name}.`,
          link: `/projects/${project.project_id}`,
          projectId: project.project_id,
          phaseId: phase.phase_id,
          subtaskId: subtask_id,
          recipientTeamMemberIds: [assigned_member],
        });
      }
    } catch (e) {
      console.error("subtask edit notify failed:", e.message);
    }
  } catch (error) {
    console.error("Error editing subtask:", error);
    return res.status(500).json({
      success: false,
      message: "Error editing subtask",
      error: error.message,
    });
  }
};

exports.deleteSubtask = async (req, res) => {
  try {
    const { subtask_id } = req.body;
    const companyName = req.user.companyName;
    const userRole = req.user.role;
    const userTeamMemberId = req.user.teamMemberId;

    if (!subtask_id) {
      return res.status(400).json({
        success: false,
        message: "Subtask ID is required",
      });
    }

    // Role-based access control
    if (userRole === "teamMember") {
      return res.status(403).json({
        success: false,
        message: "Team members cannot delete subtasks",
      });
    }

    // Find the project containing the subtask
    const project = await Project.findOne({
      "phases.subtasks.subtask_id": subtask_id,
      companyName,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Subtask not found",
      });
    }

    // Role-based access control for deleting subtasks
    if (userRole === "teamLead") {
      // Team leads can only delete subtasks in their projects
      if (project.project_lead !== userTeamMemberId) {
        return res.status(403).json({
          success: false,
          message: "You can only delete subtasks in projects you lead",
        });
      }
    } else if (userRole === "manager") {
      // Managers can delete subtasks but check hierarchical access
      const projectCreator = await User.findOne({
        companyName,
        role: { $in: ["owner", "admin"] },
        _id: project.createdBy,
      });
      if (projectCreator) {
        return res.status(403).json({
          success: false,
          message:
            "Managers cannot delete subtasks in projects created by owners or admins",
        });
      }
    }
    // Owner and admin have full access

    // Find the subtask to get its images before deletion
    let subtaskImages = [];
    for (const phase of project.phases) {
      const subtask = phase.subtasks.find((s) => s.subtask_id === subtask_id);
      if (subtask && subtask.images) {
        subtaskImages = [...subtask.images];
        break;
      }
    }

    // Remove the subtask from the phase using $pull
    const result = await Project.updateOne(
      {
        companyName,
        "phases.subtasks.subtask_id": subtask_id,
      },
      {
        $pull: {
          "phases.$.subtasks": { subtask_id: subtask_id },
        },
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Subtask not found or no changes made",
      });
    }

    // Delete images from Cloudinary if any exist
    if (subtaskImages.length > 0) {
      console.log(
        `Deleting ${subtaskImages.length} images from Cloudinary for deleted subtask ${subtask_id}:`,
        subtaskImages
      );

      try {
        const {
          deleteMultipleImagesFromCloudinary,
        } = require("../utils/cloudinaryUpload");
        const cloudinaryResult = await deleteMultipleImagesFromCloudinary(
          subtaskImages
        );
        console.log(
          "Cloudinary deletion result for deleted subtask:",
          cloudinaryResult
        );
      } catch (error) {
        console.error(
          "Error deleting images from Cloudinary for deleted subtask:",
          error
        );
        // Continue even if Cloudinary deletion fails
      }
    }

    return res.status(200).json({
      success: true,
      message: "Subtask deleted successfully",
      deletedImages: subtaskImages.length,
    });
  } catch (error) {
    console.error("Error deleting subtask:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting subtask",
      error: error.message,
    });
  }
};

exports.getSubtaskActivity = async (req, res) => {
  try {
    const { subtaskId } = req.params;
    const companyName = req.user.companyName;
    const userRole = req.user.role;
    const userTeamMemberId = req.user.teamMemberId;

    if (!subtaskId) {
      return res.status(400).json({
        success: false,
        message: "Subtask ID is required",
      });
    }

    // Role-based project access
    let project;
    if (
      userRole === "owner" ||
      userRole === "admin" ||
      userRole === "manager"
    ) {
      project = await Project.findOne({
        "phases.subtasks.subtask_id": subtaskId,
        companyName,
      });
    } else if (userRole === "teamLead" || userRole === "teamMember") {
      project = await Project.findOne({
        "phases.subtasks.subtask_id": subtaskId,
        companyName,
        $or: [
          { project_lead: userTeamMemberId },
          { team_members: userTeamMemberId },
        ],
      });
    } else {
      return res.status(403).json({
        success: false,
        message: "Access denied. Insufficient permissions.",
      });
    }

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Subtask not found",
      });
    }

    // Find the specific subtask in the embedded structure
    let subtask = null;
    let phase = null;

    for (const p of project.phases) {
      const foundSubtask = p.subtasks.find((s) => s.subtask_id === subtaskId);
      if (foundSubtask) {
        subtask = foundSubtask;
        phase = p;
        break;
      }
    }

    if (!subtask) {
      return res.status(404).json({
        success: false,
        message: "Subtask not found",
      });
    }

    // Generate activity log based on subtask data
    const activities = [
      {
        id: 1,
        action: "Status updated",
        details: `Status changed to "${subtask.status}"`,
        timestamp: subtask.updatedAt || new Date().toISOString(),
        user: "System",
        type: "status_update",
      },
      {
        id: 2,
        action: "Subtask assigned",
        details: `Assigned to ${subtask.assigned_member || "Not assigned"}`,
        timestamp:
          subtask.createdAt || new Date(Date.now() - 86400000).toISOString(),
        user: "Project Manager",
        type: "assignment",
      },
      {
        id: 3,
        action: "Subtask created",
        details: "Subtask was created",
        timestamp:
          subtask.createdAt || new Date(Date.now() - 172800000).toISOString(),
        user: "Project Manager",
        type: "creation",
      },
    ];

    return res.status(200).json({
      success: true,
      activities: activities,
    });
  } catch (error) {
    console.error("Error fetching subtask activity:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching subtask activity",
      error: error.message,
    });
  }
};

exports.addSubtask = async (req, res) => {
  try {
    const {
      subtask_title,
      description,
      assigned_team,
      assigned_member,
      priority,
      phase_id,
      dueDate,
    } = req.body;

    const companyName = req.user.companyName;
    const userRole = req.user.role;
    const userTeamMemberId = req.user.teamMemberId;

    console.log("🔍 addSubtask - Request body:", req.body);
    console.log("🔍 addSubtask - User info:", {
      companyName,
      userRole,
      userTeamMemberId,
    });

    if (!subtask_title || !companyName) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Role-based access control
    if (userRole === "teamMember") {
      return res.status(403).json({
        success: false,
        message: "Team members cannot add subtasks",
      });
    }

    // Get projectId from request body (passed from frontend)
    const { projectId } = req.body;

    // If phase_id provided -> project subtask path; else handle general subtasks
    let project = null;
    let phase = null;
    if (phase_id && projectId) {
      console.log(
        "🔍 Looking for project with projectId:",
        projectId,
        "and phase_id:",
        phase_id
      );
      project = await Project.findOne({
        project_id: projectId,
        companyName,
      });
      if (!project) {
        console.log("❌ Project not found for projectId:", projectId);
        return res.status(404).json({ message: "Project not found" });
      }
      phase = project.phases.find((p) => p.phase_id === phase_id);
      if (!phase) {
        console.log("❌ Phase not found:", phase_id);
        return res.status(404).json({ message: "Phase not found" });
      }
      console.log("✅ Found project and phase:", {
        projectId: project.project_id,
        phaseTitle: phase.title,
      });
    } else {
      console.log("🔍 Creating general subtask (no phase_id or projectId)");
    }

    // Role-based access control for adding subtasks
    if (userRole === "teamLead") {
      // Team leads can only add subtasks to their projects (only if project exists)
      if (project && project.project_lead !== userTeamMemberId) {
        return res.status(403).json({
          success: false,
          message: "You can only add subtasks to projects you lead",
        });
      }

      // Team leads can only assign to team members
      if (assigned_member) {
        const Employee = require("../models/Employee");
        const assignedEmployee = await Employee.findOne({
          teamMemberId: assigned_member,
          role: "teamMember",
        });
        if (!assignedEmployee) {
          return res.status(403).json({
            success: false,
            message: "You can only assign subtasks to team members",
          });
        }
      }
    } else if (userRole === "manager") {
      // Managers can add subtasks to any project in their company
      // No additional restrictions needed
    }
    // Owner and admin have full access

    // Assigned team fallback logic (only for project-based subtasks)
    let finalAssignedTeam = assigned_team || "Not assigned";
    if (phase_id && !assigned_team && project && project.team_id) {
      const Team = require("../models/Team");
      const team = await Team.findOne({ _id: project.team_id, companyName });
      finalAssignedTeam = team ? team.teamName : "Not assigned";
    }

    // Subtask ID generation - New format: projectId-phaseId-subtaskIndex
    let subtask_id = "";
    if (phase_id && phase && projectId) {
      const nextIndex = (phase.subtasks || []).length + 1;
      // phase_id already contains projectId, so we can use it directly
      subtask_id = `${phase_id}-${nextIndex}`;
      console.log("🔍 Generated subtask_id:", subtask_id);
    } else {
      const ts = Date.now();
      const rnd = Math.random().toString(36).slice(2, 6);
      subtask_id = `GEN-${ts}-${rnd}`;
      console.log("🔍 Generated general subtask_id:", subtask_id);
    }

    // 🌟 Upload all images to Cloudinary (compressed)
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      console.log(
        `Processing ${req.files.length} uploaded files for new subtask (max 2 allowed)`
      );

      const uploadPromises = req.files.map(async (file, index) => {
        try {
          const timestamp = Date.now();
          const randomString = Math.random().toString(36).substring(2, 15);
          const filename = `subtask_${timestamp}_${randomString}_${index}`;

          console.log(`Uploading file ${index + 1} to Cloudinary:`, filename);

          const result = await uploadCompressedImage(file.buffer, filename);
          console.log(
            `Cloudinary upload successful for file ${index + 1}:`,
            result.secure_url
          );

          return result.secure_url;
        } catch (error) {
          console.error(
            `Error uploading file ${index + 1} to Cloudinary:`,
            error
          );
          throw error;
        }
      });

      try {
        imageUrls = await Promise.all(uploadPromises);
        console.log(
          `Successfully uploaded ${imageUrls.length} images to Cloudinary for new subtask`
        );
      } catch (error) {
        console.error("Error uploading images to Cloudinary:", error);
        return res.status(500).json({
          success: false,
          message: "Error uploading images to Cloudinary",
          error: error.message,
        });
      }
    }

    // Build subtask object
    const newSubtask = {
      subtask_id,
      subtask_title,
      description,
      assigned_team: finalAssignedTeam,
      assigned_member,
      priority: priority || "Low",
      status: "Pending",
      images: imageUrls,
      createdAt: new Date(),
      updatedAt: new Date(),
      dueDate: dueDate ? new Date(dueDate) : undefined,
    };

    if (phase_id && project) {
      // Push into project phase subtasks
      const result = await Project.updateOne(
        {
          project_id: project.project_id,
          companyName,
          "phases.phase_id": phase_id,
        },
        {
          $push: {
            "phases.$.subtasks": newSubtask,
          },
        }
      );
      if (result.modifiedCount === 0) {
        return res
          .status(500)
          .json({ message: "Failed to add subtask to phase" });
      }
    } else {
      // General subtask path: store on Employee (admin/manager only)
      const Employee = require("../models/Employee");
      // Role permissions: owner -> admin|manager, admin -> manager
      const assignerRole = userRole;
      let allowed = false;
      if (assignerRole === "owner" && assigned_member) {
        const assignee = await Employee.findOne({
          teamMemberId: assigned_member,
          companyName,
        });
        allowed =
          assignee &&
          (assignee.role === "admin" || assignee.role === "manager");
      } else if (assignerRole === "admin" && assigned_member) {
        const assignee = await Employee.findOne({
          teamMemberId: assigned_member,
          companyName,
        });
        allowed = assignee && assignee.role === "manager";
      }
      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: "Not allowed to assign general subtasks to this role",
        });
      }

      // save general subtask to employee document
      const result = await Employee.updateOne(
        { teamMemberId: assigned_member, companyName },
        {
          $push: {
            generalSubtasks: {
              ...newSubtask,
              assignedBy: userTeamMemberId,
            },
          },
        }
      );
      if (result.modifiedCount === 0) {
        return res
          .status(500)
          .json({ message: "Failed to add general subtask" });
      }
    }

    console.log("✅ Subtask created successfully:", newSubtask);
    res.status(201).json({
      success: true,
      message: "Subtask added successfully",
      subtask: newSubtask,
    });

    // Notify assigned member if present
    try {
      if (assigned_member) {
        const io = req.app.get("io");
        await sendNotification({
          io,
          companyName,
          type: "subtask_assigned",
          title: `New subtask assigned: ${subtask_title}`,
          message:
            phase_id && project
              ? `You have been assigned a subtask in project ${project.project_name}.`
              : `You have been assigned a general subtask.`,
          link:
            phase_id && project ? `/projects/${project.project_id}` : `/tasks`,
          projectId: project ? project.project_id : undefined,
          phaseId: phase_id,
          subtaskId: subtask_id,
          recipientTeamMemberIds: [assigned_member],
        });
      }
    } catch (e) {
      console.error("subtask add notify failed:", e.message);
    }
  } catch (error) {
    console.error("Error adding subtask:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add subtask",
      error: error.message,
    });
  }
};

exports.getSubtasksByProjectId = async (req, res) => {
  try {
    const { project_id } = req.params;
    const companyName = req.user.companyName;
    const userRole = req.user.role;
    const userTeamMemberId = req.user.teamMemberId;

    console.log(
      "🔍 Getting subtasks for project_id:",
      project_id,
      "User role:",
      userRole
    );

    // Role-based project access
    let project;
    if (
      userRole === "owner" ||
      userRole === "admin" ||
      userRole === "manager"
    ) {
      project = await Project.findOne({ project_id, companyName });
    } else if (userRole === "teamLead" || userRole === "teamMember") {
      project = await Project.findOne({
        project_id,
        companyName,
        $or: [
          { project_lead: userTeamMemberId },
          { team_members: userTeamMemberId },
        ],
      });
    } else {
      return res.status(403).json({
        success: false,
        message: "Access denied. Insufficient permissions.",
      });
    }

    if (!project) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    }

    // 2. Extract all subtasks from all phases and populate team information
    const allSubtasks = [];

    // Get team name if project has team_id
    let teamName = "Not assigned";
    if (project.team_id) {
      const Team = require("../models/Team");
      const team = await Team.findOne({
        _id: project.team_id,
        companyName,
      });
      teamName = team ? team.teamName : "Not assigned";
    }

    // Update existing subtasks that don't have team information
    let hasUpdates = false;
    project.phases.forEach((phase) => {
      if (phase.subtasks && phase.subtasks.length > 0) {
        phase.subtasks.forEach((subtask) => {
          if (
            !subtask.assigned_team ||
            subtask.assigned_team === "Not assigned"
          ) {
            subtask.assigned_team = teamName;
            hasUpdates = true;
          }
        });
      }
    });

    // Save the project if any updates were made
    if (hasUpdates) {
      await project.save();
    }

    project.phases.forEach((phase) => {
      if (phase.subtasks && phase.subtasks.length > 0) {
        // Add phase information to each subtask for context
        const subtasksWithPhase = phase.subtasks.map((subtask) => ({
          ...(subtask.toObject ? subtask.toObject() : subtask),
          phase_id: phase.phase_id,
          phase_title: phase.title,
        }));
        allSubtasks.push(...subtasksWithPhase);
      }
    });

    console.log("📌 Total subtasks found:", allSubtasks.length);

    return res.status(200).json({ success: true, subtasks: allSubtasks });
  } catch (error) {
    console.error("❌ Error fetching subtasks:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.addCommentToPhase = async (req, res) => {
  try {
    const { projectId, phaseId } = req.params;
    const { text } = req.body;
    const userId = req.user._id;
    const companyName = req.user.companyName;
    const userRole = req.user.role;
    const userTeamMemberId = req.user.teamMemberId;

    if (!text || text.trim() === "") {
      return res
        .status(400)
        .json({ success: false, message: "Comment text is required" });
    }

    // Role-based project access
    let project;
    if (
      userRole === "owner" ||
      userRole === "admin" ||
      userRole === "manager"
    ) {
      project = await Project.findOne({
        project_id: projectId,
        companyName,
      });
    } else if (userRole === "teamLead" || userRole === "teamMember") {
      project = await Project.findOne({
        project_id: projectId,
        companyName,
        $or: [
          { project_lead: userTeamMemberId },
          { team_members: userTeamMemberId },
        ],
      });
    } else {
      return res.status(403).json({
        success: false,
        message: "Access denied. Insufficient permissions.",
      });
    }

    if (!project) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    }

    const phase = project.phases.find((p) => p.phase_id === phaseId);
    if (!phase) {
      return res
        .status(404)
        .json({ success: false, message: "Phase not found" });
    }

    // Build display name and persist it (works for both User and Employee)
    const baseUser = req.user || {};
    let displayName =
      [baseUser.firstName, baseUser.lastName].filter(Boolean).join(" ") ||
      baseUser.name ||
      baseUser.email ||
      "";
    if (!displayName) {
      const userDoc = await mongoose
        .model("User")
        .findById(userId)
        .select("firstName lastName name email");
      if (userDoc) {
        displayName =
          [userDoc.firstName, userDoc.lastName].filter(Boolean).join(" ") ||
          userDoc.name ||
          userDoc.email ||
          "";
      }
    }
    if (!displayName) displayName = "Unknown";

    const newComment = {
      text,
      commentedBy: new mongoose.Types.ObjectId(userId),
      commentedByName: displayName,
      timestamp: new Date(),
    };

    phase.comments.push(newComment);
    await project.save();

    const lastComment = phase.comments[phase.comments.length - 1];

    const populatedUser = await mongoose
      .model("User")
      .findById(lastComment.commentedBy)
      .select("firstName lastName name email");

    return res.status(200).json({
      success: true,
      message: "Comment added successfully",
      comment: {
        text: lastComment.text,
        commentedBy:
          [populatedUser?.firstName, populatedUser?.lastName]
            .filter(Boolean)
            .join(" ") ||
          populatedUser?.name ||
          lastComment.commentedByName ||
          populatedUser?.email ||
          "Unknown",
        timestamp: lastComment.timestamp.toLocaleString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }),
      },
    });
  } catch (err) {
    console.error("Error adding comment:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getPhaseComments = async (req, res) => {
  try {
    const { projectId, phaseId } = req.params;
    const companyName = req.user.companyName;
    const userRole = req.user.role;
    const userTeamMemberId = req.user.teamMemberId;

    // Role-based project access
    let project;
    if (
      userRole === "owner" ||
      userRole === "admin" ||
      userRole === "manager"
    ) {
      project = await Project.findOne({
        project_id: projectId,
        companyName,
      }).populate(
        "phases.comments.commentedBy",
        "firstName lastName name email"
      );
    } else if (userRole === "teamLead" || userRole === "teamMember") {
      project = await Project.findOne({
        project_id: projectId,
        companyName,
        $or: [
          { project_lead: userTeamMemberId },
          { team_members: userTeamMemberId },
        ],
      }).populate(
        "phases.comments.commentedBy",
        "firstName lastName name email"
      );
    } else {
      return res.status(403).json({
        success: false,
        message: "Access denied. Insufficient permissions.",
      });
    }

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const phase = project.phases.find(
      (p) => p.phase_id?.trim() === phaseId.trim()
    );

    if (!phase) {
      return res.status(404).json({
        success: false,
        message: "Phase not found",
      });
    }

    const formattedComments = (phase.comments || []).map((c) => {
      const u = c.commentedBy || {};
      const displayName =
        [u.firstName, u.lastName].filter(Boolean).join(" ") ||
        u.name ||
        c.commentedByName ||
        u.email ||
        (typeof c.commentedBy === "string" ? c.commentedBy : "") ||
        "Unknown";
      return {
        text: c.text,
        commentedBy: displayName,
        timestamp: new Date(c.timestamp).toLocaleString("en-IN", {
          dateStyle: "medium",
          timeStyle: "short",
        }),
      };
    });

    res.status(200).json({
      success: true,
      comments: formattedComments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get comments",
      error: error.message,
    });
  }
};
