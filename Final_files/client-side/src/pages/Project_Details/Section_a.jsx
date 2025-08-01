import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api_url } from "@/api/Api";
import { apiHandler } from "@/api/ApiHandler";
import { Users, User, CalendarDays, Hash, ArrowLeft,Trash2} from "lucide-react";

const Section_a = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    const fetchProject = async () => {
      setLoading(true);
      const token = localStorage.getItem("token");
      try {
        const response = await apiHandler.GetApi(
          api_url.getAllProjects + "/" + state?.project_id,
          token
        );
        setProject(response.project);
      } catch {
        setProject(null);
      } finally {
        setLoading(false);
      }
    };
    if (state?.project_id) fetchProject();
  }, [state]);

  useEffect(() => {
    const fetchEmployees = async () => {
      const token = localStorage.getItem("token");
      try {
        const response = await apiHandler.GetApi(
          api_url.getAllEmployees,
          token
        );
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
    // Fetch tasks for this project
    const fetchTasks = async () => {
      if (!project) return;
      const token = localStorage.getItem("token");
      try {
        const response = await apiHandler.GetApi(api_url.getAllTasks, token);
        if (Array.isArray(response.tasks)) {
          setTasks(
            response.tasks.filter((t) => t.project_id === project.project_id)
          );
        } else {
          setTasks([]);
        }
      } catch {
        setTasks([]);
      }
    };
    if (project) fetchTasks();
  }, [project]);

  const getEmployee = (id) => {
    return employees.find((e) => e.teamMemberId === id || e._id === id);
  };
  const getEmployeeName = (id) => {
    const emp = getEmployee(id);
    return emp ? emp.name : id || "-";
  };
  const getTeamName = (id) => {
    const team = teams.find((t) => t._id === id);
    return team ? team.teamName : id || "-";
  };
  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  if (loading || !project) {
    return (
      <div className="p-6 text-center text-gray-500">Loading project...</div>
    );
  }

  return (
    <div className="min-h-screen w-full flex justify-center items-start px-4 py-10 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-5xl flex justify-center">
        {/* Project Details */}
        <div 
          className="w-full bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 max-h-[90vh] overflow-y-auto"
          style={{ 
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none',
            WebkitScrollbar: { display: 'none' }
          }}
        >
          {/* Header Section */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="text-gray-600 hover:text-blue-600 transition-colors duration-200 p-2 rounded-full hover:bg-blue-50"
              >
                <ArrowLeft size={24} />          
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Project Details
                </h1>
                <p className="text-gray-500 text-sm mt-1">View project information and team details</p>
              </div>
            </div>
            
            {/* Status Badge */}
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${
                project.project_status === "completed"
                  ? "bg-green-100 text-green-800 border border-green-200"
                  : project.project_status === "on hold"
                  ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                  : "bg-blue-100 text-blue-800 border border-blue-200"
              }`}>
                {project.project_status ? project.project_status.charAt(0).toUpperCase() + project.project_status.slice(1) : "Unknown"}
              </span>
            </div>
          </div>

          {/* Project Information Form */}
          <div className="space-y-8">
            {/* Basic Information */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Basic Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Project Name
                  </label>
                  <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
                    <span className="text-gray-900 font-medium">{project.project_name || "Not specified"}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Client Name
                  </label>
                  <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
                    <span className="text-gray-900 font-medium">{project.client_name || "Not specified"}</span>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Project Description
                  </label>
                  <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm min-h-[80px]">
                    <span className="text-gray-900 leading-relaxed">{project.project_description || "No description provided"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline Information */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Timeline
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Start Date
                  </label>
                  <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
                    <span className="text-gray-900 font-medium">{project.start_date || "Not set"}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    End Date
                  </label>
                  <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
                    <span className="text-gray-900 font-medium">{project.end_date || "Not set"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Team Information */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                Team Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Project Lead
                  </label>
                  <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-bold text-sm">
                        {getInitials(getEmployeeName(project.project_lead))}
                      </span>
                      <span className="text-gray-900 font-medium">{getEmployeeName(project.project_lead) || "Not assigned"}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Team
                  </label>
                  <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
                    <span className="text-gray-900 font-medium">{getTeamName(project.team_id) || "Not assigned"}</span>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Team Members ({project.team_members?.length || 0})
                  </label>
                  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    {Array.isArray(project.team_members) && project.team_members.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {project.team_members.map((memberId) => {
                          const emp = getEmployee(memberId);
                          return (
                            <div key={memberId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 text-white font-bold text-sm">
                                {getInitials(emp?.name || memberId)}
                              </span>
                              <div>
                                <span className="text-gray-900 font-medium text-sm">{emp?.name || memberId}</span>
                                <div className="text-gray-500 text-xs">{memberId}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-gray-500 text-center py-4">No team members assigned</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-2xl p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                Additional Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Created At
                  </label>
                  <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
                    <span className="text-gray-900 font-medium">{project.createdAt ? new Date(project.createdAt).toLocaleString() : "Not available"}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Updated At
                  </label>
                  <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
                    <span className="text-gray-900 font-medium">{project.updatedAt ? new Date(project.updatedAt).toLocaleString() : "Not available"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Section_a;
