import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Users,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { api_url } from "@/api/Api";
import { apiHandler } from "@/api/ApiHandler";

const PhasesTab = ({ project }) => {
  const navigate = useNavigate();
  const [phases, setPhases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPhase, setEditingPhase] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [newPhase, setNewPhase] = useState({
    title: "",
    description: "",
    assigned_members: [],
    status: "pending",
  });

  useEffect(() => {
    const fetchData = async () => {
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

        // TODO: Fetch phases from backend when API is ready
        // For now, using mock data
        setPhases([
          {
            id: 1,
            title: "Project Planning",
            description: "Define project scope, objectives, and deliverables",
            status: "completed",
            assigned_members: ["EMP001", "EMP002"],
            created_at: "2024-01-15",
            due_date: "2024-01-30",
          },
          {
            id: 2,
            title: "Design Phase",
            description:
              "Create wireframes, mockups, and design specifications",
            status: "in_progress",
            assigned_members: ["EMP003"],
            created_at: "2024-01-20",
            due_date: "2024-02-15",
          },
          {
            id: 3,
            title: "Development Phase",
            description:
              "Implement features and functionality according to specifications",
            status: "pending",
            assigned_members: ["EMP001", "EMP004"],
            created_at: "2024-02-01",
            due_date: "2024-03-15",
          },
        ]);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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

  const getAssignedMembers = (memberIds) => {
    if (!memberIds || !employees.length) return [];
    return employees.filter((emp) => memberIds.includes(emp.teamMemberId));
  };

  const handleAddPhase = () => {
    setNewPhase({
      title: "",
      description: "",
      assigned_members: [],
      status: "pending",
    });
    setShowAddModal(true);
  };

  const handleEditPhase = (phase) => {
    setEditingPhase(phase);
    setShowEditModal(true);
  };

  const handleDeletePhase = async (phaseId) => {
    if (window.confirm("Are you sure you want to delete this phase?")) {
      // TODO: Implement delete API call
      setPhases((prev) => prev.filter((phase) => phase.id !== phaseId));
    }
  };

  const handlePhaseClick = (phase) => {
    navigate("/PhaseDetails", {
      state: {
        phaseId: phase.id,
        projectId: project?.project_id,
      },
    });
  };

  const handleSubmitPhase = async (phaseData, isEdit = false) => {
    try {
      // TODO: Implement API call to save phase
      if (isEdit) {
        setPhases((prev) =>
          prev.map((phase) =>
            phase.id === editingPhase.id ? { ...phase, ...phaseData } : phase
          )
        );
        setShowEditModal(false);
        setEditingPhase(null);
      } else {
        const newPhaseData = {
          ...phaseData,
          id: Date.now(),
          created_at: new Date().toISOString().split("T")[0],
        };
        setPhases((prev) => [...prev, newPhaseData]);
        setShowAddModal(false);
        setNewPhase({
          title: "",
          description: "",
          assigned_members: [],
          status: "pending",
        });
      }
    } catch (error) {
      console.error("Error saving phase:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Project Phases</h2>
          <p className="text-gray-600">
            Manage and track project phases and tasks
          </p>
        </div>
        <button
          onClick={handleAddPhase}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={16} />
          Add Phase
        </button>
      </div>

      {/* Phases Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {phases.map((phase) => (
          <div
            key={phase.id}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
          >
            {/* Phase Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {phase.title}
                </h3>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                    phase.status
                  )}`}
                >
                  {getStatusText(phase.status)}
                </span>
              </div>
              <div className="relative">
                <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                  <MoreVertical size={16} className="text-gray-500" />
                </button>
                <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                  <button
                    onClick={() => handleEditPhase(phase)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Edit size={14} />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeletePhase(phase.id)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </div>
            </div>

            {/* Phase Description */}
            <p className="text-gray-600 text-sm mb-4 line-clamp-3">
              {phase.description}
            </p>

            {/* Phase Stats */}
            <div className="space-y-3">
              {/* Assigned Members */}
              <div className="flex items-center gap-2">
                <Users size={14} className="text-gray-500" />
                <span className="text-xs text-gray-600">
                  {getAssignedMembers(phase.assigned_members).length} members
                  assigned
                </span>
              </div>

              {/* Due Date */}
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-gray-500" />
                <span className="text-xs text-gray-600">
                  Due: {phase.due_date || "Not set"}
                </span>
              </div>

              {/* Status Icon */}
              <div className="flex items-center gap-2">
                {getStatusIcon(phase.status)}
                <span className="text-xs text-gray-600">
                  {getStatusText(phase.status)}
                </span>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={() => handlePhaseClick(phase)}
              className="w-full mt-4 bg-gray-50 hover:bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              View Details
            </button>
          </div>
        ))}
      </div>

      {/* Add Phase Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Add New Phase
              </h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmitPhase(newPhase);
                }}
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phase Title
                    </label>
                    <input
                      type="text"
                      value={newPhase.title}
                      onChange={(e) =>
                        setNewPhase((prev) => ({
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
                      value={newPhase.description}
                      onChange={(e) =>
                        setNewPhase((prev) => ({
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
                      Status
                    </label>
                    <select
                      value={newPhase.status}
                      onChange={(e) =>
                        setNewPhase((prev) => ({
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
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add Phase
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Phase Modal */}
      {showEditModal && editingPhase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Edit Phase
              </h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmitPhase(editingPhase, true);
                }}
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phase Title
                    </label>
                    <input
                      type="text"
                      value={editingPhase.title}
                      onChange={(e) =>
                        setEditingPhase((prev) => ({
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
                      value={editingPhase.description}
                      onChange={(e) =>
                        setEditingPhase((prev) => ({
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
                      Status
                    </label>
                    <select
                      value={editingPhase.status}
                      onChange={(e) =>
                        setEditingPhase((prev) => ({
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
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingPhase(null);
                    }}
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
    </div>
  );
};

export default PhasesTab;
