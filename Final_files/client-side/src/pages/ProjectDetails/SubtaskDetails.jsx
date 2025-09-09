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
  const [userRole, setUserRole] = useState("");
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const dropdownRef = useRef();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const userType = localStorage.getItem("userType");
    const storedEmployee = localStorage.getItem("employee");
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        setUserRole(u.role || "owner");
        if (userType === "employee") setCurrentEmployee(u);
      } catch {}
    } else if (storedEmployee) {
      try {
        const e = JSON.parse(storedEmployee);
        setUserRole(e.role || "teamMember");
        setCurrentEmployee(e);
      } catch {}
    } else {
      setUserRole("owner");
    }
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
      case "Paused":
        return <AlertCircle size={16} className="text-orange-600" />;
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
      case "Paused":
        return "bg-orange-100 text-orange-800";
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
      case "Paused":
        return "Paused";
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
    if (
      (userRole || "").toLowerCase() === "teammember" &&
      currentEmployee?.teamMemberId &&
      subtask?.assigned_member &&
      currentEmployee.teamMemberId !== subtask.assigned_member
    ) {
      setToast({
        message: "You are not allowed to change the status of other members",
        type: "error",
      });
      return;
    }
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
      formData.append("priority", editingSubtask.priority || "Low");
      if (editingSubtask.dueDate)
        formData.append("dueDate", editingSubtask.dueDate);

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

  // Enhanced Progress Tracking Functions
  const getStatusProgress = (status) => {
    switch (status) {
      case "Completed":
        return 100;
      case "In Progress":
        return 60;
      case "Pending":
        return 20;
      default:
        return 0;
    }
  };

  const getAssignmentProgress = (subtask) => {
    if (!subtask.assigned_member) return 0;
    if (subtask.assigned_team) return 100;
    return 80; // Assigned to member but no team specified
  };

  const getTimeEfficiencyProgress = (subtask) => {
    if (!subtask.dueDate) return 50; // No due date, neutral score

    const dueDate = new Date(subtask.dueDate);
    const now = new Date();
    const timeDiff = dueDate.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    // Calculate time efficiency based on status and remaining time
    if (subtask.status === "Completed") {
      // If completed, reward early completion and penalize late completion
      if (daysDiff >= 7) return 120; // Completed 7+ days early - excellent!
      if (daysDiff >= 3) return 110; // Completed 3-6 days early - very good
      if (daysDiff >= 1) return 105; // Completed 1-2 days early - good
      if (daysDiff === 0) return 100; // Completed on due date
      if (daysDiff >= -1) return 95; // Completed 1 day late
      if (daysDiff >= -3) return 85; // Completed 2-3 days late
      if (daysDiff >= -7) return 75; // Completed within a week late
      return 60; // Completed significantly late
    } else if (subtask.status === "In Progress") {
      // If in progress, check if we're on track
      if (daysDiff > 14) return 90; // Plenty of time left - excellent progress
      if (daysDiff > 7) return 80; // Good amount of time left
      if (daysDiff > 3) return 70; // Reasonable time left
      if (daysDiff > 0) return 60; // Due soon but still time
      if (daysDiff > -3) return 40; // Slightly overdue
      return 20; // Significantly overdue
    } else {
      // If pending, check urgency
      if (daysDiff > 21) return 70; // Plenty of time to start
      if (daysDiff > 14) return 60; // Good amount of time
      if (daysDiff > 7) return 50; // Should start planning
      if (daysDiff > 3) return 40; // Should start soon
      if (daysDiff > 0) return 30; // Urgent - need to start
      return 10; // Overdue and not started
    }
  };

  const getDueDateProgress = (subtask) => {
    if (!subtask.dueDate) return 0;

    const dueDate = new Date(subtask.dueDate);
    const now = new Date();
    const timeDiff = dueDate.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    // More logical due date progress: closer to due date = higher progress
    if (daysDiff < 0) return 20; // Overdue - low progress
    if (daysDiff <= 1) return 90; // Due today/tomorrow - high progress
    if (daysDiff <= 3) return 80; // Due soon
    if (daysDiff <= 7) return 70; // Due this week
    if (daysDiff <= 14) return 50; // Due in 2 weeks
    if (daysDiff <= 30) return 30; // Due in a month
    return 10; // Due later - low progress
  };

  const calculateProgressPercentage = (subtask) => {
    const statusWeight = 0.6; // 60% weight for status
    const timeEfficiencyWeight = 0.4; // 40% weight for time efficiency

    const statusProgress = getStatusProgress(subtask.status);
    const timeEfficiencyProgress = getTimeEfficiencyProgress(subtask);

    const totalProgress =
      statusProgress * statusWeight +
      timeEfficiencyProgress * timeEfficiencyWeight;

    // Cap the progress at 100% but allow for bonus points in insights
    const calculatedProgress = Math.round(totalProgress);

    // For completed tasks, ensure minimum 85% but cap at 100%
    if (subtask.status === "Completed") {
      return Math.min(Math.max(calculatedProgress, 85), 100);
    }

    return Math.min(calculatedProgress, 100);
  };

  const getProgressInsights = (subtask) => {
    const progress = calculateProgressPercentage(subtask);
    const timeEfficiency = getTimeEfficiencyProgress(subtask);

    if (subtask.status === "Completed") {
      // Check for early completion bonuses
      if (timeEfficiency >= 120) {
        return "Outstanding! Completed 7+ days early with excellent efficiency.";
      } else if (timeEfficiency >= 110) {
        return "Excellent! Completed 3-6 days early with very good efficiency.";
      } else if (timeEfficiency >= 105) {
        return "Great job! Completed 1-2 days early with good efficiency.";
      } else if (timeEfficiency === 100) {
        return "Perfect! Completed exactly on the due date.";
      } else if (timeEfficiency >= 95) {
        return "Good completion! Only slightly delayed by 1 day.";
      } else if (timeEfficiency >= 85) {
        return "Completed successfully but 2-3 days late.";
      } else if (timeEfficiency >= 75) {
        return "Completed but significantly delayed (within a week of due date).";
      } else {
        return "Completed but very late. Consider improving time management.";
      }
    } else if (progress >= 80) {
      return "Subtask is nearly complete. Consider final review and testing.";
    } else if (progress >= 60) {
      return "Good progress made. Focus on completing remaining tasks.";
    } else if (progress >= 40) {
      return "Moderate progress. Consider setting intermediate milestones.";
    } else if (progress >= 20) {
      return "Initial progress made. Need more active work to meet deadlines.";
    } else {
      return "Minimal progress. Immediate attention required to stay on track.";
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
        <div className="w-full">
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
                      <option value="Paused">Paused</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  {subtask.description || "No description available"}
                </p>
              </div>

              {/* Enhanced Progress Tracking */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Activity size={18} className="text-blue-600" />
                  Progress Tracking
                </h3>
                <div className="space-y-4">
                  {/* Main Progress Bar */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Overall Progress</span>
                      <span className="text-gray-900 font-medium">
                        {calculateProgressPercentage(subtask)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-500 ${
                          calculateProgressPercentage(subtask) === 100
                            ? "bg-gradient-to-r from-green-500 to-emerald-500"
                            : calculateProgressPercentage(subtask) >= 70
                            ? "bg-gradient-to-r from-blue-500 to-indigo-500"
                            : calculateProgressPercentage(subtask) >= 40
                            ? "bg-gradient-to-r from-yellow-500 to-orange-500"
                            : "bg-gradient-to-r from-gray-400 to-gray-500"
                        }`}
                        style={{
                          width: `${calculateProgressPercentage(subtask)}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Progress Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Status Progress */}
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-600">
                          Status
                        </span>
                        <span className="text-xs font-medium text-gray-900">
                          {getStatusProgress(subtask.status)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            getStatusProgress(subtask.status) === 100
                              ? "bg-green-500"
                              : getStatusProgress(subtask.status) >= 50
                              ? "bg-blue-500"
                              : "bg-gray-400"
                          }`}
                          style={{
                            width: `${getStatusProgress(subtask.status)}%`,
                          }}
                        ></div>
                      </div>
                    </div>

                    {/* Time Efficiency Progress */}
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-600">
                          Time Efficiency
                        </span>
                        <span className="text-xs font-medium text-gray-900">
                          {getTimeEfficiencyProgress(subtask)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            getTimeEfficiencyProgress(subtask) === 100
                              ? "bg-green-500"
                              : getTimeEfficiencyProgress(subtask) >= 50
                              ? "bg-blue-500"
                              : "bg-gray-400"
                          }`}
                          style={{
                            width: `${getTimeEfficiencyProgress(subtask)}%`,
                          }}
                        ></div>
                      </div>
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

                  {/* Progress Insights */}
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <div className="flex items-start gap-2">
                      <AlertCircle
                        size={14}
                        className="text-blue-600 mt-0.5 flex-shrink-0"
                      />
                      <div className="text-xs text-blue-800">
                        <p className="font-medium mb-1">Progress Insights:</p>
                        <p>{getProgressInsights(subtask)}</p>
                      </div>
                    </div>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Due Date
                    </label>
                    <input
                      type="date"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={editingSubtask.dueDate || ""}
                      onChange={(e) =>
                        setEditingSubtask((prev) => ({
                          ...prev,
                          dueDate: e.target.value,
                        }))
                      }
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
                      Priority
                    </label>
                    <select
                      value={editingSubtask.priority || "Low"}
                      onChange={(e) =>
                        setEditingSubtask((prev) => ({
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
