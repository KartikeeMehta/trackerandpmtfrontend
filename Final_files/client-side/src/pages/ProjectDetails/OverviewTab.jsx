import { useState, useEffect } from "react";
import { Users, Calendar, User, Building, FileText, Plus } from "lucide-react";
import { api_url } from "@/api/Api";
import { apiHandler } from "@/api/ApiHandler";

const OverviewTab = ({ project }) => {
  const [teams, setTeams] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [teamLeads, setTeamLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const token = localStorage.getItem("token");

      try {
        // Fetch teams
        const teamsResponse = await apiHandler.GetApi(
          api_url.getAllTeams,
          token
        );
        setTeams(Array.isArray(teamsResponse.teams) ? teamsResponse.teams : []);

        // Fetch employees
        const employeesResponse = await apiHandler.GetApi(
          api_url.getAllEmployees,
          token
        );
        if (Array.isArray(employeesResponse)) {
          setEmployees(employeesResponse);
        } else if (Array.isArray(employeesResponse.employees)) {
          setEmployees(employeesResponse.employees);
        } else {
          setEmployees([]);
        }

        // Fetch team leads
        const leadsResponse = await apiHandler.GetApi(
          api_url.getAllTeamLeads,
          token
        );
        if (Array.isArray(leadsResponse)) {
          setTeamLeads(leadsResponse);
        } else if (Array.isArray(leadsResponse.teamLeads)) {
          setTeamLeads(leadsResponse.teamLeads);
        } else {
          setTeamLeads([]);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getTeamName = (teamId) => {
    const team = teams.find((t) => t._id === teamId);
    return team ? team.teamName : "—";
  };

  const getProjectLeadName = (leadId) => {
    const lead = teamLeads.find((l) => l.teamMemberId === leadId);
    return lead ? lead.name : "—";
  };

  const getTeamMembers = () => {
    if (!project.team_members || !employees.length) return [];
    return employees.filter((emp) =>
      project.team_members.includes(emp.teamMemberId)
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "ongoing":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "on hold":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "ongoing":
        return "Active";
      case "completed":
        return "Completed";
      case "on hold":
        return "On Hold";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Project Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-2xl">
              {project.project_name?.charAt(0).toUpperCase() || "P"}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {project.project_name}
              </h1>
              {/* <p className="text-gray-600 text-lg">
                {project.project_description}
              </p> */}
            </div>
          </div>
          <span
            className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(
              project.project_status
            )}`}
          >
            {getStatusText(project.project_status)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Information */}
        <div className="space-y-6">
          {/* Basic Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building size={20} className="text-blue-600" />
              Project Information
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Client
                </label>
                <p className="text-gray-900 font-medium">
                  {project.client_name || "Not specified"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Project Lead
                </label>
                <p className="text-gray-900 font-medium">
                  {getProjectLeadName(project.project_lead)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Assigned Team
                </label>
                <p className="text-gray-900 font-medium">
                  {getTeamName(project.team_id)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Start Date
                </label>
                <p className="text-gray-900 font-medium">
                  {project.start_date || "Not set"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  End Date
                </label>
                <p className="text-gray-900 font-medium">
                  {project.end_date || "Ongoing"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Team Members & Resources */}
        <div className="space-y-6">
          {/* Team Members */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Users size={20} className="text-green-600" />
                Team Members ({getTeamMembers().length})
              </h3>
            </div>
            <div className="space-y-3">
              {getTeamMembers().length > 0 ? (
                getTeamMembers().map((member, index) => (
                  <div
                    key={member.teamMemberId}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {member.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {member.teamMemberId}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <Users size={24} className="mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No team members assigned</p>
                </div>
              )}
            </div>
          </div>

          {/* Project Description */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6 min-h-[150px]">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Project Description
            </h3>
            <div className="prose max-w-none">
              <p className="text-gray-700 leading-relaxed">
                {project.project_description ||
                  "No detailed description available for this project."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
