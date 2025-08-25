import { useState, useEffect, useRef } from "react";
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
  ChevronDown,
  Circle,
  Play,
  Eye,
  Shield,
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
    status: "Pending",
    due_date: "",
  });
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [draggedPhase, setDraggedPhase] = useState(null);
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

  // Dynamic columns based on API data - will be populated after fetching phases
  const [columns, setColumns] = useState([
    {
      id: "Pending",
      title: "Pending",
      icon: <Circle size={16} className="text-gray-500" />,
      color: "text-gray-700",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-300",
    },
    {
      id: "In Progress",
      title: "In Progress",
      icon: <Play size={16} className="text-orange-500" />,
      color: "text-orange-700",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-300",
    },
    {
      id: "Completed",
      title: "Completed",
      icon: <CheckCircle size={16} className="text-green-500" />,
      color: "text-green-700",
      bgColor: "bg-green-50",
      borderColor: "border-green-300",
    },
    {
      id: "final_checks",
      title: "Final Checks",
      icon: <Shield size={16} className="text-emerald-600" />,
      color: "text-emerald-800",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-400",
      requiresAuth: true,
    },
  ]);

  // Function to generate columns based on available statuses from API
  const generateColumns = (phases) => {
    // Always show all available statuses, not just the ones currently used
    const allStatuses = ["Pending", "In Progress", "Completed", "final_checks"];

    const columnConfigs = {
      Pending: {
        icon: <Circle size={16} className="text-gray-500" />,
        color: "text-gray-700",
        bgColor: "bg-gray-50",
        borderColor: "border-gray-300",
      },
      "In Progress": {
        icon: <Play size={16} className="text-orange-500" />,
        color: "text-orange-700",
        bgColor: "bg-orange-50",
        borderColor: "border-orange-300",
      },
      Completed: {
        icon: <CheckCircle size={16} className="text-green-500" />,
        color: "text-green-700",
        bgColor: "bg-green-50",
        borderColor: "border-green-300",
      },
      final_checks: {
        icon: <Shield size={16} className="text-emerald-600" />,
        color: "text-emerald-800",
        bgColor: "bg-emerald-50",
        borderColor: "border-emerald-400",
        requiresAuth: true,
      },
    };

    const generatedColumns = allStatuses.map((status) => ({
      id: status,
      title: status === "final_checks" ? "Final Checks" : status, // Display "Final Checks" but send "final_checks" to backend
      ...(columnConfigs[status] || {
        icon: <Circle size={16} className="text-gray-500" />,
        color: "text-gray-700",
        bgColor: "bg-gray-50",
        borderColor: "border-gray-300",
      }),
    }));

    setColumns(generatedColumns);
  };

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

        // Fetch phases from backend
        if (project?.project_id) {
          const phasesResponse = await apiHandler.GetApi(
            api_url.getPhases + project.project_id,
            token
          );
          if (phasesResponse.success && Array.isArray(phasesResponse.phases)) {
            setPhases(phasesResponse.phases);
            generateColumns(phasesResponse.phases); // Generate columns after fetching phases
          } else {
            setPhases([]);
            // Don't clear columns - keep all 4 statuses visible
          }
        } else {
          setPhases([]);
          // Don't clear columns - keep all 4 statuses visible
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setPhases([]);
        // Don't clear columns - keep all 4 statuses visible
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [project?.project_id]);

  const getPhasesByStatus = (status) => {
    return phases.filter((phase) => phase.status === status);
  };

  const getAssignedMembers = (memberIds) => {
    if (!memberIds || !employees.length) return [];
    return employees.filter((emp) => memberIds.includes(emp.teamMemberId));
  };

  // Drag and Drop Handlers
  const handleDragStart = (e, phase) => {
    setDraggedPhase(phase);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();

    // Check if target status requires authorization
    const targetColumn = columns.find((col) => col.id === targetStatus);
    if (targetColumn?.requiresAuth && !canAccessFinalChecks) {
      alert(
        "You don't have permission to move phases to Final Checks. Only owner, admin, manager, and team lead can perform this action."
      );
      setDraggedPhase(null);
      return;
    }

    if (draggedPhase && draggedPhase.status !== targetStatus) {
      await handleStatusChange(draggedPhase.phase_id, targetStatus);
    }
    setDraggedPhase(null);
  };

  const handleDragEnd = () => {
    setDraggedPhase(null);
  };

  const handleAddPhase = () => {
    setNewPhase({
      title: "",
      description: "",
      assigned_members: [],
      status: "Pending",
      due_date: "",
    });
    setShowAddModal(true);
  };

  const handleEditPhase = (phase) => {
    setEditingPhase(phase);
    setShowEditModal(true);
  };

  const handleDeletePhase = async (phaseId) => {
    if (window.confirm("Are you sure you want to delete this phase?")) {
      const token = localStorage.getItem("token");
      try {
        await apiHandler.PostApi(
          api_url.deletePhase,
          {
            projectId: project?.project_id,
            phase_id: phaseId,
          },
          token
        );
        // Re-fetch phases
        if (project?.project_id) {
          const phasesResponse = await apiHandler.GetApi(
            api_url.getPhases + project.project_id,
            token
          );
          if (phasesResponse.success && Array.isArray(phasesResponse.phases)) {
            setPhases(phasesResponse.phases);
            generateColumns(phasesResponse.phases); // Regenerate columns after deletion
          }
        }
      } catch (error) {
        console.error("Error deleting phase:", error);
      }
    }
  };

  const handlePhaseClick = (phase) => {
    navigate("/PhaseDetails", {
      state: {
        phaseId: phase.phase_id,
        projectId: project?.project_id,
      },
    });
  };

  const handleStatusChange = async (phaseId, newStatus) => {
    const token = localStorage.getItem("token");

    // Check if the new status requires authorization
    if (newStatus === "final_checks" && !canAccessFinalChecks) {
      alert(
        "You don't have permission to move phases to Final Checks. Only owner, admin, manager, and team lead can perform this action."
      );
      return;
    }

    try {
      // Update phase status in backend - use POST, not PUT
      const response = await apiHandler.PostApi(
        api_url.updatePhaseStatus,
        {
          phaseId: phaseId,
          status: newStatus,
          projectId: project?.project_id,
        },
        token
      );

      if (response && response.success) {
        // Update local state
        setPhases((prev) =>
          prev.map((phase) =>
            phase.phase_id === phaseId ? { ...phase, status: newStatus } : phase
          )
        );
        // Regenerate columns to reflect new status
        generateColumns(phases);
      } else {
        console.error(
          "Failed to update phase status:",
          response?.message || "Unknown error"
        );
        // Optionally show error message to user
      }
    } catch (error) {
      console.error("Error updating phase status:", error);
      // Optionally show error message to user
    }
  };

  const handleSubmitPhase = async (phaseData, isEdit = false) => {
    const token = localStorage.getItem("token");
    try {
      if (isEdit) {
        // For editing, we'll update the phase status via the status update endpoint
        // and handle other fields locally for now since there's no dedicated edit endpoint
        if (phaseData.status !== editingPhase.status) {
          const response = await apiHandler.PostApi(
            api_url.updatePhaseStatus,
            {
              phaseId: editingPhase.phase_id,
              status: phaseData.status,
              projectId: project?.project_id,
            },
            token
          );

          if (response && response.success) {
            setPhases((prev) =>
              prev.map((phase) =>
                phase.phase_id === editingPhase.phase_id
                  ? { ...phase, ...phaseData }
                  : phase
              )
            );
            setShowEditModal(false);
            setEditingPhase(null);
            // Regenerate columns to reflect new status
            generateColumns(phases);
          }
        } else {
          // If only title changed, update locally
          setPhases((prev) =>
            prev.map((phase) =>
              phase.phase_id === editingPhase.phase_id
                ? { ...phase, ...phaseData }
                : phase
            )
          );
          setShowEditModal(false);
          setEditingPhase(null);
        }
      } else {
        // Add phase via API
        const payload = {
          projectId: project?.project_id,
          title: phaseData.title,
          description: phaseData.description || "",
          dueDate: phaseData.due_date || "",
          status: phaseData.status,
        };
        const response = await apiHandler.PostApi(
          api_url.addPhase,
          payload,
          token
        );

        if (response && response.success) {
          // Re-fetch phases
          if (project?.project_id) {
            const phasesResponse = await apiHandler.GetApi(
              api_url.getPhases + project.project_id,
              token
            );
            if (
              phasesResponse.success &&
              Array.isArray(phasesResponse.phases)
            ) {
              setPhases(phasesResponse.phases);
              generateColumns(phasesResponse.phases); // Regenerate columns after adding
            }
          }
          setShowAddModal(false);
          setNewPhase({
            title: "",
            description: "",
            assigned_members: [],
            status: "Pending",
            due_date: "",
          });
        }
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
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Project Phases</h2>
          <p className="text-gray-600">
            Drag and drop phases to change their status
          </p>
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
        <button
          onClick={handleAddPhase}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={16} />
          Add Phase
        </button>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {columns.map((column) => (
          <div key={column.id} className="space-y-4">
            {/* Column Header */}
            <div
              className={`flex items-center gap-2 p-3 rounded-lg ${
                column.bgColor
              } border-2 border-dotted ${column.borderColor} ${
                column.requiresAuth && !canAccessFinalChecks ? "opacity-60" : ""
              }`}
            >
              {column.icon}
              <h3 className={`font-semibold text-sm ${column.color}`}>
                {column.title}
              </h3>
              {column.requiresAuth && !canAccessFinalChecks && (
                <Shield
                  size={12}
                  className="text-emerald-600 ml-auto"
                  title="Restricted Access"
                />
              )}
              {!column.requiresAuth && (
                <ChevronDown size={14} className={`${column.color} ml-auto`} />
              )}
            </div>

            {/* Column Content */}
            <div
              className={`space-y-3 min-h-[400px] p-4 rounded-lg border-2 border-dotted ${
                column.borderColor
              } ${column.bgColor} transition-colors ${
                column.requiresAuth && !canAccessFinalChecks
                  ? "opacity-60 cursor-not-allowed"
                  : ""
              }`}
              onDragOver={
                column.requiresAuth && !canAccessFinalChecks
                  ? undefined
                  : handleDragOver
              }
              onDrop={
                column.requiresAuth && !canAccessFinalChecks
                  ? undefined
                  : (e) => handleDrop(e, column.id)
              }
              style={{
                borderColor:
                  draggedPhase &&
                  draggedPhase.status !== column.id &&
                  !(column.requiresAuth && !canAccessFinalChecks)
                    ? "#3B82F6"
                    : "",
                backgroundColor:
                  draggedPhase &&
                  draggedPhase.status !== column.id &&
                  !(column.requiresAuth && !canAccessFinalChecks)
                    ? "#EFF6FF"
                    : "",
              }}
            >
              {getPhasesByStatus(column.id).map((phase) => (
                <div
                  key={phase.phase_id}
                  className={`bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-all duration-200 cursor-pointer group ${
                    draggedPhase?.phase_id === phase.phase_id
                      ? "opacity-50 scale-95"
                      : "hover:scale-[1.02]"
                  }`}
                  draggable={!(column.requiresAuth && !canAccessFinalChecks)}
                  onDragStart={
                    column.requiresAuth && !canAccessFinalChecks
                      ? undefined
                      : (e) => handleDragStart(e, phase)
                  }
                  onDragEnd={handleDragEnd}
                  onClick={() => handlePhaseClick(phase)}
                >
                  {/* Phase Header with Better Layout */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-tight mb-2">
                        {phase.title}
                      </h4>
                      {/* Status Badge - Moved to top for better visibility */}
                      <div className="flex items-center gap-2 mb-3">
                        <span
                          className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${
                            column.bgColor
                          } ${
                            column.color
                          } border border-opacity-20 ${column.borderColor.replace(
                            "border-",
                            "border-opacity-"
                          )}`}
                        >
                          {column.icon}
                          <span className="ml-1.5">{column.title}</span>
                        </span>
                      </div>
                    </div>

                    {/* Action Menu */}
                    <div
                      className="relative ml-3 flex-shrink-0"
                      ref={dropdownRef}
                    >
                      <button
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(
                            openDropdownId === phase.phase_id
                              ? null
                              : phase.phase_id
                          );
                        }}
                      >
                        <MoreVertical size={16} className="text-gray-500" />
                      </button>
                      {openDropdownId === phase.phase_id && (
                        <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-xl shadow-xl py-2 z-10 min-w-[140px]">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditPhase(phase);
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors"
                          >
                            <Edit size={14} className="text-gray-600" />
                            Edit Phase
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePhase(phase.phase_id);
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors text-red-600 hover:text-red-700"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Phase Meta Information */}
                  <div className="space-y-3">
                    {/* Due Date with Better Styling */}
                    {phase.dueDate && (
                      <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg">
                        <Calendar
                          size={14}
                          className="text-gray-500 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-700">
                            Due Date
                          </p>
                          <p className="text-sm text-gray-900">
                            {phase.dueDate}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Assigned Members with Better Layout */}
                    {phase.assigned_members &&
                      phase.assigned_members.length > 0 && (
                        <div className="flex items-center gap-2 p-2.5 bg-blue-50 rounded-lg">
                          <Users
                            size={14}
                            className="text-blue-500 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-blue-700">
                              Team Members
                            </p>
                            <p className="text-sm text-blue-900">
                              {phase.assigned_members.length} member
                              {phase.assigned_members.length !== 1
                                ? "s"
                                : ""}{" "}
                              assigned
                            </p>
                          </div>
                        </div>
                      )}

                    {/* Phase ID for Reference */}
                    <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg">
                      <div className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700">
                          Phase ID
                        </p>
                        <p className="text-sm text-gray-900 font-mono">
                          {phase.phase_id}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action Bar */}
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        Click to view details
                      </span>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span className="text-xs text-gray-500">Active</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Empty State */}
              {getPhasesByStatus(column.id).length === 0 && (
                <div className="flex items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg bg-white/50">
                  <p className="text-sm text-gray-500">
                    {column.requiresAuth && !canAccessFinalChecks
                      ? "Restricted Access"
                      : "Drop phases here"}
                  </p>
                </div>
              )}
            </div>
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
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      placeholder="Enter phase description..."
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
                      {columns.map((col) => (
                        <option key={col.id} value={col.id}>
                          {col.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={newPhase.due_date}
                      onChange={(e) =>
                        setNewPhase((prev) => ({
                          ...prev,
                          due_date: e.target.value,
                        }))
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
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
                      {columns.map((col) => (
                        <option key={col.id} value={col.id}>
                          {col.title}
                        </option>
                      ))}
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
