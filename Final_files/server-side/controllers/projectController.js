const Employee = require("../models/Employee");
const Activity = require("../models/Activity");
const { Project, Subtask } = require("../models/Project");

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

    // ✅ Extract initials from company name (e.g., "Alpha Beta Corp" => "ABC")
    const initials = companyName
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase())
      .join("");

    // ✅ Count projects of this company
    const count = await Project.countDocuments({ companyName });

    const generatedProjectId = `${initials}-Pr-${count + 1}`;

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

    res.status(201).json({ message: "Project created", project: newProject });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getProjectById = async (req, res) => {
  try {
    if (
      req.user.role !== "owner" &&
      req.user.role !== "admin" &&
      req.user.role !== "manager"
    ) {
      return res
        .status(403)
        .json({ message: "Only owner, admin, and manager can view projects" });
    }

    const userCompany = req.user.companyName;
    const project = await Project.findOne({
      project_id: req.params.projectId,
      companyName: userCompany,
    });
    if (!project) return res.status(404).json({ message: "Project not found" });

    res.status(200).json({ project });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getAllProjects = async (req, res) => {
  try {
    if (
      req.user.role !== "owner" &&
      req.user.role !== "admin" &&
      req.user.role !== "manager"
    ) {
      return res
        .status(403)
        .json({ message: "Only owner, admin, and manager can view projects" });
    }

    const userCompany = req.user.companyName;
    const projects = await Project.find({ companyName: userCompany }).sort({
      createdAt: -1,
    });
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

    const { add_members = [], remove_members = [], ...otherUpdates } = req.body;

    const userCompany = req.user.companyName;
    const project = await Project.findOne({
      project_id: req.params.projectId,
      companyName: userCompany,
    });
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
      companyName: req.user.companyName,
    });

    res.status(200).json({ message: "Project updated", project });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
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

exports.getProjectsByTeamMember = async (req, res) => {
  try {
    const { teamMemberId } = req.params;
    console.log("Looking for projects for teamMemberId:", teamMemberId);

    // Role-based access control - allow owner, admin, manager, and team leads to view any member's projects
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

    console.log("Incoming body:", req.body);
    console.log("User's company:", companyName);

    if (projectId) {
      console.log("Trying to find project with project_id:", projectId);
    }
    if (projectName) {
      console.log("Trying to find project with project_name:", projectName);
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

    // STEP 1: Get company initials (e.g., Webblaze Softech → WS)
    const initials = companyName
      .split(" ")
      .map((word) => word[0].toUpperCase())
      .join("");

    // STEP 2: Count existing phases across all projects of this company
    const allProjects = await Project.find({ companyName });
    let totalPhases = 0;
    allProjects.forEach((p) => {
      totalPhases += (p.phases || []).length;
    });

    // STEP 3: Generate phase_id
    const phaseId = `${initials}-ph-${totalPhases + 1}`;

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

    console.log("Incoming body:", req.body);
    console.log("User's company:", companyName);

    if (projectId) {
      console.log("Trying to find project with project_id:", projectId);
    }
    if (projectName) {
      console.log("Trying to find project with project_name:", projectName);
    }

    // Validate status
    if (!["Pending", "In Progress", "Completed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
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

exports.getProjectPhases = async (req, res) => {
  try {
    const { projectId } = req.params;
    const companyName = req.user.companyName;

    console.log(
      "Fetching phases for project:",
      projectId,
      "from company:",
      companyName
    );

    const project = await Project.findOne({
      project_id: projectId,
      companyName,
    });

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

    if (!subtask_id || !status) {
      return res.status(400).json({
        success: false,
        message: "Subtask ID and status are required",
      });
    }

    const subtask = await Subtask.findOne({
      subtask_id,
      companyName,
    });

    if (!subtask) {
      return res.status(404).json({
        success: false,
        message: "Subtask not found",
      });
    }

    subtask.status = status;
    await subtask.save();

    return res.status(200).json({
      success: true,
      message: "Subtask status updated successfully",
      subtask,
    });
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
    const { subtask_id, subtask_title, description, assigned_member, images } =
      req.body;
    const companyName = req.user.companyName;

    if (!subtask_id) {
      return res.status(400).json({
        success: false,
        message: "Subtask ID is required",
      });
    }

    const subtask = await Subtask.findOne({
      subtask_id,
      companyName,
    });

    if (!subtask) {
      return res.status(404).json({
        success: false,
        message: "Subtask not found",
      });
    }

    // Update fields if provided
    if (subtask_title) subtask.subtask_title = subtask_title;
    if (description) subtask.description = description;
    if (assigned_member) subtask.assigned_member = assigned_member;
    if (images) subtask.images = images;

    await subtask.save();

    return res.status(200).json({
      success: true,
      message: "Subtask updated successfully",
      subtask,
    });
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

    if (!subtask_id) {
      return res.status(400).json({
        success: false,
        message: "Subtask ID is required",
      });
    }

    const subtask = await Subtask.findOne({
      subtask_id,
      companyName,
    });

    if (!subtask) {
      return res.status(404).json({
        success: false,
        message: "Subtask not found",
      });
    }

    await Subtask.deleteOne({ subtask_id, companyName });

    return res.status(200).json({
      success: true,
      message: "Subtask deleted successfully",
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

    if (!subtaskId) {
      return res.status(400).json({
        success: false,
        message: "Subtask ID is required",
      });
    }

    const subtask = await Subtask.findOne({
      subtask_id: subtaskId,
      companyName,
    });

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
        details: `Assigned to ${subtask.assigned_member}`,
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
      phase_id,
      images,
    } = req.body;

    const companyName = req.user.companyName;

    if (!subtask_title || !phase_id || !companyName) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Get the project to find the assigned team
    const project = await Project.findOne({
      "phases.phase_id": phase_id,
      companyName,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found for this phase",
      });
    }

    // Use project's assigned team as default if not provided
    const finalAssignedTeam =
      assigned_team || project.assigned_team || "Not assigned";

    // Count how many subtasks exist for this phase to autogenerate ID
    const existingSubtasks = await Subtask.find({ phase_id, companyName });
    const nextIndex = existingSubtasks.length + 1;
    const subtask_id = `${phase_id}-${nextIndex}`;

    const newSubtask = new Subtask({
      subtask_id,
      subtask_title,
      description,
      assigned_team: finalAssignedTeam,
      assigned_member,
      status: "Pending",
      phase_id,
      companyName,
      images: images || [],
    });

    await newSubtask.save();

    res.status(201).json({
      success: true,
      message: "Subtask added successfully",
      subtask: newSubtask,
    });
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

    console.log("🔍 Getting subtasks for project_id:", project_id);

    // 1. Find the project under the user's company
    const project = await Project.findOne({ project_id, companyName });

    if (!project) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    }

    // 2. Extract all phase_ids from the project
    const phaseIds = project.phases.map((phase) => phase.phase_id);

    console.log("📌 Phase IDs in this project:", phaseIds);

    // 3. Find all subtasks linked to those phases under the same company
    const subtasks = await Subtask.find({
      phase_id: { $in: phaseIds },
      companyName,
    });

    return res.status(200).json({ success: true, subtasks });
  } catch (error) {
    console.error("❌ Error fetching subtasks:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
