import { api_url } from "@/api/Api";
import { apiHandler } from "@/api/ApiHandler";
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const Section_a = () => {
  const token = localStorage.getItem("token");
  const [members, setMembers] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const dateInputRef = useRef(null);
  const [error, setError] = useState("");
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    status: "pending",
    assignedTo: "",
    assignedBy: "",
    assignedByRole: "",
    project: "",
    priority: "",
    dueDate: "",
  });

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
        const response = await apiHandler.GetApi(
          api_url.getAllEmployees,
          token
        );

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

    // Check if a member was selected from AllTask page
    if (location.state?.selectedMember) {
      const selectedMember = location.state.selectedMember;
      setTaskForm((prev) => ({
        ...prev,
        assignedTo: selectedMember.teamMemberId,
      }));
    }
  }, [location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await apiHandler.PostApi(
        api_url.createTask,
        taskForm,
        token
      );
      if (response?.success) {
        setSuccess("Task created successfully!");
        setTaskForm(initialTaskForm);
        setTimeout(() => {
          setSuccess("");
          navigate("/AllTask");
        }, 2000);
      } else {
        setError(response?.message || "Failed to create task");
      }
    } catch (error) {
      setError("An error occurred while creating the task");
    } finally {
      setLoading(false);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors duration-200 hover:bg-white rounded-lg shadow-sm border border-gray-200"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back
            </button>
            <h1 className="text-3xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Create New Task
            </h1>
            <div className="w-20"></div> {/* Spacer for centering */}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <svg
                className="w-5 h-5 text-red-400 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-red-600 font-medium">{error}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading...</span>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            {/* Card Header */}
            <div className="bg-gradient-to-r from-blue-400 to-indigo-400 px-8 py-6">
              <h2 className="text-xl font-semibold text-white">
                Task Information
              </h2>
              <p className="text-blue-50 mt-1">
                Fill in the details below to create a new task
              </p>
            </div>

            {/* Form Content */}
            <div className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Title and Description Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Task Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="title"
                      value={taskForm.title}
                      onChange={handleInputChange}
                      placeholder="Enter task title"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      name="status"
                      value={taskForm.status}
                      disabled
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-100 cursor-not-allowed"
                    >
                      <option value="pending">Pending</option>
                      <option value="in progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="description"
                    value={taskForm.description}
                    onChange={handleInputChange}
                    placeholder="Describe the task in detail..."
                    rows="4"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white resize-none"
                    required
                  />
                </div>

                {/* Assignment Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Assigned To <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="assignedTo"
                      value={taskForm.assignedTo}
                      onChange={handleInputChange}
                      disabled={location.state?.selectedMember}
                      className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                        location.state?.selectedMember
                          ? "bg-gray-100 cursor-not-allowed"
                          : "bg-gray-50 hover:bg-white"
                      }`}
                      required
                    >
                      <option value="">Select Team Member</option>
                      {members.map((member) => (
                        <option
                          key={member.teamMemberId}
                          value={member.teamMemberId}
                        >
                          {member.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Priority <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="priority"
                      value={taskForm.priority}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                      required
                    >
                      <option value="">Select Priority Level</option>
                      <option value="low" className="text-green-600">
                        Low
                      </option>
                      <option value="medium" className="text-yellow-600">
                        Medium
                      </option>
                      <option value="high" className="text-orange-600">
                        High
                      </option>
                      <option value="critical" className="text-red-600">
                        Critical
                      </option>
                    </select>
                  </div>
                </div>

                {/* Project and Due Date Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Project <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="project"
                      value={taskForm.project}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                      required
                    >
                      <option value="">Select Project</option>
                      {projects.map((project) => (
                        <option
                          key={project.project_id}
                          value={project.project_id}
                        >
                          {project.project_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div onClick={handleDivClick} className="cursor-pointer">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Due Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      ref={dateInputRef}
                      type="date"
                      name="dueDate"
                      value={taskForm.dueDate}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white cursor-pointer"
                      required
                    />
                  </div>
                </div>

                {/* Assigned By Information */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Assigned By
                    </label>
                    <input
                      name="assignedBy"
                      value={taskForm.assignedBy}
                      readOnly
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Assigned By Role
                    </label>
                    <input
                      name="assignedByRole"
                      value={taskForm.assignedByRole}
                      readOnly
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-6 border-t border-gray-200">
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-400 to-indigo-400 text-white font-semibold py-4 px-8 rounded-lg hover:from-blue-500 hover:to-indigo-500 transform hover:scale-[1.02] transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Submit
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Section_a;
