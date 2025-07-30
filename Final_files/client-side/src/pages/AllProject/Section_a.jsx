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

  const handleEditSubmit = async (e) => {
    e.preventDefault();
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
    <div className="min-h-screen flex justify-center px-4 py-10">
      <div className="w-full max-w-8xl rounded-xl p-8 bg-white/80 backdrop-blur-md">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">All Projects</h2>
          <button
            onClick={() => navigate("/CreateProject")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium shadow"
          >
            <Plus size={16} /> Add Project
          </button>
        </div>
        {loading ? (
          <div className="text-center text-gray-500">Loading projects...</div>
        ) : error ? (
          <div className="text-center text-red-600">{error}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {projects.map((project, index) => (
              <div
                key={project._id || index}
                onClick={() => handleCardClick(project)}
                className="relative bg-white/80 rounded-2xl shadow border border-gray-100 cursor-pointer flex flex-col min-h-[200px] p-6 transition-all duration-150 hover:bg-blue-50 hover:shadow-md group overflow-hidden backdrop-blur-md"
                style={{
                  background:
                    "linear-gradient(135deg, #f0f4ff 60%, #e0e7ff 100%)",
                }}
              >
           
                <div className="flex justify-end gap-2 mb-3 items-center">
                  <Pencil
                    size={16}
                    className="text-gray-600 cursor-pointer hover:text-blue-500"
                    onClick={(e) => handleEditClick(e, project)}
                  />
                  <Trash2
                    size={16}
                    className="text-red-600 cursor-pointer hover:text-red-800"
                    onClick={(e) => handleDeleteClick(e, project)}
                  />
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold capitalize shadow-sm ${
                      project.project_status === "completed"
                        ? "bg-green-100 text-green-700"
                        : project.project_status === "on hold"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {project.project_status}
                  </span>
                </div>

                {/* Project content */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1 truncate capitalize">
                      {project.project_name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2 min-h-[2.5em]">
                      {project.project_description}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 mt-2">
                    <div className="flex items-center gap-2 text-xs text-gray-700">
                      <Users size={15} />
                      <span className="font-medium">
                        {project.team_members?.length || 0} members
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-700">
                      <svg
                        width="15"
                        height="15"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        viewBox="0 0 24 24"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 6v6l4 2" />
                      </svg>
                      <span className="font-medium">
                        Team: {getTeamName(project.team_id)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                      <svg
                        width="15"
                        height="15"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        viewBox="0 0 24 24"
                      >
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <path d="M16 2v4" />
                        <path d="M8 2v4" />
                        <path d="M3 10h18" />
                      </svg>
                      <span>Start: {project.start_date || "-"}</span>
                      <span className="ml-2">
                        End: {project.end_date || "-"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Project Modal */}
      {showEditModal && editingProject && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Edit Project</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingProject(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={editingProject.project_name || ""}
                    onChange={(e) => handleEditChange("project_name", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client Name
                  </label>
                  <input
                    type="text"
                    value={editingProject.client_name || ""}
                    onChange={(e) => handleEditChange("client_name", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Description
                  </label>
                  <textarea
                    value={editingProject.project_description || ""}
                    onChange={(e) => handleEditChange("project_description", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    rows={3}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={editingProject.start_date || ""}
                    onChange={(e) => handleEditChange("start_date", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={editingProject.end_date || ""}
                    onChange={(e) => handleEditChange("end_date", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Status
                  </label>
                  <select
                    value={editingProject.project_status || "ongoing"}
                    onChange={(e) => handleEditChange("project_status", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                    <option value="on hold">On Hold</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Lead
                  </label>
                  <select
                    value={editingProject.project_lead || ""}
                    onChange={(e) => handleEditChange("project_lead", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Team
                  </label>
                  <select
                    value={editingProject.team_id || ""}
                    onChange={(e) => handleEditChange("team_id", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="">Select Team</option>
                    {teams.map((team) => (
                      <option key={team._id} value={team._id}>
                        {team.teamName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Team Members
                  </label>
                  <div className="border border-gray-300 rounded-md p-3 max-h-40 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {employees.map((employee) => (
                        <label key={employee.teamMemberId} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isTeamMember(employee.teamMemberId)}
                            onChange={() => handleTeamMemberToggle(employee.teamMemberId)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">
                            {employee.name} ({employee.teamMemberId})
                          </span>
                        </label>
                      ))}
                    </div>
                    {editingProject?.team_members?.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <span className="text-xs text-gray-500">
                          Selected: {editingProject.team_members.length} member(s)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {editError && (
                <div className="text-red-600 text-sm">{editError}</div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingProject(null);
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  disabled={editLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  disabled={editLoading}
                >
                  {editLoading ? "Updating..." : "Update Project"}
                </button>
              </div>
            </form>
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
