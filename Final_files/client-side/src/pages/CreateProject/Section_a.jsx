import { useState, useRef, useEffect } from "react";
import { Calendar } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { api_url } from "@/api/Api";
import { toast } from "react-toastify";
import { apiHandler } from "@/api/ApiHandler";
import DropDownWithCheckBox from "@/components/dropDownWithCheckBox";

const Section_a = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const editMode = location.state?.mode === "edit";
  const project = location.state?.project;
  const token = localStorage.getItem("token");
  const [selectedMermber, setSelectedMember] = useState(
    editMode && project?.team_members ? project.team_members : []
  );
  const [teams, setTeams] = useState([]);
  const [form, setForm] = useState({
    projectName: editMode ? project?.project_name || "" : "",
    description: editMode ? project?.project_description || "" : "",
    clientName: editMode ? project?.client_name || "" : "",
    projectLead: editMode ? project?.project_lead || "" : "",
    status: editMode ? project?.project_status || "" : "",
    startDate: editMode ? project?.start_date || "" : "",
    endDate: editMode ? project?.end_date || "" : "",
    projectMember: "",
    teamId: editMode ? project?.team_id || "" : "",
  });
  const [errors, setErrors] = useState({});
  const [teamLeads, setTeamLeads] = useState([]);
  const [teamMember, setTeamMember] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const startDateRef = useRef(null);
  const endDateRef = useRef(null);

  useEffect(() => {
    const fetchTeamLeads = async () => {
      setLoadingLeads(true);
      const token = localStorage.getItem("token");
      try {
        const res = await apiHandler.GetApi(api_url.getAllTeamLeads, token);
        if (Array.isArray(res.teamLeads)) {
          setTeamLeads(res.teamLeads);
        } else {
          setTeamLeads([]);
        }
      } catch {
        setTeamLeads([]);
      } finally {
        setLoadingLeads(false);
      }
    };
    fetchTeamLeads();
  }, []);

  useEffect(() => {
    const fetchTeamMember = async () => {
      setLoadingLeads(true);
      const token = localStorage.getItem("token");
      try {
        const res = await apiHandler.GetApi(api_url.getTeamMember, token);
        if (Array.isArray(res)) {
          const transformed = res.map((member) => ({
            id: member.teamMemberId,
            name: member.name.charAt(0).toUpperCase() + member.name.slice(1),
          }));
          setTeamMember(transformed);
        } else {
          setTeamMember([]);
        }
      } catch {
        setTeamMember([]);
      } finally {
        setLoadingLeads(false);
      }
    };
    fetchTeamMember();
  }, []);

  useEffect(() => {
    // Fetch all teams for the team assignment dropdown
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
    // If editing, pre-select team members in the dropdown
    if (editMode && project?.team_members && teamMember.length > 0) {
      setSelectedMember(project.team_members);
    }
    // eslint-disable-next-line
  }, [editMode, project, teamMember]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  const validate = () => {
    const newErrors = {};
    if (!form.projectName.trim())
      newErrors.projectName = "Project name is required.";
    if (!form.description.trim())
      newErrors.description = "Description is required.";
    if (!form.clientName.trim())
      newErrors.clientName = "Client name is required.";
    if (!form.projectLead.trim())
      newErrors.projectLead = "Project lead is required.";
    if (!form.status.trim()) newErrors.status = "Status is required.";
    if (!form.startDate.trim()) newErrors.startDate = "Start date is required.";
    if (!form.endDate.trim()) newErrors.endDate = "End date is required.";
    if (!form.teamId)
      newErrors.teamId = "Please select a team for this project.";
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    const obj = {
      project_name: form.projectName,
      client_name: form.clientName,
      project_description: form.description,
      project_status: form.status,
      start_date: form.startDate,
      end_date: form.endDate,
      project_lead: form.projectLead,
      team_members: selectedMermber,
      team_id: form.teamId,
    };

    try {
      let response;
      if (editMode && project?.project_id) {
        // Edit mode: PUT request
        response = await apiHandler.PutApi(
          `${api_url.createProject.replace("/add", "/")}${project.project_id}`,
          obj,
          token
        );
      } else {
        // Create mode: POST request
        response = await apiHandler.postApiWithToken(
          api_url.createProject,
          obj,
          token
        );
      }
      if (
        response.success ||
        response.message?.toLowerCase().includes("updated") ||
        response.message?.toLowerCase().includes("created")
      ) {
        toast.success(
          editMode
            ? "Project updated successfully!"
            : "Project created successfully!"
        );
        navigate("/AllProject");
      } else {
        toast.error(response.message || "Failed to save data");
      }
    } catch (error) {
      toast.error("Server error. Please try again later.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-md p-8">
        <div className="mb-6 flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-500 hover:text-black text-xl font-semibold"
          >
            &larr;
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {editMode ? "Edit Project" : "Create New Project"}
          </h1>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Project Name
            </label>
            <input
              type="text"
              name="projectName"
              value={form.projectName}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2 focus:ring-2 focus:ring-blue-500"
            />
            {errors.projectName && (
              <p className="text-red-500 text-sm mt-1">{errors.projectName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              name="description"
              rows="3"
              value={form.description}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2 focus:ring-2 focus:ring-blue-500"
            ></textarea>
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">{errors.description}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Client Name
            </label>
            <input
              type="text"
              name="clientName"
              value={form.clientName}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-4 focus:border-blue-500 focus:outline-none"
            />
            {errors.clientName && (
              <p className="text-red-500 text-sm mt-1">{errors.clientName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Project Lead
            </label>
            <div className="relative">
              <select
                name="projectLead"
                value={form.projectLead}
                onChange={handleChange}
                className="mt-1 block w-full appearance-none rounded-md border border-gray-300 bg-white py-2 px-4 pr-10 focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select Project Lead</option>
                {loadingLeads ? (
                  <option disabled>Loading...</option>
                ) : teamLeads.length === 0 ? (
                  <option disabled>No team leads found</option>
                ) : (
                  teamLeads.map((lead) => (
                    <option key={lead.teamMemberId} value={lead.teamMemberId}>
                      {lead.name.charAt(0).toUpperCase() + lead.name.slice(1)} (
                      {lead.teamMemberId})
                    </option>
                  ))
                )}
              </select>

              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                <svg
                  className="h-4 w-4 text-gray-700"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.4}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>

            {errors.projectLead && (
              <p className="text-red-500 text-sm mt-1">{errors.projectLead}</p>
            )}
          </div>

          <div className="">
            <DropDownWithCheckBox
              label="Team Members"
              options={teamMember}
              onChange={(selectedUsers) => {
                const idsOnly = selectedUsers.map((user) => user?.id);
                setSelectedMember(idsOnly);
              }}
              value={selectedMermber}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Assign Project to Team
            </label>
            <select
              name="teamId"
              value={form.teamId}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Team</option>
              {teams.map((team) => (
                <option key={team._id} value={team._id}>
                  {team.teamName}
                </option>
              ))}
            </select>
            {errors.teamId && (
              <p className="text-red-500 text-sm mt-1">{errors.teamId}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <div className="relative mt-1">
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="appearance-none block w-full rounded-md border border-gray-300 shadow-sm py-2 px-4 pr-10 focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select Status</option>
                <option value="ongoing">Ongoing</option>
                <option value="on hold">On Hold</option>
              </select>

              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center  text-gray-500">
                <svg
                  className="h-4 w-4 text-gray-700"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.4}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>

            {errors.status && (
              <p className="text-red-500 text-sm mt-1">{errors.status}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Start Date
              </label>
              <div className="relative">
                <input
                  ref={startDateRef}
                  type="date"
                  name="startDate"
                  value={form.startDate}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2 pr-10 focus:ring-2 focus:ring-blue-500 [&::-webkit-calendar-picker-indicator]:opacity-0"
                />
                <Calendar
                  className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer"
                  onClick={() => startDateRef.current?.showPicker()}
                />
              </div>
              {errors.startDate && (
                <p className="text-red-500 text-sm mt-1">{errors.startDate}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                End Date
              </label>
              <div className="relative">
                <input
                  ref={endDateRef}
                  type="date"
                  name="endDate"
                  value={form.endDate}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2 pr-10 focus:ring-2 focus:ring-blue-500 [&::-webkit-calendar-picker-indicator]:opacity-0"
                />
                <Calendar
                  className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer"
                  onClick={() => endDateRef.current?.showPicker()}
                />
              </div>
              {errors.endDate && (
                <p className="text-red-500 text-sm mt-1">{errors.endDate}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-semibold flex items-center gap-2"
            >
              <span>{editMode ? "✎" : "＋"}</span>{" "}
              {editMode ? "Update Project" : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Section_a;
