import {
  BookText,
  CheckCircle,
  Trash2,
  Clock4,
  Users,
  Calendar,
} from "lucide-react";
import { useState, useEffect } from "react";
import { api_url } from "@/api/Api";
import { apiHandler } from "@/api/ApiHandler";

const Section_a = () => {
  const [activeState, setActiveState] = useState("active");
  const [projects, setProjects] = useState([]);
  useEffect(() => {
    const fetchProjects = async () => {
      const token = localStorage.getItem("token");
      try {
        const response = await apiHandler.GetApi(api_url.getAllProjects, token);
        if (Array.isArray(response.projects)) {
          setProjects(
            response.projects.filter(
              (p) =>
                p.project_status === "completed" ||
                p.project_status === "deleted"
            )
          );
        } else {
          setProjects([]);
        }
      } catch {
        setProjects([]);
      }
    };
    fetchProjects();
  }, []);

  const getButtonClasses = (state) => {
    const base =
      "flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1 sm:py-2 rounded-md text-xs sm:text-sm hover:opacity-90";
    if (activeState === state) {
      switch (state) {
        case "completed":
          return `${base} text-green-800 bg-green-100`;
        case "deleted":
          return `${base} text-red-800 bg-red-100`;
        default:
          return `${base} text-blue-800 bg-blue-100`;
      }
    }
    return `${base} text-gray-600 hover:bg-gray-100`;
  };

  const filteredProjects =
    activeState === "active"
      ? projects
      : projects.filter((p) => p.project_status === activeState);

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">
        Project History
      </h2>
      <div className="flex gap-4 mb-6">
        <button
          className={getButtonClasses("active")}
          onClick={() => setActiveState("active")}
        >
          <BookText size={16} />
          All Projects
        </button>
        <button
          className={getButtonClasses("completed")}
          onClick={() => setActiveState("completed")}
        >
          <CheckCircle size={16} />
          Completed
        </button>
        <button
          className={getButtonClasses("deleted")}
          onClick={() => setActiveState("deleted")}
        >
          <Trash2 size={16} />
          Deleted
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProjects.map((project) => (
          <div
            key={project.project_id}
            className="bg-white rounded-xl border p-4 shadow-sm"
          >
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-bold text-gray-800 text-lg">
                {project.project_name}
              </h3>
              {project.project_status === "completed" ? (
                <span className="text-green-600 text-sm font-medium flex items-center gap-1">
                  <CheckCircle size={14} /> Completed
                </span>
              ) : (
                <span className="text-red-500 text-sm font-medium flex items-center gap-1">
                  <Trash2 size={14} /> Deleted
                </span>
              )}
            </div>
            {/* Completion date label */}
            {project.project_status === "completed" &&
              project.completion_note && (
                <div className="mb-2 text-sm text-yellow-700 bg-yellow-100 rounded px-3 py-2">
                  <span className="font-semibold">Note:</span>{" "}
                  {project.completion_note}
                </div>
              )}
            {project.project_status === "completed" &&
              !project.completion_note &&
              project.original_end_date &&
              project.original_end_date !== project.end_date && (
                <div className="mb-2 text-sm text-yellow-700 bg-yellow-100 rounded px-3 py-2">
                  <span className="font-semibold">Note:</span> Original planned
                  completion date was {project.original_end_date}, but project
                  was completed on {project.end_date}.
                </div>
              )}
            <p className="text-sm text-gray-600 mb-3">
              {project.project_description}
            </p>
            <div className="space-y-1 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <BookText size={14} className="text-gray-400" />
                <span>{project.client_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users size={14} className="text-gray-400" />
                <span>{project.team_members?.length || 0} members</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-gray-400" />
                <span>
                  {project.start_date && project.end_date
                    ? `${project.start_date} - ${project.end_date}`
                    : "No start date - No end date"}
                </span>
              </div>
              {project.project_status === "completed" && project.end_date && (
                <div className="flex items-center gap-2 text-green-600 font-medium">
                  <CheckCircle size={14} />
                  Completed on {project.end_date}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Clock4 size={14} className="text-gray-400" />
                Last updated:{" "}
                {project.updatedAt
                  ? new Date(project.updatedAt).toLocaleDateString()
                  : "-"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default Section_a;
