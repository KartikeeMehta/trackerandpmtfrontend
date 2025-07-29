const Task = require("../models/Task");
const Employee = require("../models/Employee");
const Team = require("../models/Team");
const Activity = require("../models/Activity");
const Project = require("../models/Project");
const User = require("../models/User");

const getPerformer = (user) =>
  user?.firstName
    ? user.firstName + (user.lastName ? " " + user.lastName : "")
    : user?.name || user?.email || "Unknown";

exports.createTask = async (req, res) => {
  try {
    const { title, description, assignedTo, project, priority, dueDate } = req.body;

    if (!title || title.trim() === "") {
      return res.status(400).json({ message: "Title is required." });
    }
    if (!project || project.trim() === "") {
      return res.status(400).json({ message: "Project is required." });
    }
    if (!priority || !['low', 'medium', 'high', 'critical'].includes(priority)) {
      return res.status(400).json({ message: "Priority must be one of: low, medium, high, critical." });
    }
    if (!dueDate || dueDate.trim() === "") {
      return res.status(400).json({ message: "Due date is required." });
    }

    // Validate project existence
    const projectDoc = await Project.findOne({ project_id: project });
    if (!projectDoc) {
      return res.status(404).json({ message: "Project with this project_id not found." });
    }

    // Check if the provided teamMemberId exists
    const employee = await Employee.findOne({ teamMemberId: assignedTo });
    if (!employee) {
      return res.status(404).json({ message: "Employee with this teamMemberId not found." });
    }

    // Auto-generate task_id
    const lastTask = await Task.findOne().sort({ createdAt: -1 });
    let newTaskId = "TSK-001";
    if (lastTask && lastTask.task_id) {
      const lastIdNum = parseInt(lastTask.task_id.split("-")[1]);
      const nextIdNum = lastIdNum + 1;
      newTaskId = `TSK-${nextIdNum.toString().padStart(3, "0")}`;
    }

    const task = new Task({
      task_id: newTaskId,
      title: title.trim(),
      description: description?.trim(),
      assignedTo,
      assignedBy: req.user._id,
      assignedByRole: req.user.role.toLowerCase(),
      project,
      priority,
      dueDate,
    });

    await task.save();

    await Activity.create({
      type: "Task",
      action: "add",
      name: task.title,
      description: `Created task ${task.title}`,
      performedBy: getPerformer(req.user),
    });

    // Fetch assigner's name for response
    const assigner = await User.findById(req.user._id);
    const assignedByName = assigner ? `${assigner.firstName} ${assigner.lastName}` : "Unknown";

    // Return task with assignedBy as name
    const taskObj = task.toObject();
    taskObj.assignedBy = assignedByName;

    res.status(201).json({ message: "Task created successfully.", task: taskObj });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating task.", error });
  }
};

exports.getTasksForSelf = async (req, res) => {
  try {
    const tasks = await Task.find({ assignedTo: req.user.teamMemberId });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Error fetching tasks.", error });
  }
};

exports.getAllTasks = async (req, res) => {
  try {
    const { role, teamId } = req.user;

    let tasks;
    if (role === "TeamLead") {
      const team = await Team.findById(teamId);
      const memberIds = team.members.map((member) => member.teamMemberId);
      tasks = await Task.find({ assignedTo: { $in: memberIds } });
    } else {
      tasks = await Task.find();
    }

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Error fetching all tasks.", error });
  }
};

exports.getTaskHistoryByMemberId = async (req, res) => {
  try {
    const { teamMemberId } = req.params;
    const tasks = await Task.find({
      assignedTo: teamMemberId,
      status: { $in: ["completed", "deleted", "Completed", "Deleted"] },
    });
    res.json({ tasks });
  } catch (error) {
    res.status(500).json({ message: "Error fetching task history.", error });
  }
};

exports.getOngoingTasks = async (req, res) => {
  try {
    let filter = { status: { $in: ["pending", "in progress", "In Progress"] } };
    if (req.params.teamMemberId) {
      filter.assignedTo = req.params.teamMemberId;
    }
    const tasks = await Task.find(filter);
    res.json({ tasks });
  } catch (error) {
    res.status(500).json({ message: "Error fetching ongoing tasks.", error });
  }
};

