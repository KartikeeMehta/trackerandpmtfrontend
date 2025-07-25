import React, { useEffect, useState } from "react";
import { CheckCircle, Edit, Trash2, User, CalendarDays } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { api_url } from "@/api/Api";
import { apiHandler } from "@/api/ApiHandler";

const Section_a = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [originalEndDate, setOriginalEndDate] = useState(null);

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

  const getEmployeeName = (id) => {
    const emp = employees.find((e) => e.teamMemberId === id);
    return emp ? emp.name : id;
  };

  const handleDelete = async () => {
    setDeleting(true);
    const token = localStorage.getItem("token");
    try {
      const response = await apiHandler.DeleteApi(
        api_url.deleteProject.replace(":projectId", project.project_id),
        token
      );
      if (response?.message === "Project deleted successfully") {
        navigate("/AllProject");
      } else {
        alert(response?.message || "Failed to delete project");
      }
    } catch (err) {
      alert("Failed to delete project");
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleMarkAsCompleted = async () => {
    if (!project) return;
    setCompleting(true);
    const token = localStorage.getItem("token");
    const today = new Date().toISOString().slice(0, 10);
    setOriginalEndDate(project.end_date);
    try {
      const response = await apiHandler.PutApi(
        api_url.getAllProjects + "/" + project.project_id,
        { project_status: "completed", end_date: today },
        token
      );
      if (response?.message?.toLowerCase().includes("updated")) {
        setProject((prev) => ({
          ...prev,
          project_status: "completed",
          end_date: today,
        }));
      } else {
        alert(response?.message || "Failed to mark as completed");
      }
    } catch {
      alert("Failed to mark as completed");
    } finally {
      setCompleting(false);
    }
  };

  if (loading || !project) {
    return (
      <div className="p-6 text-center text-gray-500">Loading project...</div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center px-4 py-10">
      <div className="w-full max-w-6xl flex gap-8">
        {/* Left: Project Details Card */}
        <div className="w-1/2 bg-white p-8 rounded-xl shadow-lg border flex flex-col">
          <div className="mb-6 flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="text-gray-500 hover:text-black text-xl font-semibold"
            >
              &larr;
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              Project Details
            </h1>
          </div>
          <h3 className="text-lg font-semibold mb-2">{project.project_name}</h3>
          <p className="text-gray-600 mb-2">{project.project_description}</p>
          <div className="mb-2">
            <span className="font-semibold">Status:</span>{" "}
            <span
              className={`px-2 py-1 rounded text-xs font-semibold ${
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
          <div className="mb-2">
            <span className="font-semibold">Team:</span> {project.team_id}
          </div>
          <div className="mb-2">
            <span className="font-semibold">Lead:</span>{" "}
            {getEmployeeName(project.project_lead)}
          </div>
          <div className="mb-2">
            <span className="font-semibold">Members:</span>{" "}
            {project.team_members?.length || 0}
          </div>
          <div className="mb-2">
            <span className="font-semibold">Start:</span> {project.start_date}
          </div>
          <div className="mb-2">
            <span className="font-semibold">End:</span> {project.end_date}
          </div>
        </div>
        {/* Right: Tasks for this Project */}
        <div className="w-1/2 bg-white p-8 rounded-xl shadow-lg border flex flex-col">
          <h2 className="text-xl font-bold mb-4 text-blue-700">
            Project Tasks
          </h2>
          {tasks.length === 0 ? (
            <div className="text-gray-500">No tasks for this project.</div>
          ) : (
            <ul>
              {tasks.map((task) => (
                <li
                  key={task._id}
                  className="mb-4 p-4 bg-gray-50 rounded shadow"
                >
                  <div className="font-semibold text-lg">{task.title}</div>
                  <div className="text-gray-600">{task.description}</div>
                  <div className="text-xs text-gray-500">
                    Assigned to: {getEmployeeName(task.assignedTo)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Status: {task.status}
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
