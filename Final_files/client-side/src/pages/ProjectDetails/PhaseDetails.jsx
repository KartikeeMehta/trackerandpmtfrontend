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
} from "lucide-react";
import { api_url } from "@/api/Api";
import { apiHandler } from "@/api/ApiHandler";

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
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [showAddSubtask, setShowAddSubtask] = useState(false);
  const [newSubtask, setNewSubtask] = useState({
    title: "",
    description: "",
    assigned_member: "",
    status: "Pending",
    images: [],
  });
  const [selectedImages, setSelectedImages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [availableStatuses, setAvailableStatuses] = useState([
    "Pending",
    "In Progress",
    "Completed",
    "final_checks",
  ]);
  const dropdownRef = useRef();

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
  const canAccessFinalChecks = [
    "owner",
    "admin",
    "manager",
    "teamLead",
  ].includes(userRole?.toLowerCase());

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

          // Always show all available statuses, not just the ones currently used
          const allStatuses = [
            "Pending",
            "In Progress",
            "Completed",
            "final_checks",
          ];
          setAvailableStatuses(allStatuses);
        }
        setPhase(foundPhase || null);
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
        // Keep default statuses even if API fails
        setAvailableStatuses([
          "Pending",
          "In Progress",
          "Completed",
          "final_checks",
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [phaseId, projectId, navigate]);

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
      case "Completed":
        return <CheckCircle size={16} className="text-green-600" />;
      case "In Progress":
        return <Clock size={16} className="text-blue-600" />;
      case "Pending":
        return <AlertCircle size={16} className="text-yellow-600" />;
      case "final_checks":
        return <Shield size={16} className="text-emerald-600" />;
      default:
        return <Clock size={16} className="text-gray-600" />;
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

  const getAssignedMemberName = (memberId) => {
    const member = employees.find((emp) => emp.teamMemberId === memberId);
    return member ? member.name : "Unknown";
  };

  const handleStatusChange = async (newStatus) => {
    // Check if the new status requires authorization
    if (newStatus === "final_checks" && !canAccessFinalChecks) {
      alert(
        "You don't have permission to move phases to Final Checks. Only owner, admin, manager, and team lead can perform this action."
      );
      return;
    }

    setPhase((prev) => ({ ...prev, status: newStatus }));
    // Update phase status via API
    const token = localStorage.getItem("token");
    try {
      await apiHandler.PostApi(
        api_url.updatePhaseStatus,
        { projectId, phaseId, status: newStatus },
        token
      );
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
    }
  };

  const handleAddSubtask = () => {
    setNewSubtask({
      title: "",
      description: "",
      assigned_member: "",
      status: "Pending",
      images: [],
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
      formData.append("phase_id", phaseId);

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

      if (!response.success) {
        throw new Error(response.message || "Failed to add subtask");
      }

      // Re-fetch subtasks
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
      }
      setShowAddSubtask(false);
      setNewSubtask({
        title: "",
        description: "",
        assigned_member: "",
        status: "Pending",
        images: [],
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
                  state: { project_id: projectId },
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
            <div className="relative" ref={dropdownRef}>
              <button
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                // onClick={() =>
                //   setOpenDropdownId(
                //     openDropdownId === phase.phase_id ? null : phase.phase_id
                //   )
                // }
              >
                {/* <MoreVertical size={16} className="text-gray-500" /> */}
              </button>
              {openDropdownId === phase.phase_id && (
                <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                  <button className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                    <Edit size={14} />
                    Edit
                  </button>
                  <button className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600">
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-4xl mx-auto">
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
                    >
                      {availableStatuses.map((status) => (
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

              {/* Subtasks */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Subtasks
                  </h3>
                  <button
                    onClick={handleAddSubtask}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm flex items-center gap-1 transition-colors"
                  >
                    <Plus size={14} />
                    Add Subtask
                  </button>
                </div>
                <div className="space-y-3">
                  {subtasks.map((subtask) => (
                    <div
                      key={subtask.subtask_id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSubtaskClick(subtask)}
                    >
                      {getStatusIcon(subtask.status)}
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">
                          {subtask.subtask_title}
                        </h4>
                        <p className="text-xs text-gray-600">
                          {subtask.description}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Assigned to:{" "}
                          {getAssignedMemberName(subtask.assigned_member)}
                        </p>
                        {subtask.images && subtask.images.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {subtask.images.slice(0, 3).map((image, index) => (
                              <img
                                key={index}
                                src={image}
                                alt={`Subtask image ${index + 1}`}
                                className="w-8 h-8 rounded object-cover"
                              />
                            ))}
                            {subtask.images.length > 3 && (
                              <div className="w-8 h-8 rounded bg-gray-200 flex items-center justify-center text-xs text-gray-600">
                                +{subtask.images.length - 3}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                          subtask.status
                        )}`}
                      >
                        {getStatusText(subtask.status)}
                      </span>
                    </div>
                  ))}
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
                  />
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="p-1 text-gray-500 hover:text-gray-700"
                      >
                        <Paperclip size={16} />
                      </button>
                      <button
                        type="button"
                        className="p-1 text-gray-500 hover:text-gray-700"
                      >
                        <Smile size={16} />
                      </button>
                    </div>
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
                    {comment.commentedBy
                      ? comment.commentedBy.charAt(0).toUpperCase()
                      : "U"}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {comment.commentedBy || "Unknown User"}
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
                      {employees.map((employee) => (
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={newSubtask.status}
                      onChange={(e) =>
                        setNewSubtask((prev) => ({
                          ...prev,
                          status: e.target.value,
                        }))
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {availableStatuses.map((status) => (
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
                      <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                        <Shield size={10} />
                        Final Checks status requires elevated permissions
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
