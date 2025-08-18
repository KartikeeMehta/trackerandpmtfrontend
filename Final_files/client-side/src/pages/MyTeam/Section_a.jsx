import { Pencil, Trash2, Mail, Clock, Activity, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { api_url } from "@/api/Api";
import { apiHandler } from "@/api/ApiHandler";

// Helper to format names: First letter capital, rest lowercase for each part
function formatName(name) {
  if (!name) return "";
  return name
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

const Section_a = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [teamLeads, setTeamLeads] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [addForm, setAddForm] = useState({
    teamName: "",
    description: "",
    teamLead: "",
    teamMembers: [],
  });
  const [editForm, setEditForm] = useState({
    teamName: "",
    description: "",
    teamLead: "",
    teamMembers: [],
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [formErrors, setFormErrors] = useState({});

  // UI state for filter/search/activity
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLead, setFilterLead] = useState("");
  const [recentActivity, setRecentActivity] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalTeam, setModalTeam] = useState(null);
  const [modalType, setModalType] = useState("projects");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState(null);
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    // Get user role from localStorage
    const storedUser = localStorage.getItem("user");
    const storedEmployee = localStorage.getItem("employee");

    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setUserRole(user.role || "owner");
      } catch {
        setUserRole("owner");
      }
    } else if (storedEmployee) {
      try {
        const employee = JSON.parse(storedEmployee);
        setUserRole(employee.role || "teamMember");
      } catch {
        setUserRole("teamMember");
      }
    } else {
      setUserRole("owner");
    }

    fetchAll();
  }, []);

  // Simple check if user can see edit/delete icons
  const canSeeEditDelete = () => {
    return (
      userRole === "owner" || userRole === "admin" || userRole === "manager"
    );
  };

  const fetchAll = async () => {
    setLoading(true);
    setError("");
    const token = localStorage.getItem("token");
    try {
      const [
        teamsRes,
        leadsRes,
        membersRes,
        projectsRes,
        tasksRes,
        activityRes,
      ] = await Promise.all([
        apiHandler.GetApi(api_url.getAllTeams, token),
        apiHandler.GetApi(api_url.getAllTeamLeads, token),
        apiHandler.GetApi(api_url.getAllTeamMembers, token),
        apiHandler.GetApi(api_url.getAllProjects, token),
        apiHandler.GetApi(api_url.getAllTasks, token),
        apiHandler.GetApi(api_url.getRecentActivity, token),
      ]);
      setTeams(Array.isArray(teamsRes.teams) ? teamsRes.teams : []);
      setTeamLeads(leadsRes.teamLeads || []);
      setTeamMembers(membersRes.teamMembers || []);
      setProjects(
        Array.isArray(projectsRes.projects) ? projectsRes.projects : []
      );
      setTasks(Array.isArray(tasksRes.tasks) ? tasksRes.tasks : []);
      setRecentActivity(
        Array.isArray(activityRes.activities) ? activityRes.activities : []
      );
    } catch (err) {
      setError("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  // Helpers to get projects/tasks for a team
  const getTeamProjects = (team) => {
    if (!team || !projects.length) return [];
    return projects.filter((p) => {
      // Direct match by team_id or teamId
      if (
        (p.team_id && team._id && p.team_id === team._id) ||
        (p.teamId && team._id && p.teamId === team._id)
      ) {
        return true;
      }
      // If project has team_members as array of IDs
      if (Array.isArray(p.team_members)) {
        return p.team_members.some(
          (id) =>
            id === team.teamLead?.teamMemberId ||
            id === team.teamLead ||
            id === team._id
        );
      }
      // If project has team_name
      if (p.team_name && team.teamName) {
        return p.team_name === team.teamName;
      }
      return false;
    });
  };
  const getTeamTasks = (team) => {
    if (!team || !tasks.length) return [];
    // Try to match by teamMembers or teamLead in task.assignedTo or task.teamId
    return tasks.filter((t) => {
      // If task has teamId
      if (t.teamId && team._id) {
        return t.teamId === team._id;
      }
      // If task has assignedTo (memberId)
      if (t.assignedTo && Array.isArray(team.members)) {
        return team.members.some((m) => m.teamMemberId === t.assignedTo);
      }
      return false;
    });
  };

  // Quick action handlers
  const viewProjects = (team) => {
    setModalTeam(team);
    setModalType("projects");
    setShowModal(true);
  };
  const viewTasks = (team) => {
    setModalTeam(team);
    setModalType("tasks");
    setShowModal(true);
  };

  // Add Team
  const handleAddTeam = async () => {
    setActionLoading(true);
    setActionError("");
    const token = localStorage.getItem("token");
    try {
      const payload = {
        teamName: addForm.teamName,
        description: addForm.description,
        teamLead: addForm.teamLead,
        teamMembers: addForm.teamMembers,
      };
      const res = await apiHandler.PostApi(api_url.createTeam, payload, token);
      if (res.team || res.message?.includes("success")) {
        setShowAddDialog(false);
        setAddForm({
          teamName: "",
          description: "",
          teamLead: "",
          teamMembers: [],
        });
        fetchAll();
      } else {
        setActionError(res.message || "Failed to add team");
      }
    } catch (err) {
      setActionError("Failed to add team");
    } finally {
      setActionLoading(false);
    }
  };

  // Edit Team
  const handleEditTeam = async () => {
    setActionLoading(true);
    setActionError("");
    const token = localStorage.getItem("token");
    try {
      const payload = {
        teamName: editForm.teamName,
        description: editForm.description,
        teamLead: editForm.teamLead,
        teamMembers: editForm.teamMembers,
      };
      const res = await apiHandler.PutApi(api_url.updateTeam, payload, token);
      if (res.team || res.message?.includes("success")) {
        setShowEditDialog(false);
        // Refetch teams and update selectedTeam with the latest data
        const token = localStorage.getItem("token");
        const teamsRes = await apiHandler.GetApi(api_url.getAllTeams, token);
        const newTeams = Array.isArray(teamsRes.teams) ? teamsRes.teams : [];
        setTeams(newTeams);
        const updated = newTeams.find((t) => t.teamName === editForm.teamName);
        if (updated) setSelectedTeam(updated);
      } else {
        setActionError(res.message || "Failed to update team");
      }
    } catch (err) {
      setActionError("Failed to update team");
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Team
  const handleDeleteTeam = async (team) => {
    setActionLoading(true);
    setActionError("");
    const token = localStorage.getItem("token");
    try {
      // Use DELETE method and pass teamName as query param
      const res = await apiHandler.DeleteApi(
        `${api_url.deleteTeam}?teamName=${encodeURIComponent(team.teamName)}`,
        token
      );
      if (res.message?.includes("success")) {
        setSelectedTeam(null);
        fetchAll();
      } else {
        setActionError(res.message || "Failed to delete team");
      }
    } catch (err) {
      setActionError("Failed to delete team");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle delete confirmation
  const confirmDelete = (team) => {
    setTeamToDelete(team);
    setShowDeleteModal(true);
  };

  const executeDelete = async () => {
    if (teamToDelete) {
      await handleDeleteTeam(teamToDelete);
      setShowDeleteModal(false);
      setTeamToDelete(null);
    }
  };

  // UI rendering helpers
  const getLeadName = (team) =>
    team.teamLead?.name ||
    team.teamLead?.teamMemberId ||
    team.lead ||
    team.teamLead;
  const getMemberNames = (team) =>
    (team.members || []).map((m) => m.name || m.teamMemberId || m);

  // Filtering and searching
  const filteredTeams = teams.filter((team) => {
    const matchesSearch =
      !searchTerm ||
      team.teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getLeadName(team)?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLead = !filterLead || getLeadName(team) === filterLead;
    return matchesSearch && matchesLead;
  });

  return (
    <div className="p-4 sm:p-6 md:p-10 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 min-h-screen">
      {/* Filter/Search Bar */}
      <div className="flex flex-wrap gap-2 mb-6 items-center">
        <input
          type="text"
          placeholder="Search teams..."
          className="border rounded px-3 py-2"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {/* <select
          value={filterLead}
          onChange={(e) => setFilterLead(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="">All Leads</option>
          {teamLeads.map((lead) => (
            <option key={lead.teamMemberId} value={lead.name}>
              {lead.name}
            </option>
          ))}
        </select> */}
        <Button
          className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white h-fit ml-auto shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          onClick={() => setShowAddDialog(true)}
        >
          + Add Team
        </Button>
      </div>
      {/* Team Cards */}
      {!selectedTeam ? (
        <div className="flex flex-col gap-4">
          {loading ? (
            <div className="text-center text-gray-500">Loading teams...</div>
          ) : error ? (
            <div className="text-center text-red-600">{error}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-8">
              {filteredTeams.map((team) => (
                <div
                  key={team._id}
                  className="group relative bg-white rounded-2xl shadow-lg hover:shadow-xl border border-gray-200 transition-all duration-300  overflow-hidden"
                >
                  {/* Status Badge */}
                  <div className="absolute top-4 left-4 z-10">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-sm">
                      Active
                    </span>
                  </div>

                  {/* Card Content */}
                  <div className="p-6 pt-12">
                    {/* Team Title */}
                    <h3 className="text-xl font-bold text-gray-900 mb-2 mt-3">
                      {team.teamName}
                    </h3>

                    {/* Team Description */}
                    <p className="text-gray-600 text-sm mb-6 leading-relaxed">
                      {team.description ||
                        "Team collaboration and project management"}
                    </p>

                    {/* Information Sections */}
                    <div className="space-y-3">
                      {/* Team Size */}
                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Users size={16} className="text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {getMemberNames(team).length} Members
                          </p>
                          <p className="text-xs text-gray-500">Team size</p>
                        </div>
                      </div>

                      {/* Assigned Lead */}
                      <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Activity size={16} className="text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {formatName(getLeadName(team))}
                          </p>
                          <p className="text-xs text-gray-500">Assigned lead</p>
                        </div>
                      </div>

                      {/* Team Projects */}
                      <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <Clock size={16} className="text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {getTeamProjects(team).length} Projects
                          </p>
                          <p className="text-xs text-gray-500">
                            Active projects
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-6 pt-4 border-t border-gray-100">
                      {/* View Projects Button */}
                      <Button
                        onClick={() => setSelectedTeam(team)}
                        className="w-full bg-gradient-to-r from-blue-400 to-blue-400 text-white rounded-xl py-2 text-xs font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                        size="sm"
                      >
                        <Activity size={14} className="mr-1" />
                        View Details
                      </Button>
                    </div>

                    <div className="mt-1 pt-4 border-t border-gray-100">
                      {/* View Projects Button */}
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          viewProjects(team);
                        }}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl py-2 text-xs font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                        size="sm"
                      >
                        <Activity size={14} className="mr-1" />
                        View Projects
                      </Button>
                    </div>

                    {/* Action Buttons - Hidden by default, shown on hover - Only for Owner, Admin, Manager */}
                    {canSeeEditDelete() && (
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex gap-2">
                        {/* Edit Button */}
                        <button
                          className="w-8 h-8 bg-white hover:bg-gray-50 text-gray-700 rounded-lg flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditForm({
                              teamName: team.teamName,
                              description: team.description,
                              teamLead:
                                team.teamLead?.teamMemberId || team.teamLead,
                              teamMembers: Array.isArray(team.teamMembers)
                                ? team.teamMembers
                                : Array.isArray(team.members)
                                ? team.members.map((m) => m.teamMemberId)
                                : [],
                            });
                            setShowEditDialog(true);
                          }}
                        >
                          <Pencil size={14} />
                        </button>

                        {/* Delete Button */}
                        <button
                          className="w-8 h-8 bg-white hover:bg-gray-50 text-red-500 rounded-lg flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmDelete(team);
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Add Team Dialog */}
          {showAddDialog && (
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add Team</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="teamName">Team Name</Label>
                    <Input
                      id="teamName"
                      name="teamName"
                      value={addForm.teamName}
                      onChange={(e) =>
                        setAddForm((f) => ({ ...f, teamName: e.target.value }))
                      }
                    />
                    {formErrors.teamName && (
                      <p className="text-red-600 text-sm">
                        {formErrors.teamName}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      name="description"
                      value={addForm.description}
                      onChange={(e) =>
                        setAddForm((f) => ({
                          ...f,
                          description: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="teamLead">Team Lead</Label>
                    <select
                      id="teamLead"
                      name="teamLead"
                      className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={addForm.teamLead}
                      onChange={(e) =>
                        setAddForm((f) => ({ ...f, teamLead: e.target.value }))
                      }
                    >
                      <option value="">Select</option>
                      {teamLeads.map((lead) => (
                        <option
                          key={lead.teamMemberId}
                          value={lead.teamMemberId}
                        >
                          {lead.name} ({lead.teamMemberId})
                        </option>
                      ))}
                    </select>
                    {formErrors.teamLead && (
                      <p className="text-red-600 text-sm">
                        {formErrors.teamLead}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Team Members</Label>
                    <div className="flex flex-wrap gap-2">
                      {teamMembers.map((member) => (
                        <label
                          key={member.teamMemberId}
                          className="space-x-2 flex items-center"
                        >
                          <input
                            type="checkbox"
                            className="form-checkbox text-blue-600 h-4 w-4"
                            checked={addForm.teamMembers.includes(
                              member.teamMemberId
                            )}
                            onChange={(e) => {
                              setAddForm((f) => ({
                                ...f,
                                teamMembers: e.target.checked
                                  ? [...f.teamMembers, member.teamMemberId]
                                  : f.teamMembers.filter(
                                      (id) => id !== member.teamMemberId
                                    ),
                              }));
                            }}
                          />
                          <span className="text-gray-800">
                            {member.name} ({member.teamMemberId})
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {actionError && (
                    <div className="text-red-600 text-sm">{actionError}</div>
                  )}
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button
                      variant="outline"
                      onClick={() => setShowAddDialog(false)}
                    >
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button
                    type="button"
                    onClick={handleAddTeam}
                    disabled={actionLoading}
                  >
                    {actionLoading ? "Adding..." : "Add Team"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-3xl mx-auto">
          {/* Enhanced Back Button */}
          <button
            onClick={() => setSelectedTeam(null)}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4 transition-colors duration-200 group"
          >
            <svg
              className="w-4 h-4 group-hover:scale-110 transition-transform duration-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            <span className="text-sm font-medium">Back to Teams</span>
          </button>

          {/* Team Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-300 to-blue-400 text-white font-bold flex items-center justify-center rounded-xl text-lg shadow-sm">
              {selectedTeam.teamName ? selectedTeam.teamName[0] : "T"}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-1">
                {selectedTeam.teamName}
              </h1>
              <p className="text-gray-500 text-sm">
                Lead:{" "}
                <span className="font-semibold text-blue-600">
                  {formatName(getLeadName(selectedTeam))}
                </span>
              </p>
              {selectedTeam.description && (
                <p className="text-gray-400 text-xs mt-1">
                  {selectedTeam.description}
                </p>
              )}
            </div>
          </div>

          {/* Team Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-300 rounded-lg flex items-center justify-center shadow-sm">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-bold text-blue-700">
                    {getMemberNames(selectedTeam).length + 1}
                  </p>
                  <p className="text-blue-600 text-xs font-medium">
                    Total Members
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-3 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-300 rounded-lg flex items-center justify-center shadow-sm">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-bold text-purple-700">
                    {getTeamProjects(selectedTeam).length}
                  </p>
                  <p className="text-purple-600 text-xs font-medium">
                    Active Projects
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-300 rounded-lg flex items-center justify-center shadow-sm">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-bold text-green-700">
                    {getTeamTasks(selectedTeam).length}
                  </p>
                  <p className="text-green-600 text-xs font-medium">
                    Total Tasks
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Team Members Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800 mb-3">
              Team Members
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Team Lead Card */}
              <div className="bg-gradient-to-br from-purple-50 to-white rounded-lg p-4 border border-purple-200 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-300 to-purple-400 text-white font-bold flex items-center justify-center rounded-lg text-sm shadow-sm">
                    {getLeadName(selectedTeam)
                      ?.split(" ")
                      .map((word) => word[0]?.toUpperCase())
                      .join("")}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-800">
                      Team Lead
                    </h3>
                    <p className="text-purple-600 font-semibold text-sm">
                      {formatName(getLeadName(selectedTeam))}
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-gray-500">
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-xs font-medium">Lead</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-xs font-medium">Active</span>
                  </div>
                </div>
              </div>

              {/* Team Members Card */}
              <div className="bg-gradient-to-br from-green-50 to-white rounded-lg p-4 border border-green-200 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-300 to-green-400 text-white font-bold flex items-center justify-center rounded-lg text-sm shadow-sm">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-800">
                      Team Members
                    </h3>
                    <p className="text-green-600 text-xs">
                      {getMemberNames(selectedTeam).length} members
                    </p>
                  </div>
                </div>

                {getMemberNames(selectedTeam).length === 0 ? (
                  <div className="text-center py-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <svg
                        className="w-6 h-6 text-green-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                        />
                      </svg>
                    </div>
                    <p className="text-green-500 text-sm font-medium">
                      No members in this team
                    </p>
                    <p className="text-green-400 text-xs">
                      Add team members to get started
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {getMemberNames(selectedTeam).map((member, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2 bg-white rounded-md border border-green-100 hover:border-green-200 transition-all duration-200"
                      >
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-300 to-blue-400 text-white font-bold flex items-center justify-center rounded-md text-xs shadow-sm">
                          {(member.name || member)
                            .split(" ")
                            .map((word) => word[0]?.toUpperCase())
                            .join("")}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800 text-sm">
                            {formatName(member.name || member)}
                          </p>
                          <p className="text-gray-500 text-xs">Team Member</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            Active
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {actionError && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="text-red-600 text-sm">{actionError}</div>
            </div>
          )}
        </div>
      )}
      {/* Edit Team Dialog */}
      {showEditDialog && (
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-[500px] bg-white rounded-xl shadow-lg border-0">
            {/* Simple Header */}
            <DialogHeader className="pb-4">
              <DialogTitle className="text-lg font-semibold text-gray-900">
                Edit Team
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Update team information and member assignments
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Team Name Field */}
              <div className="space-y-1">
                <Label
                  htmlFor="teamName"
                  className="text-sm font-medium text-gray-700"
                >
                  Team Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="teamName"
                  name="teamName"
                  value={editForm.teamName}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, teamName: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter team name"
                />
                {formErrors.teamName && (
                  <p className="text-red-600 text-xs">{formErrors.teamName}</p>
                )}
              </div>

              {/* Description Field */}
              <div className="space-y-1">
                <Label
                  htmlFor="description"
                  className="text-sm font-medium text-gray-700"
                >
                  Description
                </Label>
                <textarea
                  id="description"
                  name="description"
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      description: e.target.value,
                    }))
                  }
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Describe the team's purpose..."
                />
              </div>

              {/* Team Lead Field */}
              <div className="space-y-1">
                <Label
                  htmlFor="teamLead"
                  className="text-sm font-medium text-gray-700"
                >
                  Team Lead <span className="text-red-500">*</span>
                </Label>
                <select
                  id="teamLead"
                  name="teamLead"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  value={editForm.teamLead}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, teamLead: e.target.value }))
                  }
                >
                  <option value="">Select Team Lead</option>
                  {teamLeads.map((lead) => (
                    <option key={lead.teamMemberId} value={lead.teamMemberId}>
                      {lead.name} ({lead.teamMemberId})
                    </option>
                  ))}
                </select>
                {formErrors.teamLead && (
                  <p className="text-red-600 text-xs">{formErrors.teamLead}</p>
                )}
              </div>

              {/* Team Members Section */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Team Members
                </Label>
                <div className="bg-gray-50 rounded-md p-3 max-h-32 overflow-y-auto">
                  <div className="space-y-2">
                    {teamMembers.map((member) => (
                      <label
                        key={member.teamMemberId}
                        className="flex items-center gap-2 p-2 bg-white rounded border border-gray-200 hover:border-blue-300 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          checked={editForm.teamMembers.includes(
                            member.teamMemberId
                          )}
                          onChange={(e) => {
                            setEditForm((f) => ({
                              ...f,
                              teamMembers: e.target.checked
                                ? [...f.teamMembers, member.teamMemberId]
                                : f.teamMembers.filter(
                                    (id) => id !== member.teamMemberId
                                  ),
                            }));
                          }}
                        />
                        <span className="text-sm text-gray-900">
                          {member.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {actionError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-red-700 text-sm">{actionError}</p>
                </div>
              )}
            </div>

            {/* Simple Footer */}
            <DialogFooter className="pt-4">
              <div className="flex gap-3 w-full">
                <DialogClose asChild>
                  <Button
                    variant="outline"
                    onClick={() => setShowEditDialog(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  type="button"
                  onClick={handleEditTeam}
                  disabled={actionLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {actionLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Updating...
                    </div>
                  ) : (
                    "Update Team"
                  )}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {showModal && modalTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                    <Activity size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">
                      {modalType === "projects" ? "Projects" : "Tasks"} for{" "}
                      {modalTeam.teamName}
                    </h3>
                    <p className="text-blue-100 text-sm mt-1">
                      {modalType === "projects"
                        ? `${getTeamProjects(modalTeam).length} projects found`
                        : `${getTeamTasks(modalTeam).length} tasks found`}
                    </p>
                  </div>
                </div>
                <button
                  className="w-10 h-10 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full flex items-center justify-center transition-all duration-200"
                  onClick={() => setShowModal(false)}
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
              {modalType === "projects" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {getTeamProjects(modalTeam).map((p, idx) => (
                    <div
                      key={p._id || idx}
                      className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <svg
                              className="w-5 h-5 text-blue-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                              />
                            </svg>
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900 text-lg">
                              {p.project_name || p.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Active
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-600 text-sm leading-relaxed mb-4">
                        {p.project_description ||
                          p.description ||
                          "No description available"}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>
                          Created:{" "}
                          {new Date(
                            p.createdAt || Date.now()
                          ).toLocaleDateString()}
                        </span>
                        <span>Team: {modalTeam.teamName}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {getTeamTasks(modalTeam).map((t, idx) => (
                    <div
                      key={t._id || idx}
                      className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all duration-300"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <svg
                              className="w-5 h-5 text-purple-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                              />
                            </svg>
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900 text-lg">
                              {t.title}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  t.status === "completed"
                                    ? "bg-green-100 text-green-800"
                                    : t.status === "in-progress"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {t.status || "Pending"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-600 text-sm leading-relaxed mb-4">
                        {t.description || "No description available"}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Assigned: {t.assignedTo || "Unassigned"}</span>
                        <span>Team: {modalTeam.teamName}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {((modalType === "projects" &&
                getTeamProjects(modalTeam).length === 0) ||
                (modalType === "tasks" &&
                  getTeamTasks(modalTeam).length === 0)) && (
                <div className="text-center py-12">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-12 h-12 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No {modalType} found
                  </h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    This team doesn't have any {modalType} assigned yet.
                    Projects and tasks will appear here once they're created and
                    assigned to this team.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Team Confirmation Modal */}
      {showDeleteModal && teamToDelete && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Delete Team</h3>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setTeamToDelete(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-700">
                Do you want to delete{" "}
                <span className="font-semibold text-gray-900">
                  {teamToDelete.teamName}
                </span>
                ?
              </p>
              <p className="text-sm text-gray-500 mt-2">
                This action cannot be undone. The team will be permanently
                removed.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setTeamToDelete(null);
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                disabled={actionLoading}
              >
                {actionLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Section_a;
