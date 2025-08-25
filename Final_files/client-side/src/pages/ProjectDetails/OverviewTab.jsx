import { useState, useEffect } from "react";
import { Users, Calendar, User, Building, FileText, Plus, Target, Clock, Award, TrendingUp, Zap } from "lucide-react";
import { api_url } from "@/api/Api";
import { apiHandler } from "@/api/ApiHandler";

const OverviewTab = ({ project, projectId: incomingProjectId }) => {
  const [teams, setTeams] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [teamLeads, setTeamLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [phasesCount, setPhasesCount] = useState(0);
  const [subtasksCount, setSubtasksCount] = useState(0);

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

  // Fetch counts for phases and subtasks and keep them in dedicated cards
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const token = localStorage.getItem("token");
        const projectId =
          incomingProjectId || project?._id || project?.project_id || project?.id;
        if (!projectId) return;
        const [phasesRes, subtasksRes] = await Promise.all([
          apiHandler.GetApi(api_url.getPhases + projectId, token),
          apiHandler.GetApi(api_url.getSubtasks + projectId, token),
        ]);
        const pc = Array.isArray(phasesRes?.phases) ? phasesRes.phases.length : 0;
        const sc = Array.isArray(subtasksRes?.subtasks)
          ? subtasksRes.subtasks.length
          : 0;
        setPhasesCount(pc);
        setSubtasksCount(sc);
      } catch (e) {
        setPhasesCount(0);
        setSubtasksCount(0);
      }
    };
    fetchCounts();
  }, [project]);

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
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "completed":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "on hold":
        return "bg-amber-100 text-amber-800 border-amber-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
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
      <div className="flex items-center justify-center py-16">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-purple-600 rounded-full animate-spin animation-delay-200"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 lg:px-6 py-4 lg:py-6">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Project Information Card */}
          <div className="group bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
            <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-sm">
                  <Building className="w-4 h-4 text-white" />
            </div>
            <div>
                  <h3 className="text-lg font-bold text-gray-900">Project Information</h3>
                  <p className="text-xs text-gray-600">Essential project details</p>
                </div>
            </div>
          </div>
            
            <div className="p-5 space-y-4">
              {/* Status Section */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-600" />
                  <span className="text-gray-700 font-medium text-sm">Status</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(project.project_status)}`}>
            {getStatusText(project.project_status)}
          </span>
        </div>

              {/* Grid Layout for Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-gradient-to-br from-purple-50 to-teal-50 rounded-lg border border-purple-100 hover:bg-gradient-to-br hover:from-purple-100 hover:to-pink-100 transition-all duration-200">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-3 h-3 text-purple-600" />
                    <span className="text-gray-600 text-xs font-medium">Client</span>
      </div>
                  <p className="text-gray-900 font-semibold text-sm">
                  {project.client_name || "Not specified"}
                </p>
              </div>

                <div className="p-3 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg border border-emerald-100 hover:bg-gradient-to-br hover:from-emerald-100 hover:to-teal-100 transition-all duration-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Award className="w-3 h-3 text-emerald-600" />
                    <span className="text-gray-600 text-xs font-medium">Project Lead</span>
                  </div>
                  <p className="text-gray-900 font-semibold text-sm">
                  {getProjectLeadName(project.project_lead)}
                </p>
              </div>

                <div className="p-3 bg-gradient-to-br from-pink-50 to-rose-50 rounded-lg border border-pink-100 hover:bg-gradient-to-br hover:from-pink-100 hover:to-rose-100 transition-all duration-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-3 h-3 text-pink-600" />
                    <span className="text-gray-600 text-xs font-medium">Assigned Team</span>
                  </div>
                  <p className="text-gray-900 font-semibold text-sm">
                  {getTeamName(project.team_id)}
                </p>
              </div>

                <div className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border border-amber-100 hover:bg-gradient-to-br hover:from-amber-100 hover:to-orange-100 transition-all duration-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-3 h-3 text-amber-600" />
                    <span className="text-gray-600 text-xs font-medium">Start Date</span>
                  </div>
                  <p className="text-gray-900 font-semibold text-sm">
                  {project.start_date || "Not set"}
                </p>
              </div>
              </div>

              {/* End Date Section */}
              <div className="p-3 bg-gradient-to-br from-red-50 to-pink-50 rounded-lg border border-red-100">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-3 h-3 text-red-600" />
                  <span className="text-gray-600 text-xs font-medium">End Date</span>
                </div>
                <p className="text-gray-900 font-semibold text-sm">
                  {project.end_date || "Ongoing"}
                </p>
              </div>
            </div>
          </div>

          {/* Project Description Card */}
          <div className="group bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
            <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Project Description</h3>
                  <p className="text-xs text-gray-600">Project overview & details</p>
                </div>
              </div>
            </div>
            
            <div className="p-5">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-gray-800 leading-relaxed text-sm">
                  {project.project_description ||
                    "No detailed description available for this project."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Project Metrics Card */}
          <div className="group bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
            <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-pink-50 via-rose-50 to-red-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-sm">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Project Metrics</h3>
                  <p className="text-xs text-gray-600">Key performance indicators</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 space-y-3">
              {/* Phases Metric */}
              <div className="group/item p-3 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg border border-blue-200 hover:scale-105 hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md group-hover/item:scale-110 transition-transform">
                      <FileText className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-gray-700 text-xs font-medium">Total Phases</p>
                      <p className="text-xl font-bold text-gray-900">{phasesCount}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400/20 to-indigo-500/20 rounded-full flex items-center justify-center">
                      <span className="text-base font-bold text-blue-600">{phasesCount}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Subtasks Metric */}
              <div className="group/item p-3 bg-gradient-to-br from-purple-50 to-pink-100 rounded-lg border border-purple-200 hover:scale-105 hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center shadow-md group-hover/item:scale-110 transition-transform">
                      <Zap className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-gray-700 text-xs font-medium">Total Subtasks</p>
                      <p className="text-xl font-bold text-gray-900">{subtasksCount}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-400/20 to-pink-500/20 rounded-full flex items-center justify-center">
                      <span className="text-base font-bold text-purple-600">{subtasksCount}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Team Members Card */}
          <div className="group bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
            <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-cyan-50 via-blue-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-sm">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Team Members</h3>
                  <p className="text-xs text-gray-600">{getTeamMembers().length} active members</p>
                </div>
              </div>
            </div>
            
            <div className="p-5 space-y-3">
              {getTeamMembers().length > 0 ? (
                getTeamMembers().map((member, index) => (
                  <div
                    key={member.teamMemberId}
                    className="group/item p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:border-blue-200 hover:scale-105 hover:shadow-sm transition-all duration-300"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center shadow-sm group-hover/item:scale-110 transition-transform">
                          <span className="text-white font-bold text-sm">
                      {member.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full border border-white animate-pulse"></div>
                    </div>
                    <div className="flex-1">
                        <p className="text-gray-900 font-semibold text-sm">
                        {member.name}
                      </p>
                        <p className="text-gray-600 text-xs">
                        {member.teamMemberId}
                      </p>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full border border-emerald-200">
                          Active
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Users className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-gray-600 text-sm font-medium">No team members assigned</p>
                  <p className="text-gray-500 text-xs mt-1">Add team members to get started</p>
                </div>
              )}
            </div>
          </div>
            </div>
          </div>

      <style jsx>{`
        .animation-delay-200 { animation-delay: 200ms; }
      `}</style>
    </div>
  );
};

export default OverviewTab;
