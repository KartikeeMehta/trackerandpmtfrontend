import { Plus, Users, Trash2, CalendarDays } from "lucide-react";
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
  // Remove deleteId, showDeleteDialog, deleting, and related logic since edit/delete are not needed

  console.log(projects, "====projects");

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

  const getTeamName = (teamId) => {
    const team = teams.find((t) => t._id === teamId);
    return team ? team.teamName : "—";
  };

  const handleCardClick = (project) => {
    navigate("/ProjectDetails", { state: { project_id: project.project_id } });
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
                {/* Status badge */}
                <span
                  className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold capitalize shadow-sm z-10 ${
                    project.project_status === "completed"
                      ? "bg-green-100 text-green-700"
                      : project.project_status === "on hold"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {project.project_status}
                </span>
                <div className="flex-1 flex flex-col justify-between mt-2">
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
    </div>
  );
};
export default Section_a;