exports.updateTasksByTeamMemberId = async (req, res) => {
  try {
    const { teamMemberId } = req.params;
    const {
      title,
      description,
      status,
      newAssignedTo,
      priority,
      dueDate,
      project,
      deletionReason,
      completedAt,
      comment
    } = req.body;

    const tasks = await Task.find({ assignedTo: teamMemberId });
    if (tasks.length === 0) {
      return res.status(404).json({ message: "No tasks found for the given teamMemberId." });
    }

    // Check permissions
    const isAuthorized = ["owner", "admin"].includes(req.user.role.toLowerCase());
    if (!isAuthorized) {
      const unauthorizedTask = tasks.find(
        (task) => String(task.assignedBy) !== String(req.user._id)
      );
      if (unauthorizedTask) {
        return res.status(403).json({ message: "Not authorized to update some tasks." });
      }
    }

    const updatePayload = {};

    // General fields update
    if (title) updatePayload.title = title;
    if (description) updatePayload.description = description;
    if (priority && ["low", "medium", "high", "critical"].includes(priority))
      updatePayload.priority = priority;
    if (dueDate) updatePayload.dueDate = dueDate;
    if (project) updatePayload.project = project;
    if (deletionReason) updatePayload.deletionReason = deletionReason;
    if (completedAt) updatePayload.completedAt = completedAt;

    // Handle reassignment
    if (newAssignedTo) {
      const Employee = require("../models/Employee");
      const newAssignee = await Employee.findOne({ teamMemberId: newAssignedTo })
      if (!newAssignee) {
        return res.status(404).json({ message: "New assigned member not found." })
      }
      updatePayload.assignedTo = newAssignedTo;
      updatePayload.status = "pending";
    }

    // Handle status updates
    if (status) {
      const validStatuses = ["pending", "verification", "in-progress", "completed"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status value." });
      }

      if (status === "completed") {
        const isTeamLead = req.user.role.toLowerCase() === "teamlead";
        const allInVerification = tasks.every(task => task.status === "verification");
        if (!isTeamLead || !allInVerification) {
          return res.status(403).json({
            message: "Only a TeamLead can mark a task as completed after verification."
          });
        }
        updatePayload.status = "completed";
      } else if (status === "verification") {
        updatePayload.status = "verification";
      } else {
        updatePayload.status = status;
      }
    }

    if (Object.keys(updatePayload).length === 0 && !comment) {
      return res.status(400).json({ message: "No valid update fields provided." });
    }

    await Task.updateMany({ assignedTo: teamMemberId }, updatePayload);

    // Handle comments
    if (comment && comment.trim() !== "") {
      const User = require("../models/User");
      const assigner = await User.findById(req.user._id);
      const authorName = assigner ? `${assigner.firstName} ${assigner.lastName}` : "Unknown";

      await Task.updateMany(
        { assignedTo: teamMemberId },
        { $push: { comments: { text: comment, author: authorName } } }
      );
    }

    res.json({ message: "Tasks updated successfully." });
  } catch (error) {
    res.status(500).json({ message: "Error updating tasks.", error });
  }
};

exports.deleteTasksByTeamMemberId = async (req, res) => {
  try {
    const { teamMemberId } = req.params;

    const tasks = await Task.find({ assignedTo: teamMemberId });
    if (tasks.length === 0) {
      return res
        .status(404)
        .json({ message: "No tasks found for the given teamMemberId." });
    }

    const isAuthorized =
      req.user.role.toLowerCase() === "owner" ||
      req.user.role.toLowerCase() === "admin";

    if (!isAuthorized) {
      const unauthorizedTask = tasks.find(
        (task) => String(task.assignedBy) !== String(req.user._id)
      );
      if (unauthorizedTask) {
        return res
          .status(403)
          .json({ message: "Not authorized to delete some tasks." });
      }
    }

    await Task.deleteMany({ assignedTo: teamMemberId });
    res.json({ message: "All tasks for this team member have been deleted." });
  } catch (error) {
    res.status(500).json({ message: "Error deleting tasks.", error });
  }
};

exports.updateTaskById = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { title, description, status } = req.body;
    const updatePayload = {};
    if (title) updatePayload.title = title;
    if (description) updatePayload.description = description;
    if (status) updatePayload.status = status;
    const task = await Task.findByIdAndUpdate(taskId, updatePayload, {
      new: true,
    });
    if (!task) return res.status(404).json({ message: "Task not found." });
    res.json({ message: "Task updated successfully.", task });
  } catch (error) {
    res.status(500).json({ message: "Error updating task.", error });
  }
};

exports.deleteTaskById = async (req, res) => {
  try {
    const { task_id } = req.params; // ✅ Get from URL param
    const { reason } = req.body;

    if (!task_id || task_id.trim() === "") {
      return res.status(400).json({ message: "task_id is required." });
    }

    const userRole = req.user.role.toLowerCase();

    // ❌ Employee cannot delete any task
    if (userRole === "employee") {
      return res.status(403).json({ message: "You are not authorized to delete tasks." });
    }

    const task = await Task.findOne({ task_id });

    if (!task) {
      return res.status(404).json({ message: "Task not found with the given task_id." });
    }

    // Fetch assignee employee
    const assignee = await Employee.findOne({ teamMemberId: task.assignedTo });

    if (!assignee) {
      return res.status(404).json({ message: "Assignee of the task not found." });
    }

    const assigneeRole = assignee.role.toLowerCase();

    // 🔐 Role-based permission checks
    if (userRole === "admin") {
      if (!["team_lead", "employee"].includes(assigneeRole)) {
        return res.status(403).json({ message: "Admins can only delete tasks of team_leads or employees." });
      }
    } else if (userRole === "team_lead") {
      if (assignee._id.toString() === req.user._id.toString()) {
        return res.status(403).json({ message: "Team leads cannot delete their own tasks." });
      }
      if (assigneeRole !== "employee") {
        return res.status(403).json({ message: "Team leads can only delete tasks assigned to employees." });
      }
    }

    // Soft-delete the task
    task.status = "deleted";
    if (reason) {
      task.deletionReason = reason;
    }

    await task.save();

    await Activity.create({
      type: "Task",
      action: "delete",
      name: task.title,
      description: `Task ${task.title} marked as deleted.`,
      performedBy: getPerformer(req.user),
    });

    res.status(200).json({ message: "Task marked as deleted.", task });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting task.", error });
  }
};