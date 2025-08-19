import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  MoreVertical,
  Edit,
  Trash2,
  User,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Image as ImageIcon,
  Download,
  Eye,
  MessageSquare,
  Activity,
  Flag,
  CalendarDays,
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

const SubtaskDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { subtaskId, phaseId, projectId } = location.state || {};
  const [subtask, setSubtask] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSubtask, setEditingSubtask] = useState(null);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [activityLog, setActivityLog] = useState([]);
  const [selectedImages, setSelectedImages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const dropdownRef = useRef();

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
      if (!subtaskId) {
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

        // Fetch all subtasks for the project, then find the current subtask
        const subtasksResponse = await apiHandler.GetApi(
          api_url.getSubtasks + projectId,
          token
        );
        let foundSubtask = null;
        if (
          subtasksResponse.success &&
          Array.isArray(subtasksResponse.subtasks)
        ) {
          foundSubtask = subtasksResponse.subtasks.find(
            (s) => String(s.subtask_id) === String(subtaskId)
          );
        }
        setSubtask(foundSubtask || null);

        // Fetch activity log for this subtask
        await fetchActivityLog(subtaskId, token);
      } catch (error) {
        console.error("Error fetching data:", error);
        setSubtask(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [subtaskId, projectId, navigate]);

  const fetchActivityLog = async (subtaskId, token) => {
    try {
      // Fetch activity log from API - you'll need to create this endpoint
      const activityResponse = await apiHandler.GetApi(
        `${api_url.getSubtaskActivity}/${subtaskId}`,
        token
      );

      if (
        activityResponse.success &&
        Array.isArray(activityResponse.activities)
      ) {
        setActivityLog(activityResponse.activities);
      } else {
        // Generate mock activity based on subtask data
        generateMockActivity();
      }
    } catch (error) {
      console.error("Error fetching activity log:", error);
      // Generate mock activity if API fails
      generateMockActivity();
    }
  };

  const generateMockActivity = () => {
    if (!subtask) return;

    const mockActivities = [
      {
        id: 1,
        action: "Status updated",
        details: `Status changed to "${subtask.status}"`,
        timestamp: new Date().toISOString(),
        user: "System",
        type: "status_update",
      },
      {
        id: 2,
        action: "Subtask assigned",
        details: `Assigned to ${getAssignedMemberName(
          subtask.assigned_member
        )}`,
        timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        user: "Project Manager",
        type: "assignment",
      },
      {
        id: 3,
        action: "Subtask created",
        details: "Subtask was created",
        timestamp: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        user: "Project Manager",
        type: "creation",
      },
    ];

    setActivityLog(mockActivities);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Completed":
        return <CheckCircle size={16} className="text-green-600" />;
      case "In Progress":
        return <Clock size={16} className="text-blue-600" />;
      case "Pending":
        return <AlertCircle size={16} className="text-yellow-600" />;
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
      default:
        return status;
    }
  };

  const getAssignedMemberName = (memberId) => {
    const member = employees.find((emp) => emp.teamMemberId === memberId);
    return member ? member.name : "Unknown";
  };

  const handleStatusChange = async (newStatus) => {
    setSubtask((prev) => ({ ...prev, status: newStatus }));
    const token = localStorage.getItem("token");
    try {
      await apiHandler.PostApi(
        api_url.updateSubtaskStatus,
        { subtask_id: subtaskId, status: newStatus },
        token
      );
      // Re-fetch subtask details
      const subtasksResponse = await apiHandler.GetApi(
        api_url.getSubtasks + projectId,
        token
      );
      let foundSubtask = null;
      if (
        subtasksResponse.success &&
        Array.isArray(subtasksResponse.subtasks)
      ) {
        foundSubtask = subtasksResponse.subtasks.find(
          (s) => String(s.subtask_id) === String(subtaskId)
        );
      }
      setSubtask(foundSubtask || null);

      // Refresh activity log
      await fetchActivityLog(subtaskId, token);
    } catch (error) {
      console.error("Error updating subtask status:", error);
    }
  };

  const handleImageClick = (image) => {
    setSelectedImage(image);
    setShowImageModal(true);
  };

  const handleEditSubtask = () => {
    setEditingSubtask({
      subtask_title: subtask.subtask_title,
      description: subtask.description,
      assigned_member: subtask.assigned_member,
      images: subtask.images || [],
      dueDate: subtask.dueDate ? subtask.dueDate.substring(0, 10) : "",
    });
    setSelectedImages([]); // Reset selected images
    setShowEditModal(true);
    setOpenDropdownId(null);
  };

  const handleDeleteSubtask = async () => {
    if (window.confirm("Are you sure you want to delete this subtask?")) {
      const token = localStorage.getItem("token");
      try {
        await apiHandler.PostApi(
          api_url.deleteSubtask,
          { subtask_id: subtaskId },
          token
        );
        // Navigate back to phase details
        navigate("/PhaseDetails", {
          state: { phaseId, projectId },
        });
      } catch (error) {
        console.error("Error deleting subtask:", error);
      }
    }
    setOpenDropdownId(null);
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    setIsUploading(true);
    setUploadProgress(0);
    setToast({ message: "", type: "success" });
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append("subtask_id", subtaskId);
      formData.append("subtask_title", editingSubtask.subtask_title);
      formData.append("description", editingSubtask.description);
      formData.append("assigned_member", editingSubtask.assigned_member);
      if (editingSubtask.dueDate) formData.append("dueDate", editingSubtask.dueDate);

      // Add existing images (if any)
      if (editingSubtask.images && editingSubtask.images.length > 0) {
        // Filter out preview URLs and keep only actual image data
        const existingImages = editingSubtask.images.filter(
          (img) => !img.startsWith("blob:") // Keep only non-preview images
        );
        if (existingImages.length > 0) {
          formData.append("existing_images", JSON.stringify(existingImages));
        }
      }

      // Add new selected images
      if (selectedImages.length > 0) {
        selectedImages.forEach((image) => {
          formData.append("images", image);
        });
      }

      console.log("Uploading images:", selectedImages.length, "files");
      console.log("Existing images:", editingSubtask.images?.length || 0);
      console.log("FormData entries:");
      for (let [key, value] of formData.entries()) {
        console.log(key, value);
      }

      // Use imageUpload method for FormData with progress tracking
      const response = await apiHandler.imageUpload(
        api_url.editSubtask,
        formData,
        token,
        (progress) => setUploadProgress(progress)
      );

      if (!response.success) {
        throw new Error(response.message || "Failed to update subtask");
      }

      console.log("Upload successful:", response);

      // Close modal first
      setShowEditModal(false);
      setEditingSubtask(null);
      setSelectedImages([]);

      // Re-fetch subtask details with a small delay to ensure server has processed the update
      setTimeout(async () => {
        try {
          const subtasksResponse = await apiHandler.GetApi(
            api_url.getSubtasks + projectId,
            token
          );
          let foundSubtask = null;
          if (
            subtasksResponse.success &&
            Array.isArray(subtasksResponse.subtasks)
          ) {
            foundSubtask = subtasksResponse.subtasks.find(
              (s) => String(s.subtask_id) === String(subtaskId)
            );
          }
          console.log(
            "Re-fetched subtask:",
            foundSubtask?.images?.length || 0,
            "images"
          );
          setSubtask(foundSubtask || null);

          // Refresh activity log
          await fetchActivityLog(subtaskId, token);
        } catch (error) {
          console.error("Error re-fetching subtask data:", error);
        }
      }, 500); // Small delay to ensure server has processed the update

      setToast({ message: "Subtask updated successfully!", type: "success" });
    } catch (error) {
      console.error("Error updating subtask:", error);
      setToast({
        message: error.message || "Failed to update subtask",
        type: "error",
      });
      // Keep modal open if there's an error so user can try again
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);

    // Count existing images (excluding blob URLs which are previews)
    const existingImages = editingSubtask.images
      ? editingSubtask.images.filter((img) => !img.startsWith("blob:"))
      : [];

    // Check if adding these files would exceed the 2-image limit
    const totalImages = existingImages.length + files.length;

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

    setSelectedImages(files);

    // Note: We don't add preview URLs to editingSubtask.images anymore
    // as we want to keep existing images separate from new previews
  };

  const handleRemoveExistingImage = (indexToRemove) => {
    setEditingSubtask((prev) => ({
      ...prev,
      images: prev.images.filter((_, index) => index !== indexToRemove),
    }));
  };

  const handleRemoveNewImage = (indexToRemove) => {
    setSelectedImages((prev) =>
      prev.filter((_, index) => index !== indexToRemove)
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString();
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffInSeconds = Math.floor((now - activityTime) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600)
      return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000)
      return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return activityTime.toLocaleDateString();
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case "status_update":
        return <CheckCircle size={14} className="text-blue-600" />;
      case "assignment":
        return <User size={14} className="text-green-600" />;
      case "creation":
        return <Activity size={14} className="text-purple-600" />;
      default:
        return <Activity size={14} className="text-gray-600" />;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case "status_update":
        return "bg-blue-500";
      case "assignment":
        return "bg-green-500";
      case "creation":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "High":
        return "bg-red-100 text-red-800";
      case "Medium":
        return "bg-yellow-100 text-yellow-800";
      case "Low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case "High":
        return <Flag size={14} className="text-red-600" />;
      case "Medium":
        return <Flag size={14} className="text-yellow-600" />;
      case "Low":
        return <Flag size={14} className="text-green-600" />;
      default:
        return <Flag size={14} className="text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!subtask) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Subtask Not Found
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
                navigate("/PhaseDetails", {
                  state: { phaseId, projectId },
                })
              }
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {subtask.subtask_title}
              </h1>
              <p className="text-sm text-gray-500">Subtask Details</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(
                subtask.status
              )}`}
            >
              {getStatusText(subtask.status)}
            </span>
            <div className="relative">
              <button
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() =>
                  setOpenDropdownId(
                    openDropdownId === subtask.subtask_id
                      ? null
                      : subtask.subtask_id
                  )
                }
              >
                <MoreVertical size={16} className="text-gray-500" />
              </button>
              {openDropdownId === subtask.subtask_id && (
                <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                  <button
                    onClick={handleEditSubtask}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Edit size={14} />
                    Edit
                  </button>
                  <button
                    onClick={handleDeleteSubtask}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                  >
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
              {/* Subtask Description */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Description
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Status:</span>
                    <select
                      value={subtask.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  {subtask.description || "No description available"}
                </p>
              </div>

              {/* Progress Tracking */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Activity size={18} className="text-blue-600" />
                  Progress Tracking
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Progress</span>
                      <span className="text-gray-900 font-medium">
                        {subtask.status === "Completed"
                          ? "100%"
                          : subtask.status === "In Progress"
                          ? "50%"
                          : "0%"}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          subtask.status === "Completed"
                            ? "bg-green-500 w-full"
                            : subtask.status === "In Progress"
                            ? "bg-blue-500 w-1/2"
                            : "bg-gray-300 w-0"
                        }`}
                      ></div>
                    </div>
                  </div>

                  {/* Priority Level */}
                  <div className="flex items-center gap-2">
                    {getPriorityIcon(subtask.priority || "Low")}
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${getPriorityColor(
                        subtask.priority || "Low"
                      )}`}
                    >
                      {subtask.priority || "Low"} Priority
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Activity size={18} className="text-blue-600" />
                  Recent Activity
                </h3>
                <div className="space-y-3">
                  {activityLog.length > 0 ? (
                    activityLog.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3">
                        <div
                          className={`w-2 h-2 rounded-full ${getActivityColor(
                            activity.type
                          )} mt-2`}
                        ></div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-700">
                            {activity.details}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatTimeAgo(activity.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500">
                        No activity recorded yet
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Images Section */}
              {subtask.images && subtask.images.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <ImageIcon size={18} className="text-blue-600" />
                    Images ({subtask.images.length})
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {subtask.images.map((image, index) => (
                      <div
                        key={`${image}-${index}`}
                        className="relative group cursor-pointer"
                        onClick={() => handleImageClick(image)}
                      >
                        <img
                          src={image}
                          alt={`Subtask image ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border border-gray-200 group-hover:border-blue-300 transition-colors"
                          onError={(e) => {
                            console.error("Failed to load image:", image);
                            e.target.style.display = "none";
                          }}
                          onLoad={() => {
                            console.log("Successfully loaded image:", image);
                          }}
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
                          <Eye
                            size={20}
                            className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Assigned Member */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <User size={18} className="text-blue-600" />
                  Assigned Member
                </h3>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                    {getAssignedMemberName(subtask.assigned_member)
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {getAssignedMemberName(subtask.assigned_member)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {subtask.assigned_member}
                    </p>
                  </div>
                </div>
              </div>

              {/* Subtask Info */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Subtask Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500">
                      Subtask ID
                    </label>
                    <p className="text-sm text-gray-900">
                      {subtask.subtask_id}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">
                      Phase ID
                    </label>
                    <p className="text-sm text-gray-900">{subtask.phase_id}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">
                      Assigned Team
                    </label>
                    <p className="text-sm text-gray-900">
                      {subtask.assigned_team || "Not assigned"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">
                      Due Date
                    </label>
                    <p className="text-sm text-gray-900 flex items-center gap-1">
                      <CalendarDays size={12} className="text-gray-500" />
                      {subtask.dueDate
                        ? formatDate(subtask.dueDate)
                        : "Not set"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">
                      Created
                    </label>
                    <p className="text-sm text-gray-900">
                      {formatDate(subtask.createdAt)}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">
                      Updated
                    </label>
                    <p className="text-sm text-gray-900">
                      {formatDate(subtask.updatedAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {showImageModal && selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <img
              src={selectedImage}
              alt="Full size image"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Edit Subtask Modal */}
      {showEditModal && editingSubtask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md relative">
            {isUploading && (
              <div className="absolute inset-0 bg-white bg-opacity-90 rounded-xl flex items-center justify-center z-10">
                <div className="text-center">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-gray-700 font-medium">
                    Updating Subtask...
                  </p>
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
                Edit Subtask
              </h3>
              <form onSubmit={handleSubmitEdit} encType="multipart/form-data">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Task Title
                    </label>
                    <input
                      type="text"
                      value={editingSubtask.subtask_title}
                      onChange={(e) =>
                        setEditingSubtask((prev) => ({
                          ...prev,
                          subtask_title: e.target.value,
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
                      value={editingSubtask.description}
                      onChange={(e) =>
                        setEditingSubtask((prev) => ({
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                    <input
                      type="date"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={editingSubtask.dueDate || ""}
                      onChange={(e) => setEditingSubtask(prev => ({ ...prev, dueDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assign To
                    </label>
                    <select
                      value={editingSubtask.assigned_member}
                      onChange={(e) =>
                        setEditingSubtask((prev) => ({
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
                      Images (
                      {(editingSubtask.images
                        ? editingSubtask.images.filter(
                            (img) => !img.startsWith("blob:")
                          ).length
                        : 0) + selectedImages.length}
                      /2)
                    </label>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    {/* Show existing images */}
                    {editingSubtask.images &&
                      editingSubtask.images.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-600 mb-2">
                            Existing Images:
                          </p>
                          <div className="flex gap-2 flex-wrap">
                            {editingSubtask.images
                              .filter((img) => !img.startsWith("blob:"))
                              .map((image, index) => (
                                <div
                                  key={`existing-${index}`}
                                  className="relative group"
                                >
                                  <img
                                    src={image}
                                    alt={`Existing ${index + 1}`}
                                    className="w-16 h-16 rounded object-cover border border-gray-300 group-hover:border-red-300 transition-colors"
                                  />
                                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded flex items-center justify-center">
                                    <button
                                      type="button"
                                      className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={(e) => {
                                        e.stopPropagation(); // Prevent image click
                                        handleRemoveExistingImage(index);
                                      }}
                                      title="Remove image"
                                    >
                                      ×
                                    </button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                    {/* Show new image previews */}
                    {selectedImages.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-600 mb-2">
                          New Images:
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          {selectedImages.map((image, index) => (
                            <div
                              key={`new-${index}`}
                              className="relative group"
                            >
                              <img
                                src={URL.createObjectURL(image)}
                                alt={`New ${index + 1}`}
                                className="w-16 h-16 rounded object-cover border border-green-300 group-hover:border-red-300 transition-colors"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded flex items-center justify-center">
                                <button
                                  type="button"
                                  className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation(); // Prevent image click
                                    handleRemoveNewImage(index);
                                  }}
                                  title="Remove image"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingSubtask(null);
                      setSelectedImages([]);
                    }}
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
                    className={`px-4 py-2 rounded-lg ${
                      isUploading
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700"
                    } text-white`}
                  >
                    {isUploading ? "Updating..." : "Update Subtask"}
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

export default SubtaskDetails;
