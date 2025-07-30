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
        {/* Left: Project Details (simple card) */}
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
          {/* Project Name and Status */}
          <div className="mb-4">
            <h2 className="text-2xl font-extrabold text-blue-900 tracking-tight mb-1">
              {project.project_name || "-"}
            </h2>
            <span
              className={`inline-block px-4 py-1 rounded-full text-sm font-bold mt-1 ${
                project.project_status === "completed"
                  ? "bg-green-100 text-green-700"
                  : project.project_status === "on hold"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {project.project_status ? project.project_status.charAt(0).toUpperCase() + project.project_status.slice(1) : "-"}
            </span>
          </div>
          {/* Description */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-1 flex items-center gap-2">
              <Hash size={18} /> Description
            </h3>
            <p className="text-gray-700 text-base bg-blue-50 rounded p-3">
              {project.project_description ? project.project_description.charAt(0).toUpperCase() + project.project_description.slice(1) : "-"}
            </p>
          </div>
          {/* Team & Lead */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-2">Team</h3>
            <div className="flex items-center gap-2 mb-2">
              <Users size={18} className="text-blue-700" />
              <span className="font-medium text-gray-900">
                {getTeamName(project.team_id) ? getTeamName(project.team_id).charAt(0).toUpperCase() + getTeamName(project.team_id).slice(1) : "-"}
              </span>
            </div>
            <h3 className="font-semibold text-gray-700 mb-2 mt-4">
              Project Lead
            </h3>
            <div className="flex items-center gap-2 mb-2">
              <User size={18} className="text-blue-700" />
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-bold">
                {getInitials(getEmployeeName(project.project_lead))}
              </span>
              <span className="font-medium text-gray-900">
                {getEmployeeName(project.project_lead)}
              </span>
              <span className="text-xs text-gray-500">
                ({project.project_lead})
              </span>
            </div>
          </div>
          {/* Team Members */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Users size={16} /> Team Members (
              {project.team_members?.length || 0})
            </h3>
            <ul className="space-y-2">
              {Array.isArray(project.team_members) &&
              project.team_members.length > 0 ? (
                project.team_members.map((id, idx) => {
                  const emp = getEmployee(id);
                  return (
                    <li key={id || idx} className="flex items-center gap-3">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-200 text-blue-800 font-bold">
                        {getInitials(emp?.name || id)}
                      </span>
                      <span className="font-medium text-gray-900 text-sm">
                        {emp?.name || id}
                      </span>
                      <span className="text-xs text-gray-500">({id})</span>
                    </li>
                  );
                })
              ) : (
                <li className="text-gray-400">No team members</li>
              )}
            </ul>
          </div>
          {/* Dates & Meta Info */}
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <CalendarDays size={18} className="text-blue-700" />
              <span className="font-semibold text-gray-700">Start Date:</span>
              <span className="text-gray-900">{project.start_date || "-"}</span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays size={18} className="text-blue-700" />
              <span className="font-semibold text-gray-700">End Date:</span>
              <span className="text-gray-900">{project.end_date || "-"}</span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays size={18} className="text-blue-700" />
              <span className="font-semibold text-gray-700">Created At:</span>
              <span className="text-gray-900">
                {project.createdAt
                  ? new Date(project.createdAt).toLocaleString()
                  : "-"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays size={18} className="text-blue-700" />
              <span className="font-semibold text-gray-700">Updated At:</span>
              <span className="text-gray-900">
                {project.updatedAt
                  ? new Date(project.updatedAt).toLocaleString()
                  : "-"}
              </span>
            </div>
          </div>
          {/* Any other fields */}
          <div className="mb-2">
            {Object.entries(project).map(([key, value]) => {
              if (
                [
                  "project_name",
                  "project_description",
                  "project_status",
                  "team_id",
                  "project_lead",
                  "team_members",
                  "start_date",
                  "end_date",
                  "createdAt",
                  "updatedAt",
                  "project_id",
                  "_id",
                  "__v",
                ].includes(key)
              )
                return null;
              return (
                <div key={key} className="mb-1 flex items-center gap-2">
                  <span className="font-semibold text-gray-700">{key.charAt(0).toUpperCase() + key.slice(1)}:</span>
                  <span className="text-gray-800">{String(value) ? String(value).charAt(0).toUpperCase() + String(value).slice(1) : "-"}</span>
                </div>
              );
            })}
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
