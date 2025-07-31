import { Plus, Users, Trash2, CalendarDays, Pencil, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { api_url } from "@/api/Api";
import { apiHandler } from "@/api/ApiHandler";

const Section_a = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [employees, setEmployees] = useState([]);
  const [teamLeads, setTeamLeads] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingProject, setDeletingProject] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  console.log(projects, "projects=====>");


  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      try {
        const response = await apiHandler.GetApi(api_url.getAllProjects, token);
        if (Array.isArray(response.projects)) {
          setProjects(
            response.projects.filter(
              (p) =>
                p.project_status === "ongoing" || p.project_status === "on hold"
            )
          );
        } else {
          setError(response?.message || "Failed to fetch projects");
        }
      } catch (err) {
        setError("Failed to fetch projects");
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  useEffect(() => {
    const fetchTeams = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await apiHandler.GetApi(api_url.getAllTeams, token);
        setTeams(Array.isArray(res.teams) ? res.teams : []);
      } catch {
        setTeams([]);
      }
    };
    fetchTeams();
  }, []);

  useEffect(() => {
    const fetchEmployees = async () => {
      const token = localStorage.getItem("token");
      try {
        const response = await apiHandler.GetApi(api_url.getAllEmployees, token);
        if (Array.isArray(response)) {
          setEmployees(response);
        } else if (Array.isArray(response.employees)) {
          setEmployees(response.employees);
        } else {
          setEmployees([]);
        }
      } catch {
        setEmployees([]);
      }
    };
    fetchEmployees();
  }, []);

  useEffect(() => {
    const fetchTeamLeads = async () => {
      const token = localStorage.getItem("token");
      try {
        const response = await apiHandler.GetApi(api_url.getAllTeamLeads, token);
        if (Array.isArray(response)) {
          setTeamLeads(response);
        } else if (Array.isArray(response.teamLeads)) {
          setTeamLeads(response.teamLeads);
        } else {
          setTeamLeads([]);
        }
      } catch {
        setTeamLeads([]);
      }
    };
    fetchTeamLeads();
  }, []);

  const getTeamName = (teamId) => {
    const team = teams.find((t) => t._id === teamId);
    return team ? team.teamName : "—";
  };

  const handleCardClick = (project) => {
    navigate("/ProjectDetails", { state: { project_id: project.project_id } });
  };

  const handleEditClick = (e, project) => {
    e.stopPropagation();
    setEditingProject(project);
    setShowEditModal(true);
    setEditError("");
  };

  const validateEditForm = () => {
    const errors = [];
    
    if (!editingProject.project_name?.trim()) {
      errors.push("Project name is required");
    }
    if (!editingProject.client_name?.trim()) {
      errors.push("Client name is required");
    }
    if (!editingProject.project_description?.trim()) {
      errors.push("Project description is required");
    }
    if (!editingProject.start_date) {
      errors.push("Start date is required");
    }
    if (!editingProject.end_date || (editingProject.end_date !== "Ongoing" && !editingProject.end_date.trim())) {
      errors.push("Please select an end date option");
    }
    if (!editingProject.project_lead) {
      errors.push("Project lead is required");
    }
    
    return errors;
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    // Client-side validation
    const validationErrors = validateEditForm();
    if (validationErrors.length > 0) {
      setEditError(validationErrors.join(", "));
      return;
    }
    
    setEditLoading(true);
    setEditError("");

    const token = localStorage.getItem("token");
    try {
      const response = await apiHandler.PutApi(
        api_url.getAllProjects + "/" + editingProject.project_id,
        editingProject,
        token
      );

      if (response.message && response.message.includes("updated")) {
        setShowEditModal(false);
        setEditingProject(null);
        // Refresh projects list
        const projectsResponse = await apiHandler.GetApi(api_url.getAllProjects, token);
        if (Array.isArray(projectsResponse.projects)) {
          setProjects(
            projectsResponse.projects.filter(
              (p) =>
                p.project_status === "ongoing" || p.project_status === "on hold"
            )
          );
        }
      } else {
        setEditError(response.message || "Failed to update project");
      }
    } catch (err) {
      setEditError("Failed to update project");
    } finally {
      setEditLoading(false);
    }
  };

  const handleEditChange = (field, value) => {
    setEditingProject(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTeamMemberToggle = (memberId) => {
    setEditingProject(prev => {
      const currentMembers = prev.team_members || [];
      const isMember = currentMembers.includes(memberId);

      if (isMember) {
        // Remove member
        return {
          ...prev,
          team_members: currentMembers.filter(id => id !== memberId)
        };
      } else {
        // Add member
        return {
          ...prev,
          team_members: [...currentMembers, memberId]
        };
      }
    });
  };

  const isTeamMember = (memberId) => {
    return editingProject?.team_members?.includes(memberId) || false;
  };

  const handleDeleteClick = (e, project) => {
    e.stopPropagation();
    setDeletingProject(project);
    setShowDeleteModal(true);
    setDeleteError("");
  };

  const handleDeleteConfirm = async () => {
    setDeleteLoading(true);
    setDeleteError("");

    const token = localStorage.getItem("token");
    try {
      const response = await apiHandler.DeleteApi(
        api_url.getAllProjects + "/" + deletingProject.project_id,
        token
      );

      if (response.message && response.message.includes("deleted")) {
        setShowDeleteModal(false);
        setDeletingProject(null);
        // Remove the deleted project from the list
        setProjects(prev => prev.filter(p => p.project_id !== deletingProject.project_id));
      } else {
        setDeleteError(response.message || "Failed to delete project");
      }
    } catch (err) {
      setDeleteError("Failed to delete project");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex justify-center px-6 py-12 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="w-full max-w-7xl">
        {/* Header Section */}
        <div className="mb-10">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-2">All Projects</h2>
              <p className="text-gray-600 text-lg">Manage and track your project portfolio</p>
            </div>
            <button
              onClick={() => navigate("/CreateProject")}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl flex items-center gap-3 text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <Plus size={18} /> Add Project
            </button>
          </div>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center gap-3 text-gray-500 text-lg">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              Loading projects...
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md mx-auto">
              <div className="text-red-600 text-lg font-medium">{error}</div>
            </div>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center text-gray-500 text-lg py-20">
            No Project
          </div>)
          : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-8">
              {projects.map((project, index) => (
                <div
                  key={project._id || index}
                  onClick={() => handleCardClick(project)}
                  className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-gray-100 cursor-pointer transition-all duration-300 transform hover:-translate-y-2 overflow-hidden"
                >
                  {/* Card Header with Actions */}
                  <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                    <button
                      onClick={(e) => handleEditClick(e, project)}
                      className="p-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-md hover:bg-blue-50 transition-colors duration-200"
                    >
                      <Pencil size={16} className="text-gray-600 hover:text-blue-600" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteClick(e, project)}
                      className="p-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-md hover:bg-red-50 transition-colors duration-200"
                    >
                      <Trash2 size={16} className="text-red-500 hover:text-red-700" />
                    </button>
                  </div>

                  {/* Status Badge */}
                  <div className="absolute top-4 left-4">
                    <span
                      className={`px-4 py-2 rounded-full text-xs font-bold capitalize shadow-lg ${project.project_status === "completed"
                        ? "bg-gradient-to-r from-green-400 to-green-600 text-white"
                        : project.project_status === "on hold"
                          ? "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white"
                          : "bg-gradient-to-r from-blue-400 to-indigo-600 text-white"
                        }`}
                    >
                      {project.project_status}
                    </span>
                  </div>

                  {/* Card Content */}
                  <div className="p-6 pt-16">
                    {/* Project Title */}
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1 capitalize">
                        {project.project_name}
                      </h3>
                      <p className="text-gray-600 text-sm leading-relaxed line-clamp-3 min-h-[4.5rem] capitalize">
                        {project.project_description || "No description available"}
                      </p>
                    </div>

                    {/* Project Stats */}
                    <div className="space-y-4">
                      {/* Team Members */}
                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Users size={16} className="text-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {project.team_members?.length || 0}   Members
                          </div>
                          <div className="text-xs text-gray-500">Team size</div>
                        </div>
                      </div>

                      {/* Team Info */}
                      <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <svg
                            width="16"
                            height="16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            viewBox="0 0 24 24"
                            className="text-purple-600"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 6v6l4 2" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {getTeamName(project.team_id) || "No team"}
                          </div>
                          <div className="text-xs text-gray-500">Assigned team</div>
                        </div>
                      </div>

                      {/* Timeline */}
                      <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <svg
                            width="16"
                            height="16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            viewBox="0 0 24 24"
                            className="text-green-600"
                          >
                            <rect x="3" y="4" width="18" height="18" rx="2" />
                            <path d="M16 2v4" />
                            <path d="M8 2v4" />
                            <path d="M3 10h18" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-gray-900">
                            {project.start_date || "Not set"} - {project.end_date || "Not set"}
                          </div>
                          <div className="text-xs text-gray-500">Project timeline</div>
                        </div>
                      </div>
                    </div>

                    {/* Hover Effect Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </div>

      {/* Edit Project Modal */}
      {showEditModal && editingProject && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold">Edit Project</h3>
                  <p className="text-blue-100 text-sm mt-1">Update project details and team assignments</p>
                </div>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingProject(null);
                  }}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors duration-200"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-8 max-h-[calc(95vh-120px)] overflow-y-auto">
              <form onSubmit={handleEditSubmit} className="space-y-8">
                {/* Basic Information Section */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    Basic Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Project Name
                      </label>
                      <input
                        type="text"
                        value={editingProject.project_name || ""}
                        onChange={(e) => handleEditChange("project_name", e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 bg-white shadow-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Client Name
                      </label>
                      <input
                        type="text"
                        value={editingProject.client_name || ""}
                        onChange={(e) => handleEditChange("client_name", e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 bg-white shadow-sm"
                        required
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Project Description
                      </label>
                      <textarea
                        value={editingProject.project_description || ""}
                        onChange={(e) => handleEditChange("project_description", e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 bg-white shadow-sm resize-none"
                        rows={4}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Timeline Section */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Timeline
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={editingProject.start_date || ""}
                        onChange={(e) => handleEditChange("start_date", e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 bg-white shadow-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        End Date / Project Duration
                      </label>
                      <div className="space-y-2">
                        <select
                          value={editingProject.end_date === "Ongoing" ? "ongoing" : editingProject.end_date ? "specific" : "ongoing"}
                          onChange={(e) => {
                            if (e.target.value === "ongoing") {
                              handleEditChange("end_date", "Ongoing");
                            } else {
                              handleEditChange("end_date", "");
                            }
                          }}
                          className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 bg-white shadow-sm"
                        >
                          <option value="ongoing">Ongoing</option>
                          <option value="specific">Select Specific Date</option>
                        </select>
                        {editingProject.end_date !== "Ongoing" && (
                          <input
                            type="date"
                            value={editingProject.end_date && editingProject.end_date !== "Ongoing" ? editingProject.end_date : ""}
                            onChange={(e) => handleEditChange("end_date", e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 bg-white shadow-sm"
                            required={editingProject.end_date !== "Ongoing"}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Project Settings Section */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    Project Settings
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Project Status
                      </label>
                      <select
                        value={editingProject.project_status || "ongoing"}
                        onChange={(e) => handleEditChange("project_status", e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 bg-white shadow-sm"
                      >
                        <option value="ongoing">🟢 Ongoing</option>
                        <option value="completed">✅ Completed</option>
                        <option value="on hold">⏸️ On Hold</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Project Lead
                      </label>
                      <select
                        value={editingProject.project_lead || ""}
                        onChange={(e) => handleEditChange("project_lead", e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 bg-white shadow-sm"
                        required
                      >
                        <option value="">Select Project Lead</option>
                        {teamLeads.map((lead) => (
                          <option key={lead.teamMemberId} value={lead.teamMemberId}>
                            {lead.name} ({lead.teamMemberId})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Team
                      </label>
                      <select
                        value={editingProject.team_id || ""}
                        onChange={(e) => handleEditChange("team_id", e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 bg-white shadow-sm"
                      >
                        <option value="">Select Team</option>
                        {teams.map((team) => (
                          <option key={team._id} value={team._id}>
                            {team.teamName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Team Members Section */}
                <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-2xl p-6 border border-orange-100">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    Team Members ({editingProject?.team_members?.length || 0} selected)
                  </h4>
                  <div className="bg-white border border-gray-200 rounded-xl p-4 max-h-60 overflow-y-auto shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {employees.map((employee) => (
                        <label key={employee.teamMemberId} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors duration-200">
                          <input
                            type="checkbox"
                            checked={isTeamMember(employee.teamMemberId)}
                            onChange={() => handleTeamMemberToggle(employee.teamMemberId)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                          />
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 text-white font-bold text-xs">
                              {employee.name.charAt(0).toUpperCase()}
                            </span>
                            <span className="text-sm font-medium text-gray-900">
                              {employee.name}
                            </span>
                            <span className="text-xs text-gray-500">({employee.teamMemberId})</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Error Message */}
                {editError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-red-700 font-medium">{editError}</span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingProject(null);
                    }}
                    className="px-6 py-3 text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium"
                    disabled={editLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                    disabled={editLoading}
                  >
                    {editLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Updating...
                      </div>
                    ) : (
                      "Update Project"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Project Confirmation Modal */}
      {showDeleteModal && deletingProject && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Delete Project</h3>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingProject(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-700">
                Do you want to delete <span className="font-semibold text-gray-900">{deletingProject.project_name}</span>?
              </p>
              <p className="text-sm text-gray-500 mt-2">
                This action cannot be undone. The project will be permanently removed.
              </p>
            </div>

            {deleteError && (
              <div className="text-red-600 text-sm mb-4">{deleteError}</div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingProject(null);
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                disabled={deleteLoading}
              >
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Section_a;
