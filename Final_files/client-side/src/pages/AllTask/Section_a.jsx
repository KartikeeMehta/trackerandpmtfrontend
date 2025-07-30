import React, { useEffect, useState } from "react";
import {
  CalendarDays,
  Users,
  Plus,
  History,
  Edit,
  Trash2,
  X,
  Pencil
} from "lucide-react";
import { api_url } from "@/api/Api";
import { apiHandler } from "@/api/ApiHandler";
import { useNavigate } from "react-router-dom";
import CustomDropDown from "@/components/CustomDropDown";
import CustomDropdown from "@/components/CustomDropDown";

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
  const [selectedRole, setSelectedRole] = useState("");

  const [deleteTaskError, setDeleteTaskError] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectsLoading, setProjectsLoading] = useState(false);

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
        console.log(response, "respose=======>");

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
    fetchProjectsByTeamMember(selectedMember.teamMemberId);
    if (showTaskHistory) {
      fetchTaskHistory(selectedMember.teamMemberId);
    } else if (!selectedProject) {
      fetchOngoingTasks(selectedMember.teamMemberId);
    }
  }, [selectedMember, showTaskHistory]);

  useEffect(() => {
    if (selectedProject && selectedMember) {
      fetchTasksByMemberInProject(selectedMember.teamMemberId, selectedProject.project_id);
    }
  }, [selectedProject, selectedMember]);

  const fetchOngoingTasks = async (memberId) => {
    setTasksLoading(true);
    setTasks([]);
    setSelectedTask(null);
    const token = localStorage.getItem("token");
    try {
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

  const fetchProjectsByTeamMember = async (memberId) => {
    setProjectsLoading(true);
    setProjects([]);
    setSelectedProject(null);
    const token = localStorage.getItem("token");
    try {
      console.log("Fetching projects for memberId:", memberId);
      const response = await apiHandler.GetApi(
        api_url.getProjectsByTeamMember + memberId + "/projects",
        token
      );
      console.log("Projects response:", response);
      console.log("Response type:", typeof response);
      console.log("Response keys:", Object.keys(response));
      
      // Check if response contains an error message
      if (response.message && (response.message.includes("No projects found") || response.message.includes("No projects found for the given teamMemberId"))) {
        console.log("No projects found for this team member");
        setProjects([]);
      } else if (Array.isArray(response.projects)) {
        setProjects(response.projects);
      } else {
        console.log("No projects array in response:", response);
        setProjects([]);
      }
    } catch (err) {
      console.error("Error fetching projects:", err);
      // Handle 404 error gracefully - just set empty projects array
      setProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  };

  const fetchTasksByMemberInProject = async (memberId, projectId) => {
    setTasksLoading(true);
    setTasks([]);
    setSelectedTask(null);
    const token = localStorage.getItem("token");
    try {
      const response = await apiHandler.GetApi(
        api_url.getTasksByMemberInProject + memberId + "/project/" + projectId,
        token
      );
      if (Array.isArray(response.tasks)) {
        setTasks(response.tasks);
      } else {
        setTasks([]);
      }
    } catch (err) {
      console.error("Error fetching tasks:", err);
      setTasks([]);
    } finally {
      setTasksLoading(false);
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
      const response = await apiHandler.postApiWithToken(
        api_url.deleteTaskById + selectedTask.task_id,
        {
          reason: deleteReason,
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
  const teamMembers = [
    { id: 'teamMember', label: 'teamMember' },
    { id: 'teamLead', label: 'teamLead' },
    { id: 'admin', label: 'admin' },
  ];
  const handleRoleSelect = (item) => {

    setSelectedRole(item.label);
  };

  const filteredMembers = members.filter((member) => member.role === selectedRole);


  const filteredMembersBySearch = filteredMembers.filter((member) =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex">
      {/* Sidebar: Members */}
      <div className="w-80 bg-white/90 backdrop-blur-sm shadow-xl h-screen overflow-y-auto border-r border-gray-200">
        <div className="p-6">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Team Members</h2>
            <p className="text-gray-600 text-sm">Select a member to view their tasks</p>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <CustomDropdown
                title="Select Team Role"
                items={teamMembers}
                itemKey="id"
                itemLabel="label"
                onClick={handleRoleSelect}
                className="w-full"
              />
            </div>

            {selectedRole !== "" && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-4 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                  <h3 className="font-bold text-gray-800 capitalize">
                    All {selectedRole}
                  </h3>
                </div>

                {/* Search Input */}
                <div className="relative mb-4">
                  <input
                    type="text"
                    placeholder="Search members..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 bg-gray-50"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    🔍
                  </span>
                </div>

                {/* Members List */}
                {filteredMembersBySearch.length > 0 && (
                  <div className="space-y-2">
                    {filteredMembersBySearch.map((member) => (
                      <button
                        key={member._id}
                        onClick={() => {
                          setSelectedMember(member);
                          setShowTaskHistory(false);
                        }}
                        className={`w-full text-left p-3 rounded-xl transition-all duration-200 flex items-center gap-3 ${
                          selectedMember?._id === member._id
                            ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg"
                            : "bg-gray-50 hover:bg-gray-100 text-gray-700"
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          selectedMember?._id === member._id
                            ? "bg-white/20 text-white"
                            : "bg-gradient-to-br from-blue-500 to-purple-600 text-white"
                        }`}>
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">{member.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* {loading ? (
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
        )}  */}
      </div>
      {/* Main Content: Tasks */}
      <div className="flex-1 p-8">
        {selectedMember ? (
          <>
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Tasks for {formatName(selectedMember.name)}
                  </h1>
                  <p className="text-gray-600">Manage and track task progress</p>
                </div>
                <button
                  className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  onClick={() => navigate("/CreateTask")}
                >
                  <Plus size={18} /> Add Task
                </button>
              </div>

              {/* Project Selection */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Filter by Project
                    </label>
                    {projectsLoading ? (
                      <div className="text-gray-500 text-sm">Loading projects...</div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <select
                          value={selectedProject ? selectedProject.project_id : ""}
                          onChange={(e) => {
                            const project = projects.find(p => p.project_id === e.target.value);
                            setSelectedProject(project);
                          }}
                          className="flex-1 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 bg-white"
                        >
                          <option value="">Select a project</option>
                          {projects.map((project) => (
                            <option key={project.project_id} value={project.project_id}>
                              {project.project_name}
                            </option>
                          ))}
                        </select>
                        {selectedProject && (
                          <button
                            onClick={() => {
                              setSelectedProject(null);
                              fetchOngoingTasks(selectedMember.teamMemberId);
                            }}
                            className="px-4 py-3 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
           
            
            {!showTaskHistory ? (
              <>
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                    <h3 className="text-xl font-bold text-gray-800">
                      {selectedProject ? `Tasks in ${selectedProject.project_name}` : "Ongoing Tasks"}
                    </h3>
                  </div>
                  
                  {tasksLoading ? (
                    <div className="text-center py-12">
                      <div className="inline-flex items-center gap-3 text-gray-500">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        Loading tasks...
                      </div>
                    </div>
                  ) : tasks.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="bg-gray-50 rounded-2xl p-8 max-w-md mx-auto">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <CalendarDays size={24} className="text-gray-400" />
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">No tasks found</h4>
                        <p className="text-gray-500 text-sm">
                          {selectedProject 
                            ? `No tasks found in ${selectedProject.project_name}`
                            : "No ongoing tasks for this member."}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {tasks.map((task) => (
                        <div
                          key={task._id}
                          className={`p-6 rounded-2xl border transition-all duration-300 cursor-pointer ${
                            selectedTask?._id === task._id 
                              ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-lg" 
                              : "bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300"
                          }`}
                          onClick={() => setSelectedTask(task)}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <h4 className="font-bold text-gray-900 capitalize text-lg">
                              {task.title}
                            </h4>
                            <span className={`text-xs px-3 py-1 rounded-full font-semibold capitalize ${
                              task.status === 'completed' 
                                ? 'bg-green-100 text-green-700'
                                : task.status === 'in-progress'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {task.status}
                            </span>
                          </div>
                          <p className="text-gray-600 text-sm leading-relaxed">
                            {task.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <button
                  className="flex items-center gap-3 text-blue-600 hover:text-blue-700 font-semibold transition-all duration-200 hover:scale-105"
                  onClick={() => setShowTaskHistory(true)}
                >
                  <History size={18} /> Task History
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

                      onClick={() => {
                        if (selectedMember) {
                          navigate("/EditTask", {
                            state: {
                              taskDetails: selectedTask,
                            },
                          });
                        } else {
                          console.warn("No member selected to edit.");
                        }
                      }}
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
          <div className="text-center py-20">
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-12 max-w-md mx-auto shadow-xl border border-gray-100">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users size={32} className="text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Welcome to All Tasks</h3>
              <p className="text-gray-600 text-lg mb-6">
                Select a team member from the sidebar to view and manage their tasks.
              </p>
              <div className="flex items-center justify-center gap-2 text-gray-500">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-sm">Choose a role and member to get started</span>
              </div>
            </div>
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
      {showEditTaskModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={() => setShowEditTaskModal(false)}
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold mb-4">Edit Task ssss</h3>
            <form className="space-y-4">
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
