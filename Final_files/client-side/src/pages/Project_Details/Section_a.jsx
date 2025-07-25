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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [employees, setEmployees] = useState([]);
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

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">Loading project...</div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 text-center text-red-500">
        No project data found. Please go back and select a project.
      </div>
    );
  }

  // Map project_lead and team_members to names
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
    setOriginalEndDate(project.end_date); // Save the original planned end date
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

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-500 hover:text-black text-xl font-semibold"
          >
            &larr;
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Project Details</h1>
        </div>

        <div className="flex justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">
              {project.project_name || project.title}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              <span className="font-semibold">Client:</span>{" "}
              {project.client_name || "-"}
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <CalendarDays className="w-4 h-4" />
              <p className="text-sm text-gray-500">
                {project.start_date
                  ? `${new Date(project.start_date).toLocaleDateString(
                      "en-GB"
                    )} - Ongoing`
                  : "No start date - Ongoing"}
              </p>
            </div>
          </div>
          <div className="flex gap-3 items-center">
            {project.project_status !== "completed" && (
              <button
                className="flex items-center gap-1 bg-green-100 text-green-700 text-sm px-3 py-1 rounded-full"
                onClick={handleMarkAsCompleted}
                disabled={completing}
              >
                <CheckCircle className="w-4 h-4" />
                {completing ? "Marking..." : "Mark as Completed"}
              </button>
            )}
            <Edit
              className="text-gray-500 w-4 h-4 cursor-pointer"
              onClick={() =>
                navigate("/CreateProject", { state: { project, mode: "edit" } })
              }
            />
            <Trash2
              className="text-red-500 w-4 h-4 cursor-pointer"
              onClick={() => setShowDeleteDialog(true)}
            />
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        {showDeleteDialog && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
              <h3 className="text-lg font-bold mb-2">Delete Project</h3>
              <p className="mb-4">
                Are you sure you want to delete this project? This action cannot
                be undone.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
                  onClick={() => setShowDeleteDialog(false)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Project Meta Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <h4 className="font-semibold">Status</h4>
            <span className="bg-blue-500 text-white text-xs font-medium px-3 py-1 rounded-full capitalize">
              {project.project_status || project.status || "Not set"}
            </span>
          </div>
          <div>
            <h4 className="font-semibold">Description</h4>
            <p className="text-sm text-gray-700">
              {project.project_description ||
                project.description ||
                "No description provided."}
            </p>
          </div>
        </div>

        {/* Project Lead */}
        <div className="mb-4">
          <h4 className="font-semibold mb-2">Project Lead</h4>
          <div className="flex items-center gap-2 border px-3 py-2 rounded bg-gray-50">
            <User className="w-4 h-4 text-gray-500" />
            <span>
              {getEmployeeName(project.project_lead)}
              {project.project_lead ? ` (${project.project_lead})` : ""}
            </span>
          </div>
        </div>
        <div className="mb-5">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold">Project Members:</h4>
            <span className="text-sm text-gray-800">
              {project?.team_members?.length ?? 0}
            </span>
          </div>

          <div className="ml-4 mt-2 text-sm text-gray-700">
            {project?.team_members?.length > 0 ? (
              <ul className="list-disc list-inside">
                {project.team_members.map((memberId, index) => (
                  <li key={index}>
                    {getEmployeeName(memberId)} ({memberId})
                  </li>
                ))}
              </ul>
            ) : (
              <p>No members assigned.</p>
            )}
          </div>
        </div>

        {/* Project Timeline */}
        <div>
          <h4 className="font-semibold mb-2">Project Timeline</h4>
          {project.project_status === "completed" &&
            originalEndDate &&
            originalEndDate !== project.end_date && (
              <div className="mb-2 text-sm text-yellow-700 bg-yellow-100 rounded px-3 py-2">
                <span className="font-semibold">Note:</span> Original planned
                completion date was {originalEndDate}, but project was completed
                on {project.end_date}.
              </div>
            )}
          <div className="grid grid-cols-2 gap-4">
            <div className="border px-3 py-2 rounded bg-gray-50">
              <p className="text-xs text-gray-500">Start Date</p>
              <p className="text-sm text-gray-500">
                {project.start_date
                  ? new Date(project.start_date).toLocaleDateString("en-GB")
                  : "Not set"}
              </p>
            </div>
            <div className="border px-3 py-2 rounded bg-gray-50">
              <p className="text-xs text-gray-500">End Date</p>
              <p className="text-sm text-gray-500">
                {project.end_date
                  ? new Date(project.end_date).toLocaleDateString("en-GB")
                  : "Not set"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Section_a;
