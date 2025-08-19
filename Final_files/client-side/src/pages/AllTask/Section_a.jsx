import React, { useEffect, useState } from "react";
import {
  CalendarDays,
  Users,
  Plus,
  History,
  Edit,
  Trash2,
  X,
  Pencil,
} from "lucide-react";
import { api_url } from "@/api/Api";
import { apiHandler } from "@/api/ApiHandler";
import { useLocation } from "react-router-dom";
import CustomDropDown from "@/components/CustomDropDown";
import CustomDropdown from "@/components/CustomDropDown";

const Section_a = () => {
  const location = useLocation();
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
  const [roles, setRoles] = useState([]);

  const [deleteTaskError, setDeleteTaskError] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [phases, setPhases] = useState([]);
  const [phasesLoading, setPhasesLoading] = useState(false);
  const [selectedPhaseId, setSelectedPhaseId] = useState("");
  // Pinned filters for History view
  const [historyProjectId, setHistoryProjectId] = useState(null);
  const [historyPhaseId, setHistoryPhaseId] = useState("");
  // Toggle states for sections
  const [ongoingSubtasksExpanded, setOngoingSubtasksExpanded] = useState(true);
  const [completedSubtasksExpanded, setCompletedSubtasksExpanded] = useState(true);

  // Prefill from navigation state (e.g., coming from TeamMember detail)
  useEffect(() => {
    if (location && location.state) {
      const { selectedMember: preselectedMember, openAddSubtask } = location.state || {};
      if (preselectedMember && preselectedMember.teamMemberId) {
        setSelectedMember(preselectedMember);
      }
      if (openAddSubtask) {
        setShowAddTaskModal(true);
      }
    }
  }, [location]);
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

  const dropArrayItem = [
    { id: 1, label: "Admin", value: "admin" },
    { id: 2, label: "Manager", value: "manager" },
    { id: 3, label: "Team Lead", value: "teamLead" },
    { id: 3, label: "Team Member", value: "teamMember" },
  ];

  useEffect(() => {
    const fetchRoles = async () => {
      const token = localStorage.getItem("token");
      try {
        const response = await apiHandler.GetApi(api_url.getAllRoles, token);

        if (response && response.success && Array.isArray(response.roles)) {
          setRoles(response.roles);
        } else {
          console.error("Failed to fetch roles:", response);
          setRoles([]);
        }
      } catch (err) {
        console.error("Failed to fetch roles:", err);
        setRoles([]);
      }
    };
    fetchRoles();
  }, []);

  useEffect(() => {
    if (!selectedMember) return;
    fetchProjectsByTeamMember(selectedMember.teamMemberId);
    if (!selectedProject) {
      fetchOngoingTasks(selectedMember.teamMemberId);
      fetchTaskHistory(selectedMember.teamMemberId);
    }
  }, [selectedMember]);

  useEffect(() => {
    if (selectedProject && selectedMember) {
      fetchPhasesForProject(selectedProject.project_id);
      fetchTasksByMemberInProject(
        selectedMember.teamMemberId,
        selectedProject.project_id,
        selectedPhaseId
      );
      fetchTaskHistory(
        selectedMember.teamMemberId,
        selectedProject.project_id,
        selectedPhaseId
      );
    }
  }, [selectedProject, selectedMember, selectedPhaseId]);

  // When only the phase changes, refetch lists (phases already loaded above)
  // Covered by dependency in the effect above

  // After projects load for a selected member, and no project filter, fetch both lists
  useEffect(() => {
    if (!selectedMember) return;
    if (projects.length === 0) return;
    if (!selectedProject) {
      fetchOngoingTasks(selectedMember.teamMemberId);
      fetchTaskHistory(selectedMember.teamMemberId);
    }
  }, [projects, selectedMember, selectedProject]);

  const fetchPhasesForProject = async (projectId) => {
    setPhasesLoading(true);
    setPhases([]);
    const token = localStorage.getItem("token");
    try {
      const res = await apiHandler.GetApi(api_url.getPhases + projectId, token);
      const list = Array.isArray(res?.phases) ? res.phases : [];
      setPhases(list);
    } catch (e) {
      setPhases([]);
    } finally {
      setPhasesLoading(false);
    }
  };

  const toFrontendStatus = (backendStatus) => {
    if (!backendStatus) return "pending";
    const normalized = String(backendStatus).toLowerCase();
    if (normalized.includes("complete")) return "completed";
    if (normalized.includes("progress")) return "in-progress";
    return "pending";
  };

  const mapSubtask = (s, projectId) => ({
    _id: s.subtask_id || s._id || s.id,
    task_id: s.subtask_id || s._id || s.id,
    title: s.subtask_title || s.title || "",
    description: s.description || "",
    status: toFrontendStatus(s.status),
    project: projectId,
    assignedTo: s.assigned_member,
    phase_id: s.phase_id,
    phase_title: s.phase_title,
    createdAt: s.createdAt || s.updatedAt,
  });

  const fetchSubtasksForProject = async (projectId) => {
    const token = localStorage.getItem("token");
    const response = await apiHandler.GetApi(
      api_url.getSubtasks + projectId,
      token
    );
    const subtasks = Array.isArray(response?.subtasks)
      ? response.subtasks
      : [];
    return subtasks.map((s) => mapSubtask(s, projectId));
  };

  const isAssignedToMember = (taskLike, member) => {
    if (!taskLike || !member) return false;
    const assignee = (taskLike.assignedTo || "").toString();
    const tmId = (member.teamMemberId || "").toString();
    const name = member.name || "";
    if (!assignee) return false;
    if (assignee === tmId) return true;
    if (assignee === name) return true;
    if (assignee.toLowerCase && name && assignee.toLowerCase() === name.toLowerCase()) return true;
    if (assignee.toLowerCase && name && assignee.toLowerCase().includes(name.toLowerCase())) return true;
    return false;
  };

  const fetchOngoingTasks = async (memberId) => {
    setTasksLoading(true);
    setTasks([]);
    setSelectedTask(null);
    try {
      const all = [];
      for (const p of projects) {
        // eslint-disable-next-line no-await-in-loop
        const subs = await fetchSubtasksForProject(p.project_id);
        all.push(...subs);
      }
      const filtered = all.filter((t) => isAssignedToMember(t, selectedMember) && t.status !== "completed");
      setTasks(filtered);
    } catch (e) {
      setTasks([]);
    } finally {
      setTasksLoading(false);
    }
  };

  const fetchTaskHistory = async (memberId, projectIdOverride, phaseIdOverride) => {
    setTaskHistoryLoading(true);
    setTaskHistory([]);
    setSelectedTask(null);
    try {
      let pool = [];
      if (projectIdOverride) {
        pool = await fetchSubtasksForProject(projectIdOverride);
      } else {
        const all = [];
        for (const p of projects) {
          // eslint-disable-next-line no-await-in-loop
          const subs = await fetchSubtasksForProject(p.project_id);
          all.push(...subs);
        }
        pool = all;
      }
      const history = pool.filter((t) =>
        isAssignedToMember(t, selectedMember) &&
        (!projectIdOverride || t.project === projectIdOverride) &&
        (!phaseIdOverride || t.phase_id === phaseIdOverride) &&
        t.status === "completed"
      );
      setTaskHistory(history);
    } catch (e) {
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
      if (
        response.message &&
        (response.message.includes("No projects found") ||
          response.message.includes(
            "No projects found for the given teamMemberId"
          ))
      ) {
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

  const fetchTasksByMemberInProject = async (memberId, projectId, phaseIdOverride) => {
    setTasksLoading(true);
    setTasks([]);
    setSelectedTask(null);
    try {
      const subs = await fetchSubtasksForProject(projectId);
      const filtered = subs.filter(
        (t) =>
          isAssignedToMember(t, selectedMember) &&
          (!phaseIdOverride || t.phase_id === phaseIdOverride) &&
          t.status !== "completed"
      );
      setTasks(filtered);
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
      if (!selectedProject || !selectedPhaseId) {
        setAddTaskError("Please select a project and phase.");
        return;
      }
      const payload = {
        subtask_title: newTask.title,
          description: newTask.description,
        assigned_member: selectedMember.teamMemberId,
        phase_id: selectedPhaseId,
      };
      const response = await apiHandler.postApiWithToken(
        api_url.addSubtask,
        payload,
        token
      );
      if (response?.success) {
        setShowAddTaskModal(false);
        setNewTask({ title: "", description: "" });
        fetchOngoingTasks(selectedMember.teamMemberId);
      } else {
        let errorMsg = "Failed to add subtask";
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
      setAddTaskError(err?.message || "Failed to add subtask (network or server error)");
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
      const statusMapOut = {
        pending: "Pending",
        "in progress": "In Progress",
        "in-progress": "In Progress",
        completed: "Completed",
      };
      if (editTask.status) {
        await apiHandler.postApiWithToken(
          api_url.updateSubtaskStatus,
          { subtask_id: selectedTask.task_id, status: statusMapOut[editTask.status] || editTask.status },
          token
        );
      }
      const response = await apiHandler.postApiWithToken(
        api_url.editSubtask,
        {
          subtask_id: selectedTask.task_id,
          subtask_title: editTask.title,
          description: editTask.description,
        },
        token
      );
      if (response?.success || response?.message?.toLowerCase().includes("updated")) {
        setShowEditTaskModal(false);
        setSelectedTask(null);
        fetchOngoingTasks(selectedMember.teamMemberId);
      } else {
        setEditTaskError(response?.message || "Failed to update subtask");
      }
    } catch (err) {
      setEditTaskError(err?.message || "Failed to update subtask");
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
        api_url.deleteSubtask,
        { subtask_id: selectedTask.task_id },
        token
      );

      if (response?.success || response?.message?.toLowerCase().includes("deleted")) {
        setShowDeleteConfirm(false);
        setSelectedTask(null);
        setDeleteReason("");
        setShowTaskHistory(true);
        fetchOngoingTasks(selectedMember.teamMemberId);
      } else {
        setDeleteTaskError(response?.message || "Failed to delete subtask");
      }
    } catch (err) {
      setDeleteTaskError(err?.message || "Failed to delete subtask");
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
  const teamMembers = roles.map((role) => ({
    id: role.value,
    label: role.label,
  }));
  const handleRoleSelect = (item) => {
    console.log(item, "item----------->");

    setSelectedRole(item?.value);
  };

  const filteredMembers = members.filter((member) => {
    console.log(member.role, "----------hhhhhhh>"); // debug
    return member.role === selectedRole; // filter condition
  });

  const filteredMembersBySearch = filteredMembers.filter((member) =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Function to get project name by project ID
  const getProjectNameById = (projectId) => {
    if (!projectId || !projects.length) return "Unknown Project";
    const project = projects.find((p) => p.project_id === projectId);
    return project ? project.project_name : "Unknown Project";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex">
      {/* Sidebar: Members */}
      <div className="w-80 bg-white/90 backdrop-blur-sm shadow-xl h-screen overflow-y-auto border-r border-gray-200">
        <div className="p-6">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Team Members
            </h2>
            <p className="text-gray-600 text-sm">
              Select a member to view their tasks
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <CustomDropdown
                title="Select Team Role"
                items={dropArrayItem}
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
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            selectedMember?._id === member._id
                              ? "bg-white/20 text-white"
                              : "bg-gradient-to-br from-blue-500 to-purple-600 text-white"
                          }`}
                        >
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
                    Subtasks for {formatName(selectedMember?.name)}
                  </h1>
                  <p className="text-gray-600">
                    Manage and track subtask progress
                  </p>
                </div>
                <button
                   className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
                   onClick={() => setShowAddTaskModal(true)}
                   disabled={!selectedMember}
                   title={!selectedMember ? "Please select a team member first" : ""}
                >
                  <Plus size={18} /> Add Subtask
                </button>
              </div>

              {/* Project Selection */}
              {!showTaskHistory && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Filter by Project
                    </label>
                    {projectsLoading ? (
                      <div className="text-gray-500 text-sm">
                        Loading projects...
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <select
                          value={
                            selectedProject ? selectedProject.project_id : ""
                          }
                          onChange={(e) => {
                            const project = projects.find((p) => p.project_id === e.target.value);
                            setSelectedProject(project || null);
                            setSelectedPhaseId("");
                            setPhases([]);
                          }}
                          className="flex-1 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 bg-white"
                        >
                          <option value="">Select a project</option>
                          {projects.map((project) => (
                            <option
                              key={project.project_id}
                              value={project.project_id}
                            >
                              {project.project_name}
                            </option>
                          ))}
                        </select>
                        {selectedProject && (
                          <button
                            onClick={() => {
                              setSelectedProject(null);
                              setSelectedPhaseId("");
                              setPhases([]);
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
                {selectedProject && (
                  <div className="mt-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Select Phase for adding subtask
                    </label>
                    {phasesLoading ? (
                      <div className="text-gray-500 text-sm">Loading phases...</div>
                    ) : (
                      <select
                        value={selectedPhaseId}
                        onChange={(e) => setSelectedPhaseId(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 bg-white"
                      >
                        <option value="">Select a phase</option>
                        {(phases || []).map((ph) => (
                          <option key={ph.phase_id} value={ph.phase_id}>
                            {ph.title}
                          </option>
                        ))}
                      </select>
                    )}
              </div>
                )}
              </div>
              )}
            </div>

            {
              // Ongoing Subtasks section
            }
              <>
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                     <button
                       onClick={() => setOngoingSubtasksExpanded(!ongoingSubtasksExpanded)}
                       className="flex items-center gap-2 text-xl font-bold text-gray-800 hover:text-blue-600 transition-colors duration-200 cursor-pointer"
                     >
                       <span>
                      {selectedProject
                           ? `Ongoing Subtasks in ${selectedProject.project_name}`
                        : "Ongoing Subtasks"}
                       </span>
                       <span className="text-lg">
                         {ongoingSubtasksExpanded ? "▼" : "▶"}
                       </span>
                     </button>
                  </div>

                                     {ongoingSubtasksExpanded && (
                     <>
                  {tasksLoading ? (
                    <div className="text-center py-12">
                      <div className="inline-flex items-center gap-3 text-gray-500">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        Loading subtasks...
                      </div>
                    </div>
                  ) : tasks.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="bg-gray-50 rounded-2xl p-8 max-w-md mx-auto">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <CalendarDays size={24} className="text-gray-400" />
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">
                          No subtasks found
                        </h4>
                        <p className="text-gray-500 text-sm">
                          {selectedProject
                            ? `No subtasks found in ${selectedProject.project_name}`
                            : "No ongoing subtasks for this member."}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {tasks.map((task) => (
                        <div key={task._id}>
                          <div
                            className={`p-6 rounded-2xl border transition-all duration-300 cursor-pointer ${
                              selectedTask?._id === task._id
                                ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-lg"
                                : "bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300"
                            }`}
                            onClick={() =>
                              setSelectedTask(
                                selectedTask?._id === task._id ? null : task
                              )
                            }
                          >
                            <div className="flex justify-between items-start mb-3">
                              <h4 className="font-bold text-gray-900 capitalize text-lg">
                                {task.title}
                              </h4>
                              <span
                                className={`text-xs px-3 py-1 rounded-full font-semibold capitalize ${
                                  task.status === "completed"
                                    ? "bg-green-100 text-green-700"
                                    : task.status === "in-progress"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {task.status}
                              </span>
                            </div>
                            <p className="text-gray-600 text-sm leading-relaxed">
                              {task.description}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs font-medium text-gray-500">
                                Project:
                              </span>
                              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                                {getProjectNameById(task.project)}
                              </span>
                            </div>
                          </div>

                          {/* Subtask Details - Appears directly below the selected subtask */}
                          {selectedTask?._id === task._id && (
                            <div className="mt-4 p-6 bg-white rounded-2xl shadow-lg border border-gray-200">
                              <div className="flex justify-between items-center mb-4">
                                <h4 className="text-xl font-bold text-gray-800">
                                  {selectedTask.title}
                                </h4>
                                <div className="flex gap-2">
                                  <button
                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-400 to-indigo-400 text-white rounded-lg hover:from-blue-500 hover:to-indigo-500 transition-all duration-200 shadow-md hover:shadow-lg"
                                         onClick={handleEditTaskOpen}
                                  >
                                    <Edit size={16} /> Edit
                                  </button>
                                  <button
                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-400 to-gray-500 text-white rounded-lg hover:from-gray-500 hover:to-gray-600 transition-all duration-200 shadow-md hover:shadow-lg"
                                    onClick={() => setShowDeleteConfirm(true)}
                                  >
                                    <Trash2 size={16} /> Delete
                                  </button>
                                </div>
                              </div>
                              <div className="space-y-3">
                                <div className="text-gray-700">
                                  <span className="font-semibold text-gray-800">
                                    Description:
                                  </span>
                                  <p className="mt-1 text-gray-600 leading-relaxed">
                                    {selectedTask.description}
                                  </p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-gray-700">
                                      Status:
                                    </span>
                                    <span
                                      className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                                        selectedTask.status === "completed"
                                          ? "bg-green-100 text-green-700"
                                          : selectedTask.status ===
                                            "in-progress"
                                          ? "bg-blue-100 text-blue-700"
                                          : "bg-gray-100 text-gray-700"
                                      }`}
                                    >
                                      {selectedTask.status}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-gray-700">
                                      Assigned To:
                                    </span>
                                    <span className="text-gray-600">
                                      {selectedTask.assignedTo}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-gray-700">
                                      Project:
                                    </span>
                                    <span className="text-gray-600">
                                      {getProjectNameById(selectedTask.project)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-gray-700">
                                      Created At:
                                    </span>
                                    <span className="text-gray-600">
                                      {new Date(
                                        selectedTask.createdAt
                                      ).toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                       )}
                     </>
                  )}
                </div>
                {/* Completed Subtasks section */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-100">
                                     <div className="flex items-center gap-3 mb-6">
                     <div className="w-1 h-6 bg-gradient-to-b from-green-500 to-emerald-500 rounded-full"></div>
                <button
                       onClick={() => setCompletedSubtasksExpanded(!completedSubtasksExpanded)}
                       className="flex items-center gap-2 text-xl font-bold text-gray-800 hover:text-green-600 transition-colors duration-200 cursor-pointer"
                     >
                       <span>
                         {selectedProject
                           ? `Completed Subtasks in ${selectedProject.project_name}`
                           : "Completed Subtasks"}
                       </span>
                       <span className="text-lg">
                         {completedSubtasksExpanded ? "▼" : "▶"}
                       </span>
                </button>
                   </div>
                                     {completedSubtasksExpanded && (
              <>
                {taskHistoryLoading ? (
                         <div className="text-gray-500">Loading completed subtasks...</div>
                ) : taskHistory.length === 0 ? (
                         <div className="text-gray-500">No completed subtasks.</div>
                ) : (
                         <div className="space-y-4">
                    {taskHistory.map((task) => (
                             <div key={task._id}>
                               <div
                                 className={`p-6 rounded-2xl border transition-all duration-300 cursor-pointer ${
                                   selectedTask?._id === task._id
                                     ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-lg"
                                     : "bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300"
                                 }`}
                                 onClick={() =>
                                   setSelectedTask(
                                     selectedTask?._id === task._id ? null : task
                                   )
                                 }
                               >
                                 <div className="flex justify-between items-start mb-3">
                                   <h4 className="font-bold text-gray-900 capitalize text-lg">
                            {task.title}
                                   </h4>
                                   <span
                                     className={`text-xs px-3 py-1 rounded-full font-semibold capitalize ${
                                       task.status === "completed"
                                         ? "bg-green-100 text-green-700"
                                         : task.status === "in-progress"
                                         ? "bg-blue-100 text-blue-700"
                                         : "bg-gray-100 text-gray-700"
                                     }`}
                                   >
                            {task.status}
                          </span>
                        </div>
                                 <p className="text-gray-600 text-sm leading-relaxed">
                          {task.description}
                                 </p>
                                 <div className="flex items-center gap-2 mt-2">
                                   <span className="text-xs font-medium text-gray-500">
                                     Project:
                                   </span>
                                   <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                                     {getProjectNameById(task.project)}
                                   </span>
                        </div>
                               </div>

                               {/* Subtask Details - Appears directly below the selected subtask */}
                               {selectedTask?._id === task._id && (
                                 <div className="mt-4 p-6 bg-white rounded-2xl shadow-lg border border-gray-200">
                                   <div className="flex justify-between items-center mb-4">
                                     <h4 className="text-xl font-bold text-gray-800">
                                       {selectedTask.title}
                                     </h4>
                                     <div className="flex gap-2">
                <button
                                         className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-400 to-indigo-400 text-white rounded-lg hover:from-blue-500 hover:to-indigo-500 transition-all duration-200 shadow-md hover:shadow-lg"
                                         onClick={handleEditTaskOpen}
                >
                                         <Edit size={16} /> Edit
                </button>
                                       <button
                                         className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-400 to-gray-500 text-white rounded-lg hover:from-gray-500 hover:to-gray-600 transition-all duration-200 shadow-md hover:shadow-lg"
                                         onClick={() => setShowDeleteConfirm(true)}
                                       >
                                         <Trash2 size={16} /> Delete
                                       </button>
                                     </div>
                                   </div>
                                   <div className="space-y-3">
                                     <div className="text-gray-700">
                                       <span className="font-semibold text-gray-800">
                                         Description:
                                       </span>
                                       <p className="mt-1 text-gray-600 leading-relaxed">
                                         {selectedTask.description}
                                       </p>
                                     </div>
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                       <div className="flex items-center gap-2">
                                         <span className="font-semibold text-gray-700">
                                           Status:
                                         </span>
                                         <span
                                           className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                                             selectedTask.status === "completed"
                                               ? "bg-green-100 text-green-700"
                                               : selectedTask.status ===
                                                 "in-progress"
                                               ? "bg-blue-100 text-blue-700"
                                               : "bg-gray-100 text-gray-700"
                                           }`}
                                         >
                                           {selectedTask.status}
                                         </span>
                                       </div>
                                       <div className="flex items-center gap-2">
                                         <span className="font-semibold text-gray-700">
                                           Assigned To:
                                         </span>
                                         <span className="text-gray-600">
                                           {selectedTask.assignedTo}
                                         </span>
                                       </div>
                                       <div className="flex items-center gap-2">
                                         <span className="font-semibold text-gray-700">
                                           Project:
                                         </span>
                                         <span className="text-gray-600">
                                           {getProjectNameById(selectedTask.project)}
                                         </span>
                                       </div>
                                       <div className="flex items-center gap-2">
                                         <span className="font-semibold text-gray-700">
                                           Created At:
                                         </span>
                                         <span className="text-gray-600">
                                           {new Date(
                                             selectedTask.createdAt
                                           ).toLocaleString()}
                                         </span>
                                       </div>
                                     </div>
                                   </div>
                                 </div>
                               )}
                             </div>
                           ))}
                         </div>
                       )}
              </>
            )}
                </div>
              </>
          </>
        ) : (
          <>
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    All Subtasks
                  </h1>
                  <p className="text-gray-600">
                    Manage and track subtask progress across all team members
                  </p>
                </div>
                <button
                   className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
                   onClick={() => setShowAddTaskModal(true)}
                   disabled={!selectedMember}
                   title={!selectedMember ? "Please select a team member first" : ""}
                >
                  <Plus size={18} /> Add Subtask
                </button>
              </div>
            </div>

            <div className="text-center py-20">
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-12 max-w-md mx-auto shadow-xl border border-gray-100">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users size={32} className="text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Welcome to All Subtasks
                </h3>
                <p className="text-gray-600 text-lg mb-6">
                  Select a team member from the sidebar to view and manage their
                  subtasks.
                </p>
                <div className="flex items-center justify-center gap-2 text-gray-500">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span className="text-sm">
                    Choose a role and member to get started
                  </span>
                </div>
              </div>
            </div>
          </>
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
              Add Subtask for {formatName(selectedMember.name)}
            </h3>
            <form onSubmit={handleAddTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project
                </label>
                <select
                  className="mt-1 block w-full border rounded-md p-2"
                  value={selectedProject ? selectedProject.project_id : ""}
                  onChange={(e) => {
                    const project = projects.find((p) => p.project_id === e.target.value);
                    setSelectedProject(project || null);
                    if (project) {
                      fetchPhasesForProject(project.project_id);
                    } else {
                      setPhases([]);
                      setSelectedPhaseId("");
                    }
                  }}
                  required
                >
                  <option value="">Select a project</option>
                  {projects.map((project) => (
                    <option key={project.project_id} value={project.project_id}>
                      {project.project_name}
                    </option>
                  ))}
                </select>
              </div>
              {selectedProject && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phase
                  </label>
                  {phasesLoading ? (
                    <div className="text-sm text-gray-500">Loading phases...</div>
                  ) : (
                    <select
                      className="mt-1 block w-full border rounded-md p-2"
                      value={selectedPhaseId}
                      onChange={(e) => setSelectedPhaseId(e.target.value)}
                      required
                    >
                      <option value="">Select a phase</option>
                      {(phases || []).map((ph) => (
                        <option key={ph.phase_id} value={ph.phase_id}>
                          {ph.title}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
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
                  {addTaskLoading ? "Adding..." : "Add Subtask"}
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
            <h3 className="text-lg font-bold mb-4">Edit Subtask</h3>
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
      {/* Delete Subtask Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={() => setShowDeleteConfirm(false)}
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold mb-4">Delete Subtask</h3>
            <p className="mb-2">Are you sure you want to delete this subtask?</p>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason for deleting this subtask
            </label>
            <textarea
              className="w-full border rounded-md p-2 mb-2"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Optional: add a reason for deleting this subtask"
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
                disabled={deleteTaskLoading}
              >
                {deleteTaskLoading ? "Deleting..." : "Delete Subtask"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Section_a;
