import { api_url } from "@/api/Api";
import { apiHandler } from "@/api/ApiHandler";
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const Section_a = () => {
    const token = localStorage.getItem("token");
    const [members, setMembers] = useState([]);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [projects, setProjects] = useState([]);
    const dateInputRef = useRef(null);    
    const [error, setError] = useState("");
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
    console.log(taskForm,"taskForm=-===>");
    

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




    const handleInputChange = (e) => {        
        const { name, value } = e.target;
        setTaskForm((prev) => ({ ...prev, [name]: value }));
    };


    useEffect(() => {
        const fetchMembers = async () => {
            setLoading(true);
            setError("");

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

        // Set assignedBy and assignedByRole from localStorage
        const user = JSON.parse(localStorage.getItem("user"));
        if (user) {
            setTaskForm((prev) => ({
                ...prev,
                assignedBy: `${user.firstName} ${user.lastName}`,
                assignedByRole: user.role,
            }));
        }
    }, []);


    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log("Submitting task with data:", taskForm);
        try {
            const response = await apiHandler.postApiWithToken(api_url.addTask, taskForm, token);

            if (response?.message == 'Task created successfully.') {
                navigate("/AllTask")
            }
            else {

            }

        } catch (error) {
            setError({ general: error.message || "Something went wrong." });
        }
    };

    const handleDivClick = () => {
        if (dateInputRef.current) {
            if (typeof dateInputRef.current.showPicker === "function") {
                dateInputRef.current.showPicker(); // Modern browsers
            } else {
                dateInputRef.current.focus(); // Fallback
            }
        }
    };


    return (
        <div className="max-w-4xl mx-auto mt-6">
            <div className="mb-4 flex items-center justify-between ">
                <button
                    onClick={() => navigate(-1)}
                    className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
                >
                    ← Back
                </button>
                <h1 className="text-2xl font-bold text-center flex-grow text-gray-800">Create New Task</h1>
            </div>

            {error && <p className="text-red-600 mb-2">{error}</p>}
            {loading ? (
                <p>Loading members...</p>
            ) : (
                <div className="grid gap-4 border p-6 rounded-md bg-white shadow">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input
                            name="title"
                            value={taskForm.title}
                            onChange={handleInputChange}
                            placeholder="Title"
                            className="border p-2 rounded w-full"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <input
                            name="description"
                            value={taskForm.description}
                            onChange={handleInputChange}
                            placeholder="Description"
                            className="border p-2 rounded w-full"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                            name="status"
                            value={taskForm.status}
                            onChange={handleInputChange}
                            className="border p-2 rounded w-full"
                        >
                            <option value="">Select Status</option>
                            <option value="pending">Pending</option>
                            <option value="in progress">In Progress</option>
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

                    {/* Assigned By - read-only input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Assigned By</label>
                        <input
                            name="assignedBy"
                            value={taskForm.assignedBy}
                            readOnly
                            className="border p-2 rounded w-full bg-gray-100"
                        />
                    </div>

                    {/* Assigned By Role - read-only input */}
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
                            value={taskForm.project}
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Due Date
                        </label>
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
                            onClick={handleSubmit}
                            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
                        >
                            Submit
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Section_a;
