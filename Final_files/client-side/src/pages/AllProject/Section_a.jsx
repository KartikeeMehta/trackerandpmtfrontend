import { Plus, Users, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { api_url } from "@/api/Api";
import { apiHandler } from "@/api/ApiHandler";

const Section_a = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [projectMemberList, setProjectMemberList] = useState("");

  console.log(projects, "====projects");

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      try {
        const response = await apiHandler.GetApi(api_url.getAllProjects, token);
        if (Array.isArray(response.projects)) {
          // Only show ongoing and on hold projects
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

  const handleCardClick = (project) => {
    navigate("/ProjectDetails", { state: { project_id: project.project_id } });
  };

  const handleDeleteClick = (projectId) => {
    setDeleteId(projectId);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const token = localStorage.getItem("token");
    try {
      // Soft delete: set status to 'deleted'
      const response = await apiHandler.PutApi(
        api_url.getAllProjects + "/" + deleteId,
        { project_status: "deleted" },
        token
      );
      if (response?.message?.toLowerCase().includes("updated")) {
        setProjects((prev) => prev.filter((p) => p.project_id !== deleteId));
      } else {
        alert(response?.message || "Failed to delete project");
      }
    } catch (err) {
      alert("Failed to delete project");
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
      setDeleteId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex  justify-center px-4 py-10">
      <div className=" w-full max-w-6xl rounded-xl  p-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">All Projects</h2>
          <button
            onClick={() => navigate("/CreateProject")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium"
          >
            <Plus size={16} /> Add Project
          </button>
        </div>

        {loading ? (
          <div className="text-center text-gray-500">Loading projects...</div>
        ) : error ? (
          <div className="text-center text-red-600">{error}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {projects.map((project, index) => (
              <div
                key={project._id || index}
                onClick={() => handleCardClick(project)}
                className="bg-white rounded-lg shadow-md p-5 border flex justify-between flex-col border-gray-200 cursor-pointer hover:shadow-lg transition relative"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {project.project_name || project.name}
                    </h3>
                    <p className="text-sm text-gray-500 w-full">
                      {project.project_description || project.description}
                    </p>
                  </div>
                  <span className="bg-blue-500 text-white text-xs font-medium px-3  py-1 rounded-full capitalize">
                    {project?.project_status || project.status}
                  </span>
                </div>

                <div className="flex items-center text-sm text-gray-600 gap-1 mt-5">
                  <Users size={16} />
                  <span>{project?.team_members?.length || 0} members</span>
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
