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
  CheckCircle,
  Play,
  Clock,
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
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    dueDate: "",
    priority: "Low",
  });
  const [selectedImages, setSelectedImages] = useState([]);
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
  const [userRole, setUserRole] = useState("");
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [leadMembers, setLeadMembers] = useState([]);
  const [leadSearch, setLeadSearch] = useState("");
  const [permissionToast, setPermissionToast] = useState("");

  const [deleteTaskError, setDeleteTaskError] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [phases, setPhases] = useState([]);
  const [phasesLoading, setPhasesLoading] = useState(false);
  const [selectedPhaseId, setSelectedPhaseId] = useState("");
  // Drag & drop state for subtasks
  const [draggedTask, setDraggedTask] = useState(null);
  // General subtasks state
  const [generalTasks, setGeneralTasks] = useState([]);
  const [generalLoading, setGeneralLoading] = useState(false);
  const [selectedGeneralTask, setSelectedGeneralTask] = useState(null);
  const [generalOngoingExpanded, setGeneralOngoingExpanded] = useState(true);
  const [generalCompletedExpanded, setGeneralCompletedExpanded] =
    useState(true);
  // Pinned filters for History view
  const [historyProjectId, setHistoryProjectId] = useState(null);
  const [historyPhaseId, setHistoryPhaseId] = useState("");
  // Toggle states for sections
  const [ongoingSubtasksExpanded, setOngoingSubtasksExpanded] = useState(false);
  const [completedSubtasksExpanded, setCompletedSubtasksExpanded] =
    useState(false);

  // Prefill from navigation state (e.g., coming from TeamMember detail)
  useEffect(() => {
    if (location && location.state) {
      const { selectedMember: preselectedMember, openAddSubtask } =
        location.state || {};
      if (preselectedMember && preselectedMember.teamMemberId) {
        setSelectedMember(preselectedMember);
      }
      if (openAddSubtask) {
        setShowAddTaskModal(true);
      }
    }
  }, [location]);

  // Determine current user's role and employee info
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const userType = localStorage.getItem("userType");
    const storedEmployee = localStorage.getItem("employee");

    // Primary source: 'user' (set on both owner/admin and employee login)
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        const role = u.role || (userType === "employee" ? u.role : undefined);
        setUserRole(role || "owner");

        // If this is an employee login, set currentEmployee from 'user'
        if (userType === "employee") {
          setCurrentEmployee(u);
          const roleLc = (u.role || "").toLowerCase();
          if (roleLc === "teammember" || roleLc === "teamlead") {
            setSelectedMember(u);
          }
        }
        return;
      } catch {
        // fall through
      }
    }

    // Fallback legacy key: 'employee'
    if (storedEmployee) {
      try {
        const e = JSON.parse(storedEmployee);
        setUserRole(e.role || "teamMember");
        setCurrentEmployee(e);
        const roleLc = (e.role || "").toLowerCase();
        if (roleLc === "teammember" || roleLc === "teamlead") {
          setSelectedMember(e);
        }
        return;
      } catch {
        // ignore
      }
    }

    // Default if no info found
    setUserRole("owner");
  }, []);

  // For team leads, fetch their team members only (robust matching)
  useEffect(() => {
    if (userRole !== "teamLead" || !currentEmployee) return;
    const token = localStorage.getItem("token");
    (async () => {
      try {
        const res = await apiHandler.GetApi(api_url.getAllTeams, token);
        const teams = Array.isArray(res?.teams) ? res.teams : [];
        const myTeams = teams.filter((t) => {
          const lead = t?.teamLead || {};
          const byTeamMemberId =
            !!lead.teamMemberId &&
            !!currentEmployee.teamMemberId &&
            lead.teamMemberId === currentEmployee.teamMemberId;
          const byId =
            !!lead._id &&
            !!currentEmployee._id &&
            lead._id === currentEmployee._id;
          const byName =
            !!lead.name &&
            !!currentEmployee.name &&
            String(lead.name).toLowerCase() ===
              String(currentEmployee.name).toLowerCase();
          return byTeamMemberId || byId || byName;
        });
        const aggregated = myTeams.flatMap((t) =>
          Array.isArray(t?.members) ? t.members : []
        );
        const seen = new Set();
        const uniqueMembers = aggregated.filter((m) => {
          const key = m.teamMemberId || m._id || m.email;
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setLeadMembers(uniqueMembers);
      } catch (e) {
        setLeadMembers([]);
      }
    })();
  }, [userRole, currentEmployee]);
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

  // Fetch general subtasks for admin/manager with visibility rules
  useEffect(() => {
    const doFetch = async () => {
      if (!selectedMember) return;
      const role = (selectedMember.role || "").toLowerCase();
      // Only admins and managers have general subtasks
      if (role !== "admin" && role !== "manager") {
        setGeneralTasks([]);
        return;
      }
      setGeneralLoading(true);
      const token = localStorage.getItem("token");
      try {
        const res = await apiHandler.GetApi(
          api_url.getGeneralSubtasks + selectedMember.teamMemberId,
          token
        );
        const list = Array.isArray(res?.generalSubtasks)
          ? res.generalSubtasks
          : [];
        // Map to UI shape
        const mapped = list.map((s) => ({
          _id: s.subtask_id,
          task_id: s.subtask_id,
          title: s.subtask_title,
          description: s.description,
          priority: s.priority || "Low",
          status: toFrontendStatus(s.status),
          createdAt: s.createdAt,
          general: true,
        }));
        setGeneralTasks(mapped);
      } catch (e) {
        setGeneralTasks([]);
      } finally {
        setGeneralLoading(false);
      }
    };
    doFetch();
  }, [selectedMember]);

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
    if (normalized.includes("pause")) return "paused";
    if (normalized.includes("progress")) return "in-progress";
    return "pending";
  };

  const mapSubtask = (s, projectId) => ({
    _id: s.subtask_id || s._id || s.id,
    task_id: s.subtask_id || s._id || s.id,
    title: s.subtask_title || s.title || "",
    description: s.description || "",
    priority: s.priority || "Low",
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
    const subtasks = Array.isArray(response?.subtasks) ? response.subtasks : [];
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
    if (
      assignee.toLowerCase &&
      name &&
      assignee.toLowerCase() === name.toLowerCase()
    )
      return true;
    if (
      assignee.toLowerCase &&
      name &&
      assignee.toLowerCase().includes(name.toLowerCase())
    )
      return true;
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
      const filtered = all.filter(
        (t) => isAssignedToMember(t, selectedMember) && t.status !== "completed"
      );
      setTasks(filtered);
    } catch (e) {
      setTasks([]);
    } finally {
      setTasksLoading(false);
    }
  };

  const fetchTaskHistory = async (
    memberId,
    projectIdOverride,
    phaseIdOverride
  ) => {
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
      const history = pool.filter(
        (t) =>
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

  const fetchTasksByMemberInProject = async (
    memberId,
    projectId,
    phaseIdOverride
  ) => {
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
      const privileged =
        (userRole || "").toLowerCase() === "owner" ||
        (userRole || "").toLowerCase() === "admin" ||
        (userRole || "").toLowerCase() === "manager";
      if (!privileged && (!selectedProject || !selectedPhaseId)) {
        setAddTaskError("Please select a project and phase.");
        return;
      }
      // Use FormData to support optional image uploads similar to PhaseDetails
      const formData = new FormData();
      formData.append("subtask_title", newTask.title);
      formData.append("description", newTask.description);
      formData.append("assigned_member", selectedMember.teamMemberId);
      if (selectedPhaseId) formData.append("phase_id", selectedPhaseId);
      formData.append("priority", newTask.priority || "Low");
      if (newTask.dueDate) formData.append("dueDate", newTask.dueDate);
      if (selectedImages.length > 0) {
        selectedImages.forEach((file) => formData.append("images", file));
      }
      const response = await apiHandler.imageUpload(
        api_url.addSubtask,
        formData,
        token
      );
      if (response?.success) {
        setShowAddTaskModal(false);
        setNewTask({
          title: "",
          description: "",
          dueDate: "",
          priority: "Low",
        });
        setSelectedImages([]);
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
      setAddTaskError(
        err?.message || "Failed to add subtask (network or server error)"
      );
    } finally {
      setAddTaskLoading(false);
    }
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    // Enforce max 2 images
    const combined = [...selectedImages, ...files].slice(0, 2);
    setSelectedImages(combined);
  };

  const removeSelectedImage = (index) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEditTaskOpen = () => {
    if (
      (userRole || "").toLowerCase() === "teammember" &&
      selectedMember?.teamMemberId &&
      currentEmployee?.teamMemberId &&
      selectedMember.teamMemberId !== currentEmployee.teamMemberId
    ) {
      setPermissionToast(
        "You are not allowed to change the status of other members"
      );
      setTimeout(() => setPermissionToast(""), 2500);
      return;
    }
    setEditTask({
      title: selectedTask.title,
      description: selectedTask.description,
      status: selectedTask.status || "pending",
      dueDate: selectedTask.dueDate || "",
    });
    setEditTaskError("");
    setShowEditTaskModal(true);
  };

  const handleEditTask = async (e) => {
    e.preventDefault();
    const isTeamMember = (userRole || "").toLowerCase() === "teammember";
    const isSelf =
      selectedMember?.teamMemberId &&
      currentEmployee?.teamMemberId &&
      selectedMember.teamMemberId === currentEmployee.teamMemberId;

    if (isTeamMember && !isSelf) {
      setPermissionToast(
        "You are not allowed to change the status of other members"
      );
      setTimeout(() => setPermissionToast(""), 2500);
      return;
    }
    setEditTaskLoading(true);
    setEditTaskError("");
    const token = localStorage.getItem("token");
    try {
      const statusMapOut = {
        pending: "Pending",
        "in progress": "In Progress",
        "in-progress": "In Progress",
        paused: "Paused",
        completed: "Completed",
      };
      if (editTask.status) {
        const statusResponse = await apiHandler.postApiWithToken(
          api_url.updateSubtaskStatus,
          {
            subtask_id: selectedTask.task_id,
            status: statusMapOut[editTask.status] || editTask.status,
          },
          token
        );
        if (!statusResponse?.success) {
          setEditTaskError(
            statusResponse?.message || "Failed to update subtask status"
          );
          return;
        }
      }
      let response = { success: true };
      // Team members editing their own subtasks: skip non-status edits (backend forbids)
      if (!(isTeamMember && isSelf)) {
        response = await apiHandler.postApiWithToken(
          api_url.editSubtask,
          {
            subtask_id: selectedTask.task_id,
            subtask_title: editTask.title,
            description: editTask.description,
          },
          token
        );
      }
      if (
        response?.success ||
        response?.message?.toLowerCase?.().includes("updated")
      ) {
        setShowEditTaskModal(false);
        setSelectedTask(null);
        if (selectedProject) {
          // Maintain current filters
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
        } else {
          fetchOngoingTasks(selectedMember.teamMemberId);
          fetchTaskHistory(selectedMember.teamMemberId);
        }
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

      if (
        response?.success ||
        response?.message?.toLowerCase().includes("deleted")
      ) {
        setShowDeleteConfirm(false);
        setSelectedTask(null);
        setDeleteReason("");
        // Keep current view and filters intact
        if (selectedProject) {
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
        } else {
          fetchOngoingTasks(selectedMember.teamMemberId);
          fetchTaskHistory(selectedMember.teamMemberId);
        }
      } else {
        setDeleteTaskError(response?.message || "Failed to delete subtask");
      }
    } catch (err) {
      setDeleteTaskError(err?.message || "Failed to delete subtask");
    } finally {
      setDeleteTaskLoading(false);
    }
  };

  // --- Drag & Drop (Kanban) for Subtasks ---
  const kanbanColumns = [
    { id: "paused", title: "Paused" },
    { id: "pending", title: "Pending" },
    { id: "in-progress", title: "In Progress" },
    { id: "completed", title: "Completed" },
  ];

  const kanbanStyles = {
    pending: {
      header: "bg-gray-50 border-gray-300",
      drop: "border-gray-300 bg-gray-50",
      card: "border-gray-200",
    },
    "in-progress": {
      header: "bg-orange-50 border-orange-300",
      drop: "border-orange-300 bg-orange-50",
      card: "border-orange-200",
    },
    completed: {
      header: "bg-emerald-50 border-emerald-300",
      drop: "border-emerald-300 bg-emerald-50",
      card: "border-emerald-200",
    },
    paused: {
      header: "bg-violet-50 border-violet-300",
      drop: "border-violet-300 bg-violet-50",
      card: "border-violet-200",
    },
  };

  const handleTaskDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleTaskDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleTaskDrop = async (e, targetStatusId) => {
    e.preventDefault();
    if (!draggedTask) return;

    // Prevent unnecessary updates
    if ((draggedTask.status || "").toLowerCase() === targetStatusId) {
      setDraggedTask(null);
      return;
    }

    const isTeamMember = (userRole || "").toLowerCase() === "teammember";
    const isSelf =
      selectedMember?.teamMemberId &&
      currentEmployee?.teamMemberId &&
      selectedMember.teamMemberId === currentEmployee.teamMemberId;
    if (isTeamMember && !isSelf) {
      setPermissionToast(
        "You are not allowed to change the status of other members"
      );
      setTimeout(() => setPermissionToast(""), 2500);
      setDraggedTask(null);
      return;
    }

    const token = localStorage.getItem("token");
    const statusMapOut = {
      pending: "Pending",
      "in-progress": "In Progress",
      paused: "Paused",
      completed: "Completed",
    };

    try {
      const response = await apiHandler.postApiWithToken(
        api_url.updateSubtaskStatus,
        {
          subtask_id: draggedTask.task_id,
          status: statusMapOut[targetStatusId],
        },
        token
      );

      // Check if the response indicates success
      if (response?.success) {
        // Optimistically update UI
        setTasks((prev) =>
          prev.map((t) =>
            t.task_id === draggedTask.task_id
              ? { ...t, status: targetStatusId }
              : t
          )
        );
        // Refresh lists to stay consistent with filters
        if (selectedProject) {
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
        } else {
          fetchOngoingTasks(selectedMember.teamMemberId);
          fetchTaskHistory(selectedMember.teamMemberId);
        }
      } else {
        // Handle error response
        console.error("Error updating subtask status:", response);
        setPermissionToast(
          response?.message ||
            "Failed to update subtask status. Please try again."
        );
        setTimeout(() => setPermissionToast(""), 3000);
        // Revert the optimistic update
        setTasks((prev) =>
          prev.map((t) =>
            t.task_id === draggedTask.task_id
              ? { ...t, status: draggedTask.status }
              : t
          )
        );
      }
    } catch (error) {
      console.error("Unexpected error updating subtask status:", error);
      setPermissionToast("Failed to update subtask status. Please try again.");
      setTimeout(() => setPermissionToast(""), 3000);
      // Revert the optimistic update
      setTasks((prev) =>
        prev.map((t) =>
          t.task_id === draggedTask.task_id
            ? { ...t, status: draggedTask.status }
            : t
        )
      );
    } finally {
      setDraggedTask(null);
    }
  };

  // Helper to get tasks per column for Kanban
  const getTasksForColumn = (statusId) => {
    const all = [...(tasks || []), ...(taskHistory || [])];
    const filtered = all.filter(
      (t) => (t.status || "").toLowerCase() === statusId
    );
    // Limit to 5 per column when no specific project filter is selected
    return selectedProject ? filtered : filtered.slice(0, 5);
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

  const getPriorityColor = (priority) => {
    switch (priority.toLowerCase()) {
      case "high":
        return "bg-red-100 text-red-700";
      case "medium":
        return "bg-yellow-100 text-yellow-700";
      case "low":
        return "bg-green-100 text-green-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const updateGeneralStatus = async (task, newStatus) => {
    const token = localStorage.getItem("token");
    const outMap = {
      pending: "Pending",
      "in-progress": "In Progress",
      completed: "Completed",
    };
    await apiHandler.postApiWithToken(
      api_url.updateGeneralSubtaskStatus,
      {
        teamMemberId: selectedMember.teamMemberId,
        subtask_id: task.task_id,
        status: outMap[newStatus] || newStatus,
      },
      token
    );
    // refresh list
    const refreshed = generalTasks.map((t) =>
      t.task_id === task.task_id ? { ...t, status: newStatus } : t
    );
    setGeneralTasks(refreshed);
  };

  const deleteGeneral = async (task) => {
    const token = localStorage.getItem("token");
    await apiHandler.postApiWithToken(
      api_url.deleteGeneralSubtask,
      {
        teamMemberId: selectedMember.teamMemberId,
        subtask_id: task.task_id,
      },
      token
    );
    setGeneralTasks((prev) => prev.filter((t) => t.task_id !== task.task_id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex">
      {/* Sidebar: Members (hidden for team member to show list directly) */}
      {userRole !== "teamMember" && (
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

            {userRole === "teamLead" ? (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className="mb-4">
                    <div className="text-sm text-gray-600 mb-2">You</div>
                    <button
                      className={`w-full text-left p-3 rounded-xl transition-all duration-200 flex items-center gap-3 ${
                        selectedMember?._id === currentEmployee?._id
                          ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg"
                          : "bg-gray-50 hover:bg-gray-100 text-gray-700"
                      }`}
                      onClick={() => {
                        if (currentEmployee) setSelectedMember(currentEmployee);
                        setShowTaskHistory(false);
                      }}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                        {(currentEmployee?.name || "?").charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium">
                        {currentEmployee?.name || "Me"}
                      </span>
                    </button>
                  </div>
                  <div className="relative mb-4">
                    <input
                      type="text"
                      placeholder="Search team members..."
                      value={leadSearch}
                      onChange={(e) => setLeadSearch(e.target.value)}
                      className="w-full pl-4 pr-10 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 bg-gray-50"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                      🔍
                    </span>
                  </div>
                  <div className="space-y-2">
                    {(leadMembers || [])
                      .filter((m) =>
                        (m.name || "")
                          .toLowerCase()
                          .includes(leadSearch.toLowerCase())
                      )
                      .map((member) => (
                        <button
                          key={member._id || member.teamMemberId}
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
                            {(member.name || "?").charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium">{member.name}</span>
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            ) : userRole === "teamMember" ? (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className="text-sm text-gray-600 mb-2">You</div>
                  <button
                    className={`w-full text-left p-3 rounded-xl transition-all duration-200 flex items-center gap-3 ${
                      selectedMember?._id === currentEmployee?._id
                        ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg"
                        : "bg-gray-50 hover:bg-gray-100 text-gray-700"
                    }`}
                    onClick={() => {
                      if (currentEmployee) setSelectedMember(currentEmployee);
                      setShowTaskHistory(false);
                    }}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                      {(currentEmployee?.name || "?").charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium">
                      {currentEmployee?.name || "Me"}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
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
            )}
          </div>
        </div>
      )}
      {/* Main Content: Tasks */}
      <div className="flex-1 p-8">
        {selectedMember ? (
          <>
            <div className="mb-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Subtasks for {formatName(selectedMember?.name)}
                  </h1>
                  <p className="text-gray-600">
                    Manage and track subtask progress
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {/* Filters moved to header right */}
                  <select
                    value={selectedProject ? selectedProject.project_id : ""}
                    onChange={(e) => {
                      const project = projects.find(
                        (p) => p.project_id === e.target.value
                      );
                      setSelectedProject(project || null);
                      setSelectedPhaseId("");
                      setPhases([]);
                      if (project) fetchPhasesForProject(project.project_id);
                    }}
                    className="border border-gray-200 rounded-xl px-5 py-2 bg-white min-w-[220px]"
                  >
                    <option value="">All Projects</option>
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
                    <select
                      value={selectedPhaseId}
                      onChange={(e) => setSelectedPhaseId(e.target.value)}
                      className="border border-gray-200 rounded-xl px-5 py-2 bg-white min-w-[220px]"
                    >
                      <option value="">All Phases</option>
                      {(phases || []).map((ph) => (
                        <option key={ph.phase_id} value={ph.phase_id}>
                          {ph.title}
                        </option>
                      ))}
                    </select>
                  )}
                  {userRole !== "teamMember" && (
                    <button
                      className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                      onClick={() => setShowAddTaskModal(true)}
                      disabled={!selectedMember}
                      title={
                        !selectedMember
                          ? "Please select a team member first"
                          : ""
                      }
                    >
                      <Plus size={18} /> Add Subtask
                    </button>
                  )}
                </div>
              </div>
              {permissionToast && (
                <div className="mb-4">
                  <div className="inline-flex items-center gap-2 bg-red-50 text-red-700 px-4 py-2 rounded-lg border border-red-200 text-sm">
                    {permissionToast}
                  </div>
                </div>
              )}
              {(selectedMember?.role === "admin" ||
                selectedMember?.role === "manager") && (
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-100">
                  {generalLoading ? (
                    <div className="text-gray-500 text-sm">
                      Loading general subtasks...
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-1 h-6 bg-gradient-to-b from-amber-500 to-orange-500 rounded-full"></div>
                        <button
                          onClick={() =>
                            setGeneralOngoingExpanded(!generalOngoingExpanded)
                          }
                          className="flex items-center gap-2 text-xl font-bold text-gray-800 hover:text-amber-600 transition-colors duration-200 cursor-pointer"
                        >
                          <span>Ongoing General Subtasks</span>
                          <span className="text-lg">
                            {generalOngoingExpanded ? "▼" : "▶"}
                          </span>
                        </button>
                      </div>
                      {generalOngoingExpanded && (
                        <div className="space-y-4 mb-8">
                          {generalTasks.filter((x) => x.status !== "completed")
                            .length === 0 ? (
                            <div className="text-gray-500 text-sm">
                              No ongoing general subtasks.
                            </div>
                          ) : (
                            generalTasks
                              .filter((x) => x.status !== "completed")
                              .map((t) => (
                                <div key={t._id}>
                                  <div
                                    className={`group p-4 rounded-lg border transition-all duration-200 cursor-pointer ${
                                      selectedGeneralTask?._id === t._id
                                        ? "bg-emerald-50 border-emerald-200 shadow-sm"
                                        : "bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300"
                                    }`}
                                    onClick={() =>
                                      setSelectedGeneralTask(
                                        selectedGeneralTask?._id === t._id
                                          ? null
                                          : t
                                      )
                                    }
                                  >
                                    <div className="flex items-start gap-3">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center gap-2">
                                            <h4 className="font-semibold text-gray-900 capitalize text-base">
                                              {t.title}
                                            </h4>
                                            <span
                                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(
                                                t.priority
                                              )}`}
                                            >
                                              {t.priority}
                                            </span>
                                          </div>
                                          <span
                                            className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                                              t.status === "completed"
                                                ? "bg-green-100 text-green-700"
                                                : t.status === "in-progress"
                                                ? "bg-blue-100 text-blue-700"
                                                : "bg-gray-100 text-gray-700"
                                            }`}
                                          >
                                            {t.status}
                                          </span>
                                        </div>
                                        <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                                          {t.description}
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  {selectedGeneralTask?._id === t._id && (
                                    <div className="mt-4 p-6 bg-white rounded-2xl shadow-lg border border-gray-200">
                                      <div className="flex justify-between items-center mb-4">
                                        <h4 className="text-xl font-bold text-gray-800">
                                          {t.title}
                                        </h4>
                                        <div className="flex items-center gap-2">
                                          <select
                                            className="text-sm border rounded px-2 py-1"
                                            value={t.status}
                                            onChange={(e) =>
                                              updateGeneralStatus(
                                                t,
                                                e.target.value
                                              )
                                            }
                                          >
                                            <option value="pending">
                                              Pending
                                            </option>
                                            <option value="in-progress">
                                              In Progress
                                            </option>
                                            <option value="completed">
                                              Completed
                                            </option>
                                          </select>
                                          <button
                                            className="px-4 py-2 bg-gradient-to-r from-gray-400 to-gray-500 text-white rounded-lg hover:from-gray-500 hover:to-gray-600 transition-all duration-200 shadow-md hover:shadow-lg"
                                            onClick={() => deleteGeneral(t)}
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      </div>
                                      <div className="space-y-3">
                                        <div className="text-gray-700">
                                          <span className="font-semibold text-gray-800">
                                            Description:
                                          </span>
                                          <p className="mt-1 text-gray-600 leading-relaxed">
                                            {t.description}
                                          </p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-gray-700">
                                              Priority:
                                            </span>
                                            <span
                                              className={`px-2 py-1 rounded-full text-xs font-semibold ${getPriorityColor(
                                                t.priority
                                              )}`}
                                            >
                                              {t.priority}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-gray-700">
                                              Created At:
                                            </span>
                                            <span className="text-gray-600">
                                              {new Date(
                                                t.createdAt
                                              ).toLocaleString()}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-1 h-6 bg-gradient-to-b from-green-500 to-emerald-500 rounded-full"></div>
                        <button
                          onClick={() =>
                            setGeneralCompletedExpanded(
                              !generalCompletedExpanded
                            )
                          }
                          className="flex items-center gap-2 text-xl font-bold text-gray-800 hover:text-green-600 transition-colors duration-200 cursor-pointer"
                        >
                          <span>Completed General Subtasks</span>
                          <span className="text-lg">
                            {generalCompletedExpanded ? "▼" : "▶"}
                          </span>
                        </button>
                      </div>
                      {generalCompletedExpanded && (
                        <div className="space-y-4">
                          {generalTasks.filter((x) => x.status === "completed")
                            .length === 0 ? (
                            <div className="text-gray-500 text-sm">
                              No completed general subtasks.
                            </div>
                          ) : (
                            generalTasks
                              .filter((x) => x.status === "completed")
                              .map((t) => (
                                <div key={t._id}>
                                  <div
                                    className={`group p-4 rounded-lg border transition-all duration-200 cursor-pointer ${
                                      selectedGeneralTask?._id === t._id
                                        ? "bg-emerald-50 border-emerald-200 shadow-sm"
                                        : "bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300"
                                    }`}
                                    onClick={() =>
                                      setSelectedGeneralTask(
                                        selectedGeneralTask?._id === t._id
                                          ? null
                                          : t
                                      )
                                    }
                                  >
                                    <div className="flex items-start gap-3">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center gap-2">
                                            <h4 className="font-semibold text-gray-900 capitalize text-base">
                                              {t.title}
                                            </h4>
                                            <span
                                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(
                                                t.priority
                                              )}`}
                                            >
                                              {t.priority}
                                            </span>
                                          </div>
                                          <span
                                            className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                                              t.status === "completed"
                                                ? "bg-green-100 text-green-700"
                                                : t.status === "in-progress"
                                                ? "bg-blue-100 text-blue-700"
                                                : "bg-gray-100 text-gray-700"
                                            }`}
                                          >
                                            {t.status}
                                          </span>
                                        </div>
                                        <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                                          {t.description}
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  {selectedGeneralTask?._id === t._id && (
                                    <div className="mt-4 p-6 bg-white rounded-2xl shadow-lg border border-gray-200">
                                      <div className="flex justify-between items-center mb-4">
                                        <h4 className="text-xl font-bold text-gray-800">
                                          {t.title}
                                        </h4>
                                        <div className="flex items-center gap-2">
                                          <select
                                            className="text-sm border rounded px-2 py-1"
                                            value={t.status}
                                            onChange={(e) =>
                                              updateGeneralStatus(
                                                t,
                                                e.target.value
                                              )
                                            }
                                          >
                                            <option value="pending">
                                              Pending
                                            </option>
                                            <option value="in-progress">
                                              In Progress
                                            </option>
                                            <option value="completed">
                                              Completed
                                            </option>
                                          </select>
                                          <button
                                            className="px-4 py-2 bg-gradient-to-r from-gray-400 to-gray-500 text-white rounded-lg hover:from-gray-500 hover:to-gray-600 transition-all duration-200 shadow-md hover:shadow-lg"
                                            onClick={() => deleteGeneral(t)}
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      </div>
                                      <div className="space-y-3">
                                        <div className="text-gray-700">
                                          <span className="font-semibold text-gray-800">
                                            Description:
                                          </span>
                                          <p className="mt-1 text-gray-600 leading-relaxed">
                                            {t.description}
                                          </p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-gray-700">
                                              Priority:
                                            </span>
                                            <span
                                              className={`px-2 py-1 rounded-full text-xs font-semibold ${getPriorityColor(
                                                t.priority
                                              )}`}
                                            >
                                              {t.priority}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-gray-700">
                                              Created At:
                                            </span>
                                            <span className="text-gray-600">
                                              {new Date(
                                                t.createdAt
                                              ).toLocaleString()}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Old inline project/phase filter removed (moved to header) */}
            </div>

            {selectedMember?.role !== "admin" && (
              <>
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                    <button
                      onClick={() =>
                        setOngoingSubtasksExpanded(!ongoingSubtasksExpanded)
                      }
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
                              <CalendarDays
                                size={24}
                                className="text-gray-400"
                              />
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
                                className={`group p-4 rounded-lg border transition-all duration-200 cursor-pointer ${
                                  selectedTask?._id === task._id
                                    ? "bg-blue-50 border-blue-200 shadow-sm"
                                    : "bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300"
                                }`}
                                onClick={() =>
                                  setSelectedTask(
                                    selectedTask?._id === task._id ? null : task
                                  )
                                }
                              >
                                <div className="flex items-start gap-3">
                                  {/* Compact Status Icon */}
                                  <div className="flex-shrink-0">
                                    <div
                                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                        task.status === "completed"
                                          ? "bg-emerald-100"
                                          : task.status === "in-progress"
                                          ? "bg-blue-100"
                                          : "bg-amber-100"
                                      }`}
                                    >
                                      {task.status === "completed" ? (
                                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                                      ) : task.status === "in-progress" ? (
                                        <Play className="w-4 h-4 text-blue-600" />
                                      ) : (
                                        <Clock className="w-4 h-4 text-amber-600" />
                                      )}
                                    </div>
                                  </div>

                                  {/* Content */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <h4 className="font-semibold text-gray-900 capitalize text-base">
                                          {task.title}
                                        </h4>
                                        <span
                                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                            task.priority === "Critical"
                                              ? "bg-red-100 text-red-700"
                                              : task.priority === "High"
                                              ? "bg-amber-100 text-amber-700"
                                              : "bg-emerald-100 text-emerald-700"
                                          }`}
                                        >
                                          {task.priority || "Low"}
                                        </span>
                                      </div>
                                      <span
                                        className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
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

                                    <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                                      {task.description}
                                    </p>

                                    <div className="flex items-center gap-1">
                                      <span className="text-xs text-gray-500">
                                        Project:
                                      </span>
                                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                                        {getProjectNameById(task.project)}
                                      </span>
                                    </div>
                                  </div>
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
                                        onClick={() =>
                                          setShowDeleteConfirm(true)
                                        }
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
                                          {getProjectNameById(
                                            selectedTask.project
                                          )}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-semibold text-gray-700">
                                          Priority:
                                        </span>
                                        <span
                                          className={`px-2 py-1 rounded-full text-xs font-semibold ${getPriorityColor(
                                            selectedTask.priority || "Low"
                                          )}`}
                                        >
                                          {selectedTask.priority || "Low"}
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
                {/* Kanban Board (drag & drop across statuses) */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                    <h3 className="text-xl font-bold text-gray-800">
                      Subtasks Board
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {kanbanColumns.map((col) => (
                      <div key={col.id} className="space-y-3">
                        <div
                          className={`flex items-center gap-2 p-3 rounded-lg border-2 border-dotted ${
                            kanbanStyles[col.id].header
                          }`}
                        >
                          <h4 className="font-semibold text-sm text-gray-700">
                            {col.title}
                          </h4>
                        </div>
                        <div
                          className={`min-h-[320px] p-3 rounded-lg border-2 border-dotted ${
                            kanbanStyles[col.id].drop
                          }`}
                          onDragOver={handleTaskDragOver}
                          onDrop={(e) => handleTaskDrop(e, col.id)}
                        >
                          {getTasksForColumn(col.id).length === 0 ? (
                            <div className="text-center text-gray-400 text-sm py-6">
                              Drop subtasks here
                            </div>
                          ) : (
                            getTasksForColumn(col.id).map((task) => (
                              <div
                                key={task._id}
                                className={`p-4 rounded-lg border bg-white hover:bg-gray-50 transition mb-3 cursor-move ${
                                  selectedTask?._id === task._id
                                    ? "border-blue-300 shadow"
                                    : kanbanStyles[col.id].card
                                }`}
                                draggable
                                onDragStart={(e) =>
                                  handleTaskDragStart(e, task)
                                }
                                onClick={() =>
                                  setSelectedTask(
                                    selectedTask?._id === task._id ? null : task
                                  )
                                }
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <h5 className="font-semibold text-gray-900 text-sm line-clamp-1">
                                    {task.title}
                                  </h5>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 capitalize">
                                    {task.status}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 line-clamp-2">
                                  {task.description}
                                </p>
                                <div className="mt-2 text-[10px] text-gray-500">
                                  {getProjectNameById(task.project)}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Completed Subtasks section */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1 h-6 bg-gradient-to-b from-green-500 to-emerald-500 rounded-full"></div>
                    <button
                      onClick={() =>
                        setCompletedSubtasksExpanded(!completedSubtasksExpanded)
                      }
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
                        <div className="text-gray-500">
                          Loading completed subtasks...
                        </div>
                      ) : taskHistory.length === 0 ? (
                        <div className="text-gray-500">
                          No completed subtasks.
                        </div>
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
                                        onClick={() =>
                                          setShowDeleteConfirm(true)
                                        }
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
                                          {getProjectNameById(
                                            selectedTask.project
                                          )}
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
            )}
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
                {userRole !== "teamMember" && (
                  <button
                    className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
                    onClick={() => setShowAddTaskModal(true)}
                    disabled={!selectedMember}
                    title={
                      !selectedMember ? "Please select a team member first" : ""
                    }
                  >
                    <Plus size={18} /> Add Subtask
                  </button>
                )}
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
                    const project = projects.find(
                      (p) => p.project_id === e.target.value
                    );
                    setSelectedProject(project || null);
                    if (project) {
                      fetchPhasesForProject(project.project_id);
                    } else {
                      setPhases([]);
                      setSelectedPhaseId("");
                    }
                  }}
                  required={
                    !(
                      (userRole || "").toLowerCase() === "owner" ||
                      (userRole || "").toLowerCase() === "admin" ||
                      (userRole || "").toLowerCase() === "manager"
                    )
                  }
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
                    <div className="text-sm text-gray-500">
                      Loading phases...
                    </div>
                  ) : (
                    <select
                      className="mt-1 block w-full border rounded-md p-2"
                      value={selectedPhaseId}
                      onChange={(e) => setSelectedPhaseId(e.target.value)}
                      required={
                        !(
                          (userRole || "").toLowerCase() === "owner" ||
                          (userRole || "").toLowerCase() === "admin" ||
                          (userRole || "").toLowerCase() === "manager"
                        )
                      }
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
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Due Date
                </label>
                <input
                  type="date"
                  className="mt-1 block w-full border rounded-md p-2"
                  value={newTask.dueDate}
                  onChange={(e) =>
                    setNewTask({ ...newTask, dueDate: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Priority
                </label>
                <select
                  className="mt-1 block w-full border rounded-md p-2"
                  value={newTask.priority}
                  onChange={(e) =>
                    setNewTask({ ...newTask, priority: e.target.value })
                  }
                >
                  <option value="Low">Low</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Images (0/2)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="mt-1 block w-full border rounded-md p-2"
                />
                {selectedImages.length > 0 && (
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {selectedImages.map((file, idx) => (
                      <div
                        key={idx}
                        className="relative w-20 h-20 border rounded overflow-hidden"
                      >
                        <img
                          src={URL.createObjectURL(file)}
                          alt="preview"
                          className="object-cover w-full h-full"
                        />
                        <button
                          type="button"
                          onClick={() => removeSelectedImage(idx)}
                          className="absolute -top-2 -right-2 bg-white border rounded-full w-6 h-6 text-xs"
                          title="Remove"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {selectedImages.length >= 2 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum 2 images reached
                  </p>
                )}
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
            <h3 className="text-lg font-bold mb-1">Edit Subtask</h3>
            {(userRole || "").toLowerCase() === "teammember" && (
              <p className="mb-3 text-xs text-gray-500">
                You can update Status for your own subtasks. Other fields are
                disabled.
              </p>
            )}
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
                  disabled={(userRole || "").toLowerCase() === "teammember"}
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
                  disabled={(userRole || "").toLowerCase() === "teammember"}
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
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Due Date
                </label>
                <input
                  type="date"
                  className="mt-1 block w-full border rounded-md p-2"
                  value={editTask.dueDate || ""}
                  onChange={(e) =>
                    setEditTask({ ...editTask, dueDate: e.target.value })
                  }
                  disabled={(userRole || "").toLowerCase() === "teammember"}
                />
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
            <p className="mb-2">
              Are you sure you want to delete this subtask?
            </p>
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
