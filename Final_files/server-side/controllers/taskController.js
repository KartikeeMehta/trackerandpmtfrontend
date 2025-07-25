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
      return res
        .status(404)
        .json({ message: "Employee with this teamMemberId not found." });
    }

    const task = new Task({
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
    const { newAssignedTo, status, comment } = req.body;

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
          .json({ message: "Not authorized to update some tasks." });
      }
    }

    const updatePayload = {};
    if (newAssignedTo) {
      const team = await Team.findOne({
        "members.teamMemberId": newAssignedTo,
      });
      if (!team)
        return res
          .status(404)
          .json({ message: "New assigned member not found." });
      updatePayload.assignedTo = newAssignedTo;
      updatePayload.status = "Pending";
    }

    if (status) {
      if (!["pending", "verification", "in-progress", "completed"].includes(status)) {
        return res.status(400).json({ message: "Invalid status value." });
      }
      // If trying to mark as completed, enforce verification by TeamLead
      if (status === "completed") {
        // Only allow if current status is 'verification' and user is TeamLead
        const isTeamLead = req.user.role && req.user.role.toLowerCase() === "teamlead";
        const tasksToUpdate = await Task.find({ assignedTo: teamMemberId });
        const allInVerification = tasksToUpdate.every(task => task.status === "verification");
        if (!isTeamLead || !allInVerification) {
          return res.status(403).json({ message: "Only a TeamLead can mark a task as completed after verification." });
        }
        updatePayload.status = "completed";
      } else if (status === "verification") {
        // Allow teamMember to request verification
        updatePayload.status = "verification";
      } else {
        updatePayload.status = status;
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      return res
        .status(400)
        .json({ message: "No valid update fields provided." });
    }

    await Task.updateMany({ assignedTo: teamMemberId }, updatePayload);

    // Add comment if provided
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
    const { taskId } = req.params;
    const { reason } = req.body;
    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found." });
    task.status = "deleted";
    if (reason) task.deletionReason = reason;
    await task.save();
    res.json({ message: "Task marked as deleted.", task });
  } catch (error) {
    res.status(500).json({ message: "Error deleting task.", error });
  }
};
