import React, { useEffect, useState } from "react";
import {
  CalendarDays,
  Users,
  Plus,
  History,
  Edit,
  Trash2,
  X,
} from "lucide-react";
import { api_url } from "@/api/Api";
import { apiHandler } from "@/api/ApiHandler";
import { useNavigate } from "react-router-dom";

const Section_a = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [showTaskHistory, setShowTaskHistory] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskHistory, setTaskHistory] = useState([]);
  const [taskHistoryLoading, setTaskHistoryLoading] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [addTaskLoading, setAddTaskLoading] = useState(false);
  const [addTaskError, setAddTaskError] = useState("");
  const [newTask, setNewTask] = useState({ title: "", description: "" });
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [editTaskLoading, setEditTaskLoading] = useState(false);
  const [editTaskError, setEditTaskError] = useState("");
  const [editTask, setEditTask] = useState({
    title: "",
    description: "",
    status: "pending",
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTaskLoading, setDeleteTaskLoading] = useState(false);
  const [deleteTaskError, setDeleteTaskError] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const navigate = useNavigate();
  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      try {
        const response = await apiHandler.GetApi(
          api_url.getAllEmployees,
          token
        );
        if (Array.isArray(response)) {
          setMembers(response);
        } else {
          setError(response?.message || "Failed to fetch members");
        }
      } catch (err) {
        setError("Failed to fetch members");
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, []);

  useEffect(() => {
    if (!selectedMember) return;
    if (showTaskHistory) {
      fetchTaskHistory(selectedMember.teamMemberId);
    } else {
      fetchOngoingTasks(selectedMember.teamMemberId);
    }
  }, [selectedMember, showTaskHistory]);

  const fetchOngoingTasks = async (memberId) => {
    setTasksLoading(true);
    setTasks([]);
    setSelectedTask(null);
    const token = localStorage.getItem("token");
    try {
      // Fetch all ongoing tasks and filter by assignedTo
      const response = await apiHandler.GetApi(api_url.getOngoingTasks, token);
      if (Array.isArray(response.tasks)) {
        setTasks(response.tasks.filter((t) => t.assignedTo === memberId));
      } else {
        setTasks([]);
      }
    } catch {
      setTasks([]);
    } finally {
      setTasksLoading(false);
    }
  };

  const fetchTaskHistory = async (memberId) => {
    setTaskHistoryLoading(true);
    setTaskHistory([]);
    setSelectedTask(null);
    const token = localStorage.getItem("token");
    try {
      const response = await apiHandler.GetApi(
        api_url.getTaskHistory + memberId,
        token
      );
      if (Array.isArray(response.tasks)) {
        setTaskHistory(response.tasks);
      } else {
        setTaskHistory([]);
      }
    } catch {
      setTaskHistory([]);
    } finally {
      setTaskHistoryLoading(false);
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    setAddTaskLoading(true);
    setAddTaskError("");
    const token = localStorage.getItem("token");
    try {
      const response = await apiHandler.postApiWithToken(
        api_url.createTask,
        {
          title: newTask.title,
          description: newTask.description,
          assignedTo: selectedMember.teamMemberId,
        },
        token
      );
      if (response?.task) {
        setShowAddTaskModal(false);
        setNewTask({ title: "", description: "" });
        fetchOngoingTasks(selectedMember.teamMemberId);
      } else {
        let errorMsg = "Failed to add task";
        if (response?.message) errorMsg = response.message;
        if (response?.error)
          errorMsg +=
            ": " +
            (typeof response.error === "string"
              ? response.error
              : JSON.stringify(response.error));
        setAddTaskError(errorMsg);
      }
    } catch (err) {
      setAddTaskError(
        err?.message || "Failed to add task (network or server error)"
      );
    } finally {
      setAddTaskLoading(false);
    }
  };

  const handleEditTaskOpen = () => {
    setEditTask({
      title: selectedTask.title,
      description: selectedTask.description,
      status: selectedTask.status || "pending",
    });
    setEditTaskError("");
    setShowEditTaskModal(true);
  };

  const handleEditTask = async (e) => {
    e.preventDefault();
    setEditTaskLoading(true);
    setEditTaskError("");
    const token = localStorage.getItem("token");
    try {
      const response = await apiHandler.PutApi(
        api_url.updateTaskById + selectedTask._id,
        {
          title: editTask.title,
          description: editTask.description,
          status: editTask.status,
        },
        token
      );
      if (
        response?.message?.toLowerCase().includes("updated") ||
        response?.task
      ) {
        setShowEditTaskModal(false);
        setSelectedTask(null);
        fetchOngoingTasks(selectedMember.teamMemberId);
      } else {
        setEditTaskError(response?.message || "Failed to update task");
      }
    } catch (err) {
      setEditTaskError(err?.message || "Failed to update task");
    } finally {
      setEditTaskLoading(false);
    }
  };

  const handleDeleteTask = async () => {
    setDeleteTaskLoading(true);
    setDeleteTaskError("");
    const token = localStorage.getItem("token");
    try {
      const response = await apiHandler.PutApi(
        api_url.updateTaskById + selectedTask._id,
        {
          status: "deleted",
          deletionReason: deleteReason,
        },
        token
      );
      if (
        response?.message?.toLowerCase().includes("deleted") ||
        response?.success
      ) {
        setShowDeleteConfirm(false);
        setSelectedTask(null);
        setDeleteReason("");
        setShowTaskHistory(true);
        // Refresh the page after delete
        window.location.reload();
      } else {
        setDeleteTaskError(response?.message || "Failed to delete task");
      }
    } catch (err) {
      setDeleteTaskError(err?.message || "Failed to delete task");
    } finally {
      setDeleteTaskLoading(false);
    }
  };

  function formatName(name) {
    if (!name) return "";
    return name
      .split(" ")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ");
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar: Members */}
      <div className="w-64 bg-white shadow h-screen overflow-y-auto border-r">
        <h2 className="text-xl font-bold text-gray-800 p-6 pb-2">
          All Team Members
        </h2>
        {loading ? (
          <div className="text-gray-500 p-6">Loading members...</div>
        ) : error ? (
          <div className="text-red-600 p-6">{error}</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {members.map((member, index) => (
              <li
                key={index}
                className={`p-4 hover:bg-gray-50 cursor-pointer ${selectedMember?.teamMemberId === member.teamMemberId
                    ? "bg-blue-50"
                    : ""
                  }`}
                onClick={() => {
                  setSelectedMember(member);
                  setShowTaskHistory(false);
                }}
              >
                <span className="font-medium text-gray-800">
                  {formatName(member.name)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {/* Main Content: Tasks */}
      <div className="flex-1 p-8">
        {selectedMember ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800">
                Tasks for {formatName(selectedMember.name)}
              </h2>
              <button
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                onClick={() => navigate("/CreateTask")}
              >
                <Plus size={18} /> Add Task
              </button>
            </div>
            {/* Ongoing Tasks or Task History */}
            {!showTaskHistory ? (
              <>
                <h3 className="text-lg font-semibold mb-2">Ongoing Tasks</h3>
                {tasksLoading ? (
                  <div className="text-gray-500">Loading tasks...</div>
                ) : tasks.length === 0 ? (
                  <div className="text-gray-500">No ongoing tasks.</div>
                ) : (
                  <ul className="divide-y divide-gray-200 mb-4">
                    {tasks.map((task) => (
                      <li
                        key={task._id}
                        className={`p-4 hover:bg-blue-50 cursor-pointer ${selectedTask?._id === task._id ? "bg-blue-100" : ""
                          }`}
                        onClick={() => setSelectedTask(task)}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-800">
                            {task.title}
                          </span>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                            {task.status}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {task.description}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  className="flex items-center gap-2 text-blue-600 hover:underline mt-4"
                  onClick={() => setShowTaskHistory(true)}
                >
                  <History size={16} /> Task History
                </button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-2">Task History</h3>
                {taskHistoryLoading ? (
                  <div className="text-gray-500">Loading task history...</div>
                ) : taskHistory.length === 0 ? (
                  <div className="text-gray-500">No task history.</div>
                ) : (
                  <ul className="divide-y divide-gray-200 mb-4">
                    {taskHistory.map((task) => (
                      <li
                        key={task._id}
                        className={`p-4 hover:bg-blue-50 cursor-pointer ${selectedTask?._id === task._id ? "bg-blue-100" : ""
                          }`}
                        onClick={() => setSelectedTask(task)}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-800">
                            {task.title}
                          </span>
                          <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                            {task.status}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {task.description}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  className="flex items-center gap-2 text-blue-600 hover:underline mt-4"
                  onClick={() => setShowTaskHistory(false)}
                >
                  <History size={16} /> Back to Ongoing Tasks
                </button>
              </>
            )}
            {/* Task Details */}
            {selectedTask && (
              <div className="mt-6 p-6 bg-white rounded-lg shadow border">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-xl font-bold text-gray-800">
                    {selectedTask.title}
                  </h4>
                  <div className="flex gap-2">
                    <button
                      className="flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200"
                      onClick={handleEditTaskOpen}
                    >
                      <Edit size={16} /> Edit
                    </button>
                    <button
                      className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  </div>
                </div>
                <div className="text-gray-700 mb-2">
                  {selectedTask.description}
                </div>
                <div className="text-sm text-gray-500">
                  <span className="font-semibold">Status:</span>{" "}
                  {selectedTask.status}
                </div>
                <div className="text-sm text-gray-500">
                  <span className="font-semibold">Assigned To:</span>{" "}
                  {selectedTask.assignedTo}
                </div>
                <div className="text-sm text-gray-500">
                  <span className="font-semibold">Created At:</span>{" "}
                  {new Date(selectedTask.createdAt).toLocaleString()}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-gray-500 flex items-center justify-center h-full">
            Select a member to view tasks.
          </div>
        )}
      </div>
      {/* Add Task Modal */}
      {showAddTaskModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={() => setShowAddTaskModal(false)}
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold mb-4">
              Add Task for {formatName(selectedMember.name)}
            </h3>
            <form onSubmit={handleAddTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Title
                </label>
                <input
                  type="text"
                  className="mt-1 block w-full border rounded-md p-2"
                  value={newTask.title}
                  onChange={(e) =>
                    setNewTask({ ...newTask, title: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  className="mt-1 block w-full border rounded-md p-2"
                  value={newTask.description}
                  onChange={(e) =>
                    setNewTask({ ...newTask, description: e.target.value })
                  }
                  required
                />
              </div>
              {addTaskError && (
                <div className="text-red-600 text-sm">{addTaskError}</div>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
                  onClick={() => setShowAddTaskModal(false)}
                  disabled={addTaskLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                  disabled={addTaskLoading}
                >
                  {addTaskLoading ? "Adding..." : "Add Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Task Modal */}
      {showEditTaskModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={() => setShowEditTaskModal(false)}
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold mb-4">Edit Task</h3>
            <form onSubmit={handleEditTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Title
                </label>
                <input
                  type="text"
                  className="mt-1 block w-full border rounded-md p-2"
                  value={editTask.title}
                  onChange={(e) =>
                    setEditTask({ ...editTask, title: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  className="mt-1 block w-full border rounded-md p-2"
                  value={editTask.description}
                  onChange={(e) =>
                    setEditTask({ ...editTask, description: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  className="mt-1 block w-full border rounded-md p-2"
                  value={editTask.status}
                  onChange={(e) =>
                    setEditTask({ ...editTask, status: e.target.value })
                  }
                >
                  <option value="pending">Pending</option>
                  <option value="in progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              {editTaskError && (
                <div className="text-red-600 text-sm">{editTaskError}</div>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
                  onClick={() => setShowEditTaskModal(false)}
                  disabled={editTaskLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                  disabled={editTaskLoading}
                >
                  {editTaskLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Task Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={() => setShowDeleteConfirm(false)}
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold mb-4">Delete Task</h3>
            <p className="mb-2">Are you sure you want to delete this task?</p>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason for deletion
            </label>
            <textarea
              className="w-full border rounded-md p-2 mb-2"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Enter reason for deleting this task"
              required
            />
            {deleteTaskError && (
              <div className="text-red-600 text-sm mb-2">{deleteTaskError}</div>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteTaskLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                onClick={handleDeleteTask}
                disabled={deleteTaskLoading || !deleteReason.trim()}
              >
                {deleteTaskLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Section_a;
