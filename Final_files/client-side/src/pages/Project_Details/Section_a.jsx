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
    <div className="min-h-screen w-full flex justify-center items-start px-4 py-10">
      <div className="w-full max-w-8xl flex flex-col md:flex-row gap-8">
        {/* Left: Project Details */}
        <div className="flex-1 pr-0 md:pr-8 py-8 bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          <div className="mb-6 flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="text-gray-500 hover:text-black text-3xl font-semibold"
            >
              <ArrowLeft color="black" />          
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              Project Details
            </h1>
          </div>

          {/* Project Information Form */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  value={project.project_name || ""}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 cursor-not-allowed"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Name
                </label>
                <input
                  type="text"
                  value={project.client_name || ""}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 cursor-not-allowed"
                  readOnly
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Description
                </label>
                <textarea
                  value={project.project_description || ""}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 cursor-not-allowed"
                  rows={3}
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={project.start_date || ""}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 cursor-not-allowed"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={project.end_date || ""}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 cursor-not-allowed"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Status
                </label>
                <input
                  type="text"
                  value={project.project_status ? project.project_status.charAt(0).toUpperCase() + project.project_status.slice(1) : ""}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 cursor-not-allowed"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Lead
                </label>
                <input
                  type="text"
                  value={getEmployeeName(project.project_lead) || ""}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 cursor-not-allowed"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Team
                </label>
                <input
                  type="text"
                  value={getTeamName(project.team_id) || ""}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 cursor-not-allowed"
                  readOnly
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Team Members
                </label>
                <div className="border border-gray-300 rounded-md p-3 bg-gray-50 min-h-[100px]">
                  {Array.isArray(project.team_members) && project.team_members.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {project.team_members.map((memberId) => {
                        const emp = getEmployee(memberId);
                        return (
                          <div key={memberId} className="flex items-center space-x-2">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-200 text-blue-800 font-bold text-xs">
                              {getInitials(emp?.name || memberId)}
                            </span>
                            <span className="text-sm text-gray-700">
                              {emp?.name || memberId} ({memberId})
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-gray-500 text-sm">No team members assigned</div>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Fields */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Additional Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Created At
                  </label>
                  <input
                    type="text"
                    value={project.createdAt ? new Date(project.createdAt).toLocaleString() : ""}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 cursor-not-allowed"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Updated At
                  </label>
                  <input
                    type="text"
                    value={project.updatedAt ? new Date(project.updatedAt).toLocaleString() : ""}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 cursor-not-allowed"
                    readOnly
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Right: Tasks for this Project (light blue background) */}
        <div className="flex-1 pl-0 md:pl-8 max-h-[80vh] overflow-y-auto py-8 bg-blue-50 rounded-2xl border border-blue-100">
          <h2 className="text-xl font-bold mb-4 text-blue-700">
            Project Tasks
          </h2>
          {tasks.length === 0 ? (
            <div className="text-gray-500">No tasks for this project.</div>
          ) : (
            <ul className="space-y-4">
              {tasks.map((task) => (
                <li
                  key={task._id}
                  className="p-4 bg-white rounded-lg border border-blue-100"
                >
                  <div className="font-semibold text-base text-blue-900 mb-1">
                    {task.title}
                  </div>
                  <div className="text-gray-600 mb-1 text-sm">
                    {task.description}
                  </div>
                  <div className="text-xs text-gray-500">
                    Assigned to:{" "}
                    <span className="text-blue-700">
                      {getEmployeeName(task.assignedTo)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Status:{" "}
                    <span className="font-medium text-blue-700">
                      {task.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default Section_a;
