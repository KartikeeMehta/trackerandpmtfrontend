import { useState, useEffect } from "react";
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
} from "lucide-react";
import { api_url } from "@/api/Api";
import { apiHandler } from "@/api/ApiHandler";

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
    status: "pending",
  });

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

        // TODO: Fetch phase details from backend when API is ready
        // For now, using mock data
        setPhase({
          id: phaseId,
          title: "Design Phase",
          description:
            "Create wireframes, mockups, and design specifications for the project. This phase involves working closely with the client to understand their requirements and creating detailed design documents that will guide the development process.",
          status: "in_progress",
          assigned_members: ["EMP001", "EMP003"],
          created_at: "2024-01-20",
          due_date: "2024-02-15",
        });

        setSubtasks([
          {
            id: 1,
            title: "Create wireframes",
            description: "Design basic wireframes for all pages",
            status: "completed",
            assigned_member: "EMP001",
            created_at: "2024-01-21",
          },
          {
            id: 2,
            title: "Design mockups",
            description: "Create high-fidelity mockups",
            status: "in_progress",
            assigned_member: "EMP003",
            created_at: "2024-01-22",
          },
          {
            id: 3,
            title: "Client review",
            description: "Present designs to client for feedback",
            status: "pending",
            assigned_member: "EMP001",
            created_at: "2024-01-23",
          },
        ]);

        setComments([
          {
            id: 1,
            user: "EMP001",
            userName: "John Doe",
            message: "Wireframes completed and ready for review",
            timestamp: "2024-01-21T10:30:00Z",
          },
          {
            id: 2,
            user: "EMP003",
            userName: "Jane Smith",
            message: "Working on mockups, should be done by tomorrow",
            timestamp: "2024-01-22T14:15:00Z",
          },
        ]);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [phaseId, projectId, navigate]);

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircle size={16} className="text-green-600" />;
      case "in_progress":
        return <Clock size={16} className="text-blue-600" />;
      case "pending":
        return <AlertCircle size={16} className="text-yellow-600" />;
      default:
        return <Clock size={16} className="text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "in_progress":
        return "In Progress";
      case "pending":
        return "Pending";
      default:
        return status;
    }
  };

  const getAssignedMemberName = (memberId) => {
    const member = employees.find((emp) => emp.teamMemberId === memberId);
    return member ? member.name : "Unknown";
  };

  const handleStatusChange = (newStatus) => {
    setPhase((prev) => ({ ...prev, status: newStatus }));
    // TODO: Implement API call to update status
  };

  const handleAddSubtask = () => {
    setNewSubtask({
      title: "",
      description: "",
      assigned_member: "",
      status: "pending",
    });
    setShowAddSubtask(true);
  };

  const handleSubmitSubtask = (e) => {
    e.preventDefault();
    const subtaskData = {
      ...newSubtask,
      id: Date.now(),
      created_at: new Date().toISOString().split("T")[0],
    };
    setSubtasks((prev) => [...prev, subtaskData]);
    setShowAddSubtask(false);
    setNewSubtask({
      title: "",
      description: "",
      assigned_member: "",
      status: "pending",
    });
  };

  const handleSubmitComment = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const commentData = {
      id: Date.now(),
      user: "EMP001", // TODO: Get current user
      userName: "Current User", // TODO: Get current user name
      message: newComment,
      timestamp: new Date().toISOString(),
    };

    setComments((prev) => [commentData, ...prev]);
    setNewComment("");
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
            <div className="relative">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <MoreVertical size={16} className="text-gray-500" />
              </button>
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
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
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
                      key={subtask.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      {getStatusIcon(subtask.status)}
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">
                          {subtask.title}
                        </h4>
                        <p className="text-xs text-gray-600">
                          {subtask.description}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Assigned to:{" "}
                          {getAssignedMemberName(subtask.assigned_member)}
                        </p>
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
              {/* Assigned Members */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Users size={18} className="text-blue-600" />
                  Assigned Members
                </h3>
                <div className="space-y-3">
                  {phase.assigned_members.map((memberId) => {
                    const member = employees.find(
                      (emp) => emp.teamMemberId === memberId
                    );
                    return (
                      <div key={memberId} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                          {member?.name.charAt(0).toUpperCase() || "U"}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {member?.name || "Unknown"}
                          </p>
                          <p className="text-xs text-gray-500">{memberId}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Phase Info */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Phase Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500">
                      Created
                    </label>
                    <p className="text-sm text-gray-900">{phase.created_at}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">
                      Due Date
                    </label>
                    <p className="text-sm text-gray-900">
                      {phase.due_date || "Not set"}
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
              {comments.map((comment) => (
                <div key={comment.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                    {comment.userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {comment.userName}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(comment.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{comment.message}</p>
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
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
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddSubtask(false)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add Subtask
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhaseDetails;
