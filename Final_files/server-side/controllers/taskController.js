const Task = require("../models/Task");
const Employee = require("../models/Employee");
const Team = require("../models/Team");
const Activity = require("../models/Activity");

const getPerformer = (user) =>
  user?.firstName
    ? user.firstName + (user.lastName ? " " + user.lastName : "")
    : user?.name || user?.email || "Unknown";

exports.createTask = async (req, res) => {
  try {
    const { title, description, assignedTo } = req.body;

    if (!title || title.trim() === "") {
      return res.status(400).json({ message: "Title is required." });
    }

    console.log("req.user from token:", req.user);

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
    });

    await task.save();
    await Activity.create({
      type: "Task",
      action: "add",
      name: task.title,
      description: `Created task ${task.title}`,
      performedBy: getPerformer(req.user),
    });
    res.status(201).json({ message: "Task created successfully.", task });
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
    const tasks = await Task.find({ assignedTo: teamMemberId });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Error fetching task history.", error });
  }
};

exports.getOngoingTasks = async (req, res) => {
  try {
    const { teamMemberId } = req.params;
    const tasks = await Task.find({
      assignedTo: teamMemberId,
      status: "In Progress",
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Error fetching ongoing tasks.", error });
  }
};

exports.updateTasksByTeamMemberId = async (req, res) => {
  try {
    const { teamMemberId } = req.params;
    const { newAssignedTo, status } = req.body;

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
      if (!["Pending", "In Progress", "Completed"].includes(status)) {
        return res.status(400).json({ message: "Invalid status value." });
      }
      updatePayload.status = status;
    }

    if (Object.keys(updatePayload).length === 0) {
      return res
        .status(400)
        .json({ message: "No valid update fields provided." });
    }

    await Task.updateMany({ assignedTo: teamMemberId }, updatePayload);

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
