import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Users,
  MessageSquare,
  Paperclip,
  Smile,
  Send,
  CheckCircle,
  Clock,
  AlertCircle,
  User,
  Shield,
  Play,
  Circle,
  Target,
} from "lucide-react";
import { api_url } from "@/api/Api";
import { apiHandler } from "@/api/ApiHandler";
import CustomToast from "@/components/CustomToast";

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  });
  if (!message) return null;
  return (
    <div className={`fixed`} style={{ top: "10%", right: "1%" }}>
      <div
        className={`px-6 py-3 rounded shadow-lg text-white font-medium transition-all ${
          type === "success" ? "bg-green-600" : "bg-red-600"
        }`}
        role="alert"
      >
        {message}
        <button className="ml-4 text-white font-bold" onClick={onClose}>
          ×
        </button>
      </div>
    </div>
  );
}

const PhaseDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { phaseId, projectId } = location.state || {};
  const [phase, setPhase] = useState(null);
  const [subtasks, setSubtasks] = useState([]);
  const [comments, setComments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projectInfo, setProjectInfo] = useState(null);
  const [eligibleAssignees, setEligibleAssignees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [showAddSubtask, setShowAddSubtask] = useState(false);
  const [newSubtask, setNewSubtask] = useState({
    title: "",
    description: "",
    assigned_member: "",
    status: "Pending",
    priority: "Low",
    images: [],
    dueDate: "",
  });
  const [selectedImages, setSelectedImages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const dropdownRef = useRef();
  const [showEditPhaseModal, setShowEditPhaseModal] = useState(false);
  const [editPhaseStatus, setEditPhaseStatus] = useState("");

  // Get user role for permissions
  const getUserRole = () => {
    const user = localStorage.getItem("user");
    if (user) {
      try {
        const userData = JSON.parse(user);
        return userData.role || "teamMember";
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
    return "teamMember";
  };

  const userRole = getUserRole();
  const getCurrentEmployeeId = () => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      return u.teamMemberId || u._id || "";
    } catch {
      return "";
    }
  };
  const currentTeamMemberId = getCurrentEmployeeId();
  const canAccessFinalChecks = [
    "owner",
    "admin",
    "manager",
    "teamLead",
  ].includes(userRole?.toLowerCase());
  const canChangePhase = ["owner", "admin", "manager", "teamLead"].includes(
    userRole?.toLowerCase()
  );

  const canEditPhase = (() => {
    const role = (userRole || "").toLowerCase();
    if (["owner", "admin", "manager"].includes(role)) return true;
    if (role === "teamlead") {
      if (!projectInfo || !currentTeamMemberId) return false;
      return String(projectInfo.project_lead) === String(currentTeamMemberId);
    }
    return false;
  })();

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdownId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!phaseId) {
        navigate("/ProjectDetails", { state: { project_id: projectId } });
        return;
      }
      setLoading(true);
      const token = localStorage.getItem("token");
      try {
        // Fetch employees for assignment
        const employeesResponse = await apiHandler.GetApi(
          api_url.getAllEmployees,
          token
        );
        if (Array.isArray(employeesResponse)) {
          setEmployees(employeesResponse);
        } else if (Array.isArray(employeesResponse.employees)) {
          setEmployees(employeesResponse.employees);
        } else {
          setEmployees([]);
        }
        // Fetch all phases for the project, then find the current phase
        const phasesResponse = await apiHandler.GetApi(
          api_url.getPhases + projectId,
          token
        );
        let foundPhase = null;
        if (phasesResponse.success && Array.isArray(phasesResponse.phases)) {
          foundPhase = phasesResponse.phases.find(
            (p) => String(p.phase_id) === String(phaseId)
          );
        }
        setPhase(foundPhase || null);
        // Fetch project info (lead + members) for assignment filtering
        try {
          const projectRes = await apiHandler.GetApi(
            `${api_url.BASE_URL}/projects/${projectId}`,
            token
          );
          if (projectRes && projectRes.project) {
            setProjectInfo(projectRes.project);
          } else {
            setProjectInfo(null);
          }
        } catch (e) {
          setProjectInfo(null);
        }
        // Fetch subtasks for this project
        const subtasksResponse = await apiHandler.GetApi(
          api_url.getSubtasks + projectId,
          token
        );
        if (
          subtasksResponse.success &&
          Array.isArray(subtasksResponse.subtasks)
        ) {
          // Filter subtasks for this specific phase
          const phaseSubtasks = subtasksResponse.subtasks.filter(
            (subtask) => String(subtask.phase_id) === String(phaseId)
          );
          setSubtasks(phaseSubtasks);
        } else {
          setSubtasks([]);
        }
        // Fetch comments for this phase
        await fetchComments(token);
      } catch (error) {
        console.error("Error fetching data:", error);
        setPhase(null);
        setSubtasks([]);
        setComments([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [phaseId, projectId, navigate]);

  // Compute eligible assignees based on project membership and role rules
  useEffect(() => {
    if (!employees || employees.length === 0 || !projectInfo) {
      setEligibleAssignees([]);
      return;
    }

    const projectMemberIds = new Set(
      [...(projectInfo.team_members || []), projectInfo.project_lead].filter(
        Boolean
      )
    );

    let list = employees.filter((emp) =>
      projectMemberIds.has(emp.teamMemberId)
    );

    // Remove assigner themself
    if (currentTeamMemberId) {
      list = list.filter((emp) => emp.teamMemberId !== currentTeamMemberId);
    }

    const role = (userRole || "").toLowerCase();
    if (role === "admin") {
      list = list.filter((emp) => (emp.role || "").toLowerCase() !== "owner");
    } else if (role === "manager") {
      const disallow = new Set(["owner", "admin"]);
      list = list.filter(
        (emp) => !disallow.has((emp.role || "").toLowerCase())
      );
    } else if (role === "teamlead" || role === "teamlead") {
      // Only allow team members for team leads
      list = list.filter(
        (emp) => (emp.role || "").toLowerCase() === "teammember"
      );
    }

    setEligibleAssignees(list);
  }, [employees, projectInfo, userRole]);

  const fetchComments = async (token) => {
    try {
      const commentsResponse = await apiHandler.GetApi(
        `${api_url.getPhaseComments}${projectId}/phases/${phaseId}/comments`,
        token
      );
      if (
        commentsResponse.success &&
        Array.isArray(commentsResponse.comments)
      ) {
        setComments(commentsResponse.comments);
      } else {
        setComments([]);
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
      setComments([]);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Pending":
        return <Clock size={16} className="text-amber-500" />;
      case "In Progress":
        return <Play size={16} className="text-blue-500" />;
      case "Completed":
        return <CheckCircle size={16} className="text-green-500" />;
      default:
        return <Circle size={16} className="text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-800";
      case "In Progress":
        return "bg-blue-100 text-blue-800";
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "final_checks":
        return "bg-emerald-100 text-emerald-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "Completed":
        return "Completed";
      case "In Progress":
        return "In Progress";
      case "Pending":
        return "Pending";
      case "final_checks":
        return "Final Checks";
      default:
        return status;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "Low":
        return "bg-green-100 text-green-800";
      case "High":
        return "bg-yellow-100 text-yellow-800";
      case "Critical":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getAssignedMemberName = (memberId) => {
    const member = employees.find((emp) => emp.teamMemberId === memberId);
    return member ? member.name : "Unknown";
  };

  const handleStatusChange = async (newStatus) => {
    // Check if the new status requires authorization
    if (newStatus === "final_checks" && !canAccessFinalChecks) {
      CustomToast.error(
        "You don't have permission to move phases to Final Checks. Only owner, admin, manager, and team lead can perform this action."
      );
      return;
    }

    const previousStatus = phase?.status;
    setPhase((prev) => ({ ...prev, status: newStatus }));
    // Update phase status via API
    const token = localStorage.getItem("token");
    try {
      const response = await apiHandler.PostApi(
        api_url.updatePhaseStatus,
        { projectId, phaseId, status: newStatus },
        token
      );
      if (!response?.success) {
        if (response?.message) {
          CustomToast.error(response.message);
        } else {
          CustomToast.error("All subtasks are not completed.");
        }
        // Revert UI to previous status on failure
        setPhase((prev) => ({ ...prev, status: previousStatus }));
        return;
      }
      // Re-fetch phase details
      const phasesResponse = await apiHandler.GetApi(
        api_url.getPhases + projectId,
        token
      );
      let foundPhase = null;
      if (phasesResponse.success && Array.isArray(phasesResponse.phases)) {
        foundPhase = phasesResponse.phases.find(
          (p) => String(p.phase_id) === String(phaseId)
        );
      }
      setPhase(foundPhase || null);
    } catch (error) {
      console.error("Error updating phase status:", error);
      CustomToast.error("All subtasks are not completed.");
      // Revert UI on error
      setPhase((prev) => ({ ...prev, status: previousStatus }));
    }
  };

  const handleAddSubtask = () => {
    setNewSubtask({
      title: "",
      description: "",
      assigned_member: "",
      status: "Pending",
      priority: "Low",
      images: [],
      dueDate: "",
    });
    setShowAddSubtask(true);
  };

  const handleSubmitSubtask = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    setIsUploading(true);
    setUploadProgress(0);
    setToast({ message: "", type: "success" });
    try {
      const formData = new FormData();
      formData.append("subtask_title", newSubtask.title);
      formData.append("description", newSubtask.description);
      formData.append("assigned_team", ""); // No team selection in UI
      formData.append("assigned_member", newSubtask.assigned_member);
      formData.append("priority", newSubtask.priority);
      formData.append("phase_id", phaseId);
      formData.append("projectId", projectId); // Add projectId to ensure correct project
      if (newSubtask.dueDate) formData.append("dueDate", newSubtask.dueDate);

      // Add selected images as files
      if (selectedImages.length > 0) {
        selectedImages.forEach((image) => {
          formData.append("images", image);
        });
      }

      console.log("Uploading images:", selectedImages.length, "files");
      console.log("FormData entries:");
      for (let [key, value] of formData.entries()) {
        console.log(key, value);
      }

      // Use imageUpload method for FormData with progress tracking
      const response = await apiHandler.imageUpload(
        api_url.addSubtask,
        formData,
        token,
        (progress) => setUploadProgress(progress)
      );

      console.log("🔍 addSubtask response:", response);

      if (!response.success) {
        throw new Error(response.message || "Failed to add subtask");
      }

      // Re-fetch subtasks
      console.log("🔍 Re-fetching subtasks for projectId:", projectId);
      const subtasksResponse = await apiHandler.GetApi(
        api_url.getSubtasks + projectId,
        token
      );
      console.log("🔍 Subtasks response:", subtasksResponse);
      if (
        subtasksResponse.success &&
        Array.isArray(subtasksResponse.subtasks)
      ) {
        // Filter subtasks for this specific phase
        const phaseSubtasks = subtasksResponse.subtasks.filter(
          (subtask) => String(subtask.phase_id) === String(phaseId)
        );
        console.log("🔍 Filtered phase subtasks:", phaseSubtasks);
        setSubtasks(phaseSubtasks);
      }
      setShowAddSubtask(false);
      setNewSubtask({
        title: "",
        description: "",
        assigned_member: "",
        status: "Pending",
        priority: "Low",
        images: [],
        dueDate: "",
      });
      setSelectedImages([]);
      setToast({ message: "Subtask created successfully!", type: "success" });
    } catch (error) {
      console.error("Error adding subtask:", error);
      setToast({
        message: error.message || "Failed to create subtask",
        type: "error",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);

    // Check if adding these files would exceed the 2-image limit
    // For new subtasks, we only check selectedImages since there are no existing images yet
    const totalImages = selectedImages.length + files.length;

    if (totalImages > 2) {
      alert(
        "You can only upload a maximum of 2 images. Please select fewer files."
      );
      return;
    }

    // Check file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    const oversizedFiles = files.filter((file) => file.size > maxSize);

    if (oversizedFiles.length > 0) {
      alert(`Some files are too large. Maximum file size is 5MB.`);
      return;
    }

    // Check file types
    const invalidFiles = files.filter(
      (file) => !file.type.startsWith("image/")
    );

    if (invalidFiles.length > 0) {
      alert("Please select only image files.");
      return;
    }

    setSelectedImages((prev) => [...prev, ...files]);
  };

  const handleRemoveImage = (indexToRemove) => {
    setSelectedImages((prev) =>
      prev.filter((_, index) => index !== indexToRemove)
    );
  };

  const handleSubtaskClick = (subtask) => {
    navigate("/SubtaskDetails", {
      state: {
        subtaskId: subtask.subtask_id,
        phaseId: phaseId,
        projectId: projectId,
      },
    });
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const token = localStorage.getItem("token");
    try {
      const payload = {
        text: newComment,
      };
      await apiHandler.PostApi(
        `${api_url.addPhaseComment}${projectId}/phases/${phaseId}/comments`,
        payload,
        token
      );
      // Re-fetch comments
      await fetchComments(token);
      setNewComment("");
    } catch (error) {
      console.error("Error submitting comment:", error);
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    return date.toLocaleDateString();
  };

  // Resolve commenter name for all roles (owner/admin/manager/teamLead/teamMember)
  const getCommenterName = (comment) => {
    if (!comment) return "Unknown User";
    const str = (v) => (typeof v === "string" ? v.trim() : "");
    const tryName =
      str(comment.commentedByName) ||
      str(comment.user?.name) ||
      str(comment.employee?.name) ||
      str(comment.author?.name) ||
      str(comment.by?.name);
    if (tryName) return tryName;

    const byField =
      str(comment.commentedBy) ||
      str(comment.commented_by) ||
      str(comment.userId) ||
      str(comment.user_id) ||
      str(comment.employeeId) ||
      str(comment.teamMemberId) ||
      str(comment.authorId);
    if (byField) {
      // If it looks like a real name (not an ObjectId), use it directly
      const looksLikeObjectId = /^[a-f\d]{24}$/i.test(byField);
      if (!looksLikeObjectId && !/^\d+$/.test(byField)) {
        return byField;
      }
      const match = employees.find(
        (e) =>
          str(e.teamMemberId) === byField ||
          str(e._id) === byField ||
          str(e.email) === byField
      );
      if (match?.name) return match.name;
    }

    const candidateIds = [
      comment.commentedById,
      comment.userId,
      comment.employeeId,
      comment.teamMemberId,
      comment.authorId,
      comment.commented_by_id,
    ].map((x) => (x == null ? "" : String(x)));
    for (const id of candidateIds) {
      if (!id) continue;
      const emp = employees.find(
        (e) => String(e.teamMemberId) === id || String(e._id) === id
      );
      if (emp?.name) return emp.name;
    }

    return "Unknown User";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!phase) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Phase Not Found
          </h2>
          <button
            onClick={() =>
              navigate("/ProjectDetails", { state: { project_id: projectId } })
            }
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Project
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() =>
                navigate("/ProjectDetails", {
                  state: { project_id: projectId, activeTab: "phases" },
                })
              }
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{phase.title}</h1>
              <p className="text-sm text-gray-500">Phase Details</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-gray-500">Role: {userRole}</span>
                {canAccessFinalChecks && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-800 text-xs rounded-full">
                    <Shield size={10} />
                    Can access Final Checks
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(
                phase.status
              )}`}
            >
              {getStatusText(phase.status)}
            </span>
            <div className="flex items-center gap-2">
              <button
                className={`px-3 py-1.5 text-sm rounded-md border border-gray-200 ${
                  canEditPhase
                    ? "hover:bg-gray-100"
                    : "opacity-60 cursor-not-allowed"
                }`}
                onClick={() => {
                  if (!canEditPhase) {
                    CustomToast.error(
                      "You don't have permission to edit this phase."
                    );
                    return;
                  }
                  setEditPhaseStatus(phase.status);
                  setShowEditPhaseModal(true);
                }}
              >
                Edit Phase
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="w-full">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Phase Description */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Description
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Status:</span>
                    <select
                      value={phase.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={!canChangePhase}
                    >
                      {[
                        "Pending",
                        "In Progress",
                        "Completed",
                        "final_checks",
                      ].map((status) => (
                        <option
                          key={status}
                          value={status}
                          disabled={
                            status === "final_checks" && !canAccessFinalChecks
                          }
                        >
                          {status === "final_checks" ? "Final Checks" : status}
                          {status === "final_checks" && !canAccessFinalChecks
                            ? " (Restricted)"
                            : ""}
                        </option>
                      ))}
                    </select>
                    {!canAccessFinalChecks && (
                      <span className="text-xs text-emerald-600 flex items-center gap-1">
                        <Shield size={12} />
                        Final Checks restricted
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  {phase.description}
                </p>
              </div>

              {/* Refined Subtasks Section */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-md flex items-center justify-center">
                      <Target className="w-3 h-3 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">
                        Subtasks
                      </h3>
                      <p className="text-xs text-gray-500">
                        {subtasks.length} total
                      </p>
                    </div>
                  </div>
                  {userRole?.toLowerCase() !== "teammember" && (
                    <button
                      onClick={handleAddSubtask}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <Plus size={12} />
                      Add
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {subtasks.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Target className="w-6 h-6 text-gray-400" />
                      </div>
                      <h4 className="text-sm font-medium text-gray-900 mb-1">
                        No subtasks yet
                      </h4>
                      <p className="text-gray-500 text-xs">
                        Create your first subtask to get started
                      </p>
                    </div>
                  ) : (
                    subtasks.map((subtask) => (
                      <div
                        key={subtask.subtask_id}
                        className="group bg-gray-50 rounded-lg border border-gray-200 p-3 cursor-pointer hover:bg-white hover:shadow-sm hover:border-blue-200 transition-all duration-200"
                        onClick={() => handleSubtaskClick(subtask)}
                      >
                        <div className="flex items-start gap-3">
                          {/* Compact Status Icon */}
                          <div className="flex-shrink-0">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center ${
                                subtask.status === "Completed"
                                  ? "bg-emerald-100"
                                  : subtask.status === "In Progress"
                                  ? "bg-blue-100"
                                  : "bg-amber-100"
                              }`}
                            >
                              {subtask.status === "Completed" ? (
                                <CheckCircle className="w-4 h-4 text-emerald-600" />
                              ) : subtask.status === "In Progress" ? (
                                <Play className="w-4 h-4 text-blue-600" />
                              ) : (
                                <Clock className="w-4 h-4 text-amber-600" />
                              )}
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-sm font-medium text-gray-900 truncate">
                                {subtask.subtask_title}
                              </h4>
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  subtask.priority === "Critical"
                                    ? "bg-red-100 text-red-700"
                                    : subtask.priority === "High"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-emerald-100 text-emerald-700"
                                }`}
                              >
                                {subtask.priority || "Low"}
                              </span>
                            </div>

                            <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                              {subtask.description ||
                                "No description available"}
                            </p>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-500">
                                  Assigned:
                                </span>
                                <span className="text-xs font-medium text-gray-700">
                                  {getAssignedMemberName(
                                    subtask.assigned_member
                                  )}
                                </span>
                              </div>

                              {/* Compact Status indicator */}
                              <div
                                className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                  subtask.status === "Completed"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : subtask.status === "In Progress"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {subtask.status || "Pending"}
                              </div>
                            </div>

                            {/* Compact Images section */}
                            {subtask.images && subtask.images.length > 0 && (
                              <div className="flex gap-1 mt-2">
                                {subtask.images
                                  .slice(0, 3)
                                  .map((image, index) => (
                                    <div key={index} className="relative">
                                      <img
                                        src={image}
                                        alt={`Subtask image ${index + 1}`}
                                        className="w-6 h-6 rounded object-cover border border-gray-200"
                                      />
                                    </div>
                                  ))}
                                {subtask.images.length > 3 && (
                                  <div className="w-6 h-6 rounded bg-gray-100 border border-gray-200 flex items-center justify-center text-xs text-gray-600">
                                    +{subtask.images.length - 3}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Phase Info */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Phase Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500">
                      Phase ID
                    </label>
                    <p className="text-sm text-gray-900">{phase.phase_id}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">
                      Due Date
                    </label>
                    <p className="text-sm text-gray-900">
                      {phase.dueDate || "Not set"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Comments Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Comments
            </h3>

            {/* Comment Input */}
            <form onSubmit={handleSubmitComment} className="mb-6">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                  U
                </div>
                <div className="flex-1">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Leave a comment..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmitComment(e);
                      }
                    }}
                  />
                  <div className="flex items-center justify-end mt-2">
                    <button
                      type="submit"
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-1 transition-colors"
                    >
                      <Send size={14} />
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </form>

            {/* Comments List */}
            <div className="space-y-4">
              {comments.map((comment, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                    {(getCommenterName(comment) || "U").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {getCommenterName(comment)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(comment.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{comment.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add Subtask Modal */}
      {showAddSubtask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md relative">
            {isUploading && (
              <div className="absolute inset-0 bg-white bg-opacity-90 rounded-xl flex items-center justify-center z-10">
                <div className="text-center">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-gray-700 font-medium">Adding Subtask...</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Please wait while we upload your images
                  </p>
                  {uploadProgress > 0 && (
                    <div className="mt-4 w-full max-w-xs mx-auto">
                      <div className="bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-600 mt-2">
                        {Math.round(uploadProgress)}% complete
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Add Subtask
              </h3>
              <form onSubmit={handleSubmitSubtask}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Task Title
                    </label>
                    <input
                      type="text"
                      value={newSubtask.title}
                      onChange={(e) =>
                        setNewSubtask((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={newSubtask.description}
                      onChange={(e) =>
                        setNewSubtask((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={newSubtask.dueDate}
                      onChange={(e) =>
                        setNewSubtask((prev) => ({
                          ...prev,
                          dueDate: e.target.value,
                        }))
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <select
                      value={newSubtask.priority}
                      onChange={(e) =>
                        setNewSubtask((prev) => ({
                          ...prev,
                          priority: e.target.value,
                        }))
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Low">Low</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assign To
                    </label>
                    <select
                      value={newSubtask.assigned_member}
                      onChange={(e) =>
                        setNewSubtask((prev) => ({
                          ...prev,
                          assigned_member: e.target.value,
                        }))
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select Member</option>
                      {eligibleAssignees.map((employee) => (
                        <option
                          key={employee.teamMemberId}
                          value={employee.teamMemberId}
                        >
                          {employee.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Images ({selectedImages.length}/2)
                    </label>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {selectedImages.length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {selectedImages.map((image, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={URL.createObjectURL(image)}
                              alt={`Preview ${index + 1}`}
                              className="w-16 h-16 rounded object-cover border border-gray-300 group-hover:border-red-300 transition-colors"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded flex items-center justify-center">
                              <button
                                type="button"
                                className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleRemoveImage(index)}
                                title="Remove image"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedImages.length === 2 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Maximum 2 images reached
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddSubtask(false)}
                    disabled={isUploading}
                    className={`px-4 py-2 border border-gray-300 rounded-lg ${
                      isUploading
                        ? "text-gray-400 cursor-not-allowed"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading}
                    className={`px-4 py-2 rounded-lg text-white ${
                      isUploading
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {isUploading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Adding Subtask...
                      </div>
                    ) : (
                      "Add Subtask"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Phase Modal */}
      {showEditPhaseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Edit Phase
              </h3>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!canEditPhase) {
                    CustomToast.error(
                      "You don't have permission to edit this phase."
                    );
                    return;
                  }
                  const token = localStorage.getItem("token");
                  try {
                    const payload = {
                      projectId,
                      phaseId,
                      title: e.target.elements["phaseTitle"].value,
                      description: e.target.elements["phaseDescription"].value,
                      dueDate: e.target.elements["phaseDueDate"].value,
                    };
                    const response = await apiHandler.PostApi(
                      api_url.editPhase,
                      payload,
                      token
                    );
                    if (response?.success) {
                      const phasesResponse = await apiHandler.GetApi(
                        api_url.getPhases + projectId,
                        token
                      );
                      let foundPhase = null;
                      if (
                        phasesResponse.success &&
                        Array.isArray(phasesResponse.phases)
                      ) {
                        foundPhase = phasesResponse.phases.find(
                          (p) => String(p.phase_id) === String(phaseId)
                        );
                      }
                      setPhase(foundPhase || null);
                      setShowEditPhaseModal(false);
                      CustomToast.success("Phase updated");
                    } else {
                      CustomToast.error(
                        response?.message || "Failed to update phase"
                      );
                    }
                  } catch (err) {
                    CustomToast.error("Failed to update phase");
                  }
                }}
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phase Title
                    </label>
                    <input
                      type="text"
                      name="phaseTitle"
                      defaultValue={phase?.title || ""}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      name="phaseDescription"
                      defaultValue={phase?.description || ""}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Due Date
                    </label>
                    <input
                      type="date"
                      name="phaseDueDate"
                      defaultValue={phase?.dueDate || ""}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowEditPhaseModal(false)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Update Phase
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: toast.type })}
      />
    </div>
  );
};

export default PhaseDetails;
