import {
  BookText,
  CheckCircle,
  Trash2,
  Clock4,
  Users,
  Calendar,
  RotateCcw,
} from "lucide-react";
import { useState, useEffect } from "react";
import { api_url } from "@/api/Api";
import { apiHandler } from "@/api/ApiHandler";

const Section_a = () => {
  const [activeState, setActiveState] = useState("active");
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [retrievingProject, setRetrievingProject] = useState(null);

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

  const handleRetrieveProject = async (project) => {
    if (retrievingProject) return; // Prevent multiple clicks

    setRetrievingProject(project.project_id);
    const token = localStorage.getItem("token");

    try {
      const updateUrl = api_url.updateProject.replace(
        ":projectId",
        project.project_id
      );
      const response = await apiHandler.PutApi(
        updateUrl,
        {
          project_status: "on hold",
        },
        token
      );

      if (response.message) {
        // Update the project in the local state
        setProjects((prevProjects) =>
          prevProjects.map((p) =>
            p.project_id === project.project_id
              ? { ...p, project_status: "on hold" }
              : p
          )
        );

        // Show success message (you can add a toast notification here)
        alert(
          `Project "${project.project_name}" has been retrieved successfully!`
        );
      }
    } catch (error) {
      console.error("Error retrieving project:", error);
      alert("Failed to retrieve project. Please try again.");
    } finally {
      setRetrievingProject(null);
    }
  };

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
    <div className="min-h-screen flex justify-center px-6 py-12 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="w-full max-w-7xl">
        {/* Header Section */}
        <div className="mb-10">
          <div className="mb-8">
            <h2 className="text-4xl font-bold text-gray-900 mb-2">
              Project History
            </h2>
            <p className="text-gray-600 text-lg">
              Track completed and deleted projects
            </p>
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-4 mb-8">
            <button
              className={`flex items-center gap-3 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 ${
                activeState === "active"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg"
                  : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 shadow-sm"
              }`}
              onClick={() => setActiveState("active")}
            >
              <BookText size={18} />
              All Projects
            </button>
            <button
              className={`flex items-center gap-3 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 ${
                activeState === "completed"
                  ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg"
                  : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 shadow-sm"
              }`}
              onClick={() => setActiveState("completed")}
            >
              <CheckCircle size={18} />
              Completed
            </button>
            <button
              className={`flex items-center gap-3 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 ${
                activeState === "deleted"
                  ? "bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-lg"
                  : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 shadow-sm"
              }`}
              onClick={() => setActiveState("deleted")}
            >
              <Trash2 size={18} />
              Deleted
            </button>
          </div>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredProjects.map((project) => (
            <div
              key={project.project_id}
              className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-gray-100 transition-all duration-300 transform hover:-translate-y-2 overflow-hidden"
            >
              {/* Retrieve Button Overlay - Only for deleted projects */}
              {project.project_status === "deleted" && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10">
                  <button
                    onClick={() => handleRetrieveProject(project)}
                    disabled={retrievingProject === project.project_id}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white font-semibold transition-all duration-200 ${
                      retrievingProject === project.project_id
                        ? "bg-gray-500 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700 hover:scale-105"
                    }`}
                  >
                    {retrievingProject === project.project_id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Retrieving...
                      </>
                    ) : (
                      <>
                        <RotateCcw size={16} />
                        Retrieve Project
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Card Content */}
              <div className="p-6">
                {/* Project Header */}
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1 capitalize">
                    {project.project_name}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed line-clamp-2 capitalize">
                    {project.project_description || "No description available"}
                  </p>
                </div>

                {/* Completion Note */}
                {(project.project_status === "completed" &&
                  project.completion_note) ||
                (project.project_status === "completed" &&
                  !project.completion_note &&
                  project.original_end_date &&
                  project.original_end_date !== project.end_date) ? (
                  <div className="mb-4 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                      <div className="text-sm">
                        <span className="font-semibold text-yellow-800">
                          Note:
                        </span>{" "}
                        <span className="text-yellow-700">
                          {project.completion_note ||
                            `Original planned completion date was ${project.original_end_date}, but project was completed on ${project.end_date}.`}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Project Information */}
                <div className="space-y-4">
                  {/* Client Information */}
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <BookText size={16} className="text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-900 capitalize">{project.client_name || "No client"}</div>
                      <div className="text-xs text-gray-500">Client</div>
                    </div>
                  </div>

                  {/* Team Members */}
                  <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Users size={16} className="text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-900">{project.team_members?.length || 0} Members</div>
                      <div className="text-xs text-gray-500">Team size</div>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Calendar size={16} className="text-green-600" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-900">
                        {project.start_date && project.end_date
                          ? `${project.start_date} - ${project.end_date}`
                          : "No dates set"}
                      </div>
                      <div className="text-xs text-gray-500">
                        Project timeline
                      </div>
                    </div>
                  </div>

                  {/* Completion Date (for completed projects) */}
                  {project.project_status === "completed" &&
                    project.end_date && (
                      <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                          <CheckCircle size={16} className="text-emerald-600" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-gray-900">
                            Completed on {project.end_date}
                          </div>
                          <div className="text-xs text-gray-500">
                            Completion date
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Last Updated */}
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Clock4 size={16} className="text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-900">
                        {project.updatedAt
                          ? new Date(project.updatedAt).toLocaleDateString()
                          : "Not available"}
                      </div>
                      <div className="text-xs text-gray-500">Last updated</div>
                    </div>
                  </div>
                </div>

                {/* Hover Effect Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredProjects.length === 0 && (
          <div className="text-center py-20">
            <div className="bg-white rounded-2xl p-8 max-w-md mx-auto shadow-lg">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookText size={24} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No projects found
              </h3>
              <p className="text-gray-500 text-sm">
                {activeState === "completed"
                  ? "No completed projects in your history."
                  : activeState === "deleted"
                  ? "No deleted projects in your history."
                  : "No projects match the current filter."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default Section_a;
