import { api_url } from "@/api/Api";
import { apiHandler } from "@/api/ApiHandler";
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const Section_a = () => {
    const token = localStorage.getItem("token");

    const navigate = useNavigate();
    const location = useLocation();
    const dateInputRef = useRef(null);
    const { taskDetails } = location.state || {};
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [members, setMembers] = useState([]);
    const [projects, setProjects] = useState([]);

    const [taskForm, setTaskForm] = useState({
        title: "",
        description: "",
        status: "",
        assignedTo: "",
        assignedBy: "",
        assignedByRole: "",
        project: "",
        priority: "",
        dueDate: "",
    });


    useEffect(() => {
        if (taskDetails) {
            setTaskForm({
                title: taskDetails.title || "",
                description: taskDetails.description || "",
                status: taskDetails.status?.toLowerCase() || "",
                assignedTo: taskDetails.assignedTo || "",
                assignedBy: taskDetails.assignedBy || "",
                assignedByRole: taskDetails.assignedByRole || "",
                project: taskDetails.project || "",
                priority: taskDetails.priority || "",
                dueDate: taskDetails.dueDate ? taskDetails.dueDate.substring(0, 10) : "",

            });
        }
    }, [taskDetails]);

    useEffect(() => {
        const fetchProjects = async () => {
            setLoading(true);
            try {
                const response = await apiHandler.GetApi(api_url.getAllProjects, token);
                if (Array.isArray(response.projects)) {
                    const filtered = response.projects.filter(
                        (p) => p.project_status === "ongoing" || p.project_status === "on hold"
                    );
                    setProjects(filtered);
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
        const fetchMembers = async () => {
            setLoading(true);
            try {
                const response = await apiHandler.GetApi(api_url.getAllEmployees, token);
                if (Array.isArray(response)) {
                    setMembers(response);
                } else {
                    setError(response?.message || "Failed to fetch members");
                }
            } catch (err) {
                setError("Failed to fetch members");
            } finally {
                setLoading(false);
            }
        };
        fetchMembers();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setTaskForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleDivClick = () => {
        if (dateInputRef.current) {
            if (typeof dateInputRef.current.showPicker === "function") {
                dateInputRef.current.showPicker();
            } else {
                dateInputRef.current.focus();
            }
        }
    };

const handleSubmit = async (e) => {
  e.preventDefault();
  const token = localStorage.getItem("token");

  const url = `http://localhost:8000/api/tasks/updateTask/${taskDetails.task_id}`;
  const response = await apiHandler.PutApi(url, taskForm, token);

  if (response?.message === "Task updated successfully.") {
    navigate("/AllTask");
  } else {
    alert(response?.message || "Failed to update task");
  }
};




    return (
        <div className="max-w-4xl mx-auto mt-6">
            <div className="mb-4 flex items-center justify-between">
                <button
                    onClick={() => navigate(-1)}
                    className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
                >
                    ← Back
                </button>
                <h1 className="text-2xl font-bold text-center flex-grow text-gray-800">Edit Task</h1>
            </div>

            {error && <p className="text-red-600 mb-2">{error}</p>}
            {loading ? (
                <p>Loading data...</p>
            ) : (
                <form onSubmit={handleSubmit} className="grid gap-4 border p-6 rounded-md bg-white shadow">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input
                            name="title"
                            value={taskForm.title}
                            onChange={handleInputChange}
                            className="border p-2 rounded w-full"
                            placeholder="Title"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <input
                            name="description"
                            value={taskForm.description}
                            onChange={handleInputChange}
                            className="border p-2 rounded w-full"
                            placeholder="Description"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                            name="status"
                            value={taskForm.status?.toLowerCase() || ""}
                            onChange={handleInputChange}
                            className="border p-2 rounded w-full"
                        >
                            <option value="">Select Status</option>
                            <option value="pending">Pending</option>
                            <option value="in progress">In-Progress</option>
                            <option value="in progress">Verification</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                        <select
                            name="assignedTo"
                            value={taskForm.assignedTo}
                            onChange={handleInputChange}
                            className="border p-2 rounded w-full"
                        >
                            <option value="">Select Member</option>
                            {members.map((member) => (
                                <option key={member.teamMemberId} value={member.teamMemberId}>
                                    {member.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Assigned By</label>
                        <input
                            name="assignedBy"
                            value={taskForm.assignedBy}
                            readOnly
                            className="border p-2 rounded w-full bg-gray-100"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Assigned By Role</label>
                        <input
                            name="assignedByRole"
                            value={taskForm.assignedByRole}
                            readOnly
                            className="border p-2 rounded w-full bg-gray-100"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                        <select
                            name="priority"
                            value={taskForm.priority}
                            onChange={handleInputChange}
                            className="border p-2 rounded w-full"
                        >
                            <option value="">Select Priority</option>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                        <select
                            name="project"
                            value={taskForm?.project || ""}
                            onChange={handleInputChange}
                            className="border p-2 rounded w-full"
                        >
                            <option value="">Select Project</option>
                            {projects.map((project) => (
                                <option key={project.project_id} value={project.project_id}>
                                    {project.project_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div onClick={handleDivClick} className="cursor-pointer">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                        <input
                            ref={dateInputRef}
                            type="date"
                            name="dueDate"
                            value={taskForm.dueDate}
                            onChange={handleInputChange}
                            className="border p-2 rounded w-full"
                        />
                    </div>

                    <div>
                        <button
                            type="submit"
                            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
                        >
                            Update Task
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default Section_a;
