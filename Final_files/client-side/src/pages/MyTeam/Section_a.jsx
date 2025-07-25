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

  // Fetch teams, leads, and members
  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    setError("");
    const token = localStorage.getItem("token");
    try {
      const [teamsRes, leadsRes, membersRes] = await Promise.all([
        apiHandler.GetApi(api_url.getAllTeams, token),
        apiHandler.GetApi(api_url.getAllTeamLeads, token),
        apiHandler.GetApi(api_url.getAllTeamMembers, token),
      ]);
      setTeams(Array.isArray(teamsRes.teams) ? teamsRes.teams : []);
      setTeamLeads(leadsRes.teamLeads || []);
      setTeamMembers(membersRes.teamMembers || []);
    } catch (err) {
      setError("Failed to fetch data");
    } finally {
      setLoading(false);
    }
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
    if (!window.confirm(`Delete team '${team.teamName}'?`)) return;
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

  // UI rendering helpers
  const getLeadName = (team) =>
    team.teamLead?.name ||
    team.teamLead?.teamMemberId ||
    team.lead ||
    team.teamLead;
  const getMemberNames = (team) =>
    (team.members || []).map((m) => m.name || m.teamMemberId || m);

  return (
    <div className="p-4 sm:p-6 md:p-10">
      {!selectedTeam ? (
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold text-blue-900">Teams</h2>
              <p className="text-gray-500 text-sm mb-6">
                Manage your teams and their members
              </p>
            </div>
            <Button
              className="bg-blue-900 text-white hover:bg-blue-800 h-fit"
              onClick={() => setShowAddDialog(true)}
            >
              + Add Team
            </Button>
          </div>
          {loading ? (
            <div className="text-center text-gray-500">Loading teams...</div>
          ) : error ? (
            <div className="text-center text-red-600">{error}</div>
          ) : (
            <div className="flex flex-wrap gap-4">
              {teams.map((team) => (
                <div
                  key={team._id}
                  onClick={() => setSelectedTeam(team)}
                  className="cursor-pointer bg-white rounded-2xl shadow p-4 flex items-center gap-4 w-full sm:w-[32%] md:w-[32%] lg:w-[32%] hover:bg-gray-100 transition"
                  style={{ minWidth: "300px", maxWidth: "400px" }}
                >
                  <div className="w-16 h-16 bg-blue-100 text-blue-700 font-bold flex items-center justify-center rounded-full text-xl">
                    {team.teamName ? team.teamName[0] : "T"}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{team.teamName}</h3>
                    <p className="text-gray-500 text-sm">
                      Lead: {formatName(getLeadName(team))}
                    </p>
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
        <div className="bg-white rounded-2xl shadow p-6">
          <button
            onClick={() => setSelectedTeam(null)}
            className=" text-black-400 text-sm mb-4"
          >
            ← Back to Teams
          </button>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-blue-100 text-blue-700 font-bold flex items-center justify-center rounded-full text-3xl">
                {selectedTeam.teamName ? selectedTeam.teamName[0] : "T"}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{selectedTeam.teamName}</h1>
                <p className="text-gray-500">
                  Lead: {formatName(getLeadName(selectedTeam))}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditForm({
                    teamName: selectedTeam.teamName,
                    description: selectedTeam.description,
                    teamLead:
                      selectedTeam.teamLead?.teamMemberId ||
                      selectedTeam.teamLead,
                    teamMembers: Array.isArray(selectedTeam.teamMembers)
                      ? selectedTeam.teamMembers
                      : Array.isArray(selectedTeam.members)
                      ? selectedTeam.members.map((m) => m.teamMemberId)
                      : [],
                  });
                  setShowEditDialog(true);
                }}
                disabled={actionLoading}
              >
                Edit Team
              </Button>
              <Button
                className="bg-red-500 text-white hover:bg-red-600"
                onClick={() => handleDeleteTeam(selectedTeam)}
              >
                Delete Team
              </Button>
            </div>
          </div>
          <hr />
          <div className="mt-6">
            <h2 className="text-lg font-bold mb-2">Team Members</h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="bg-gray-100 p-4 rounded-lg w-full sm:w-1/2">
                <h3 className="font-semibold mb-2">Team Lead</h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 text-blue-700 font-bold flex items-center justify-center rounded-full text-sm">
                    {getLeadName(selectedTeam)
                      ?.split(" ")
                      .map((word) => word[0]?.toUpperCase())
                      .join("")}
                  </div>
                  <div>
                    <p className="font-medium">
                      {formatName(getLeadName(selectedTeam))}
                    </p>
                    <p className="text-sm text-gray-500">Team Lead</p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-100 p-4 rounded-lg w-full sm:w-1/2">
                <h3 className="font-semibold mb-2">Team Members</h3>
                {getMemberNames(selectedTeam).length === 0 ? (
                  <p className="text-gray-500">No members in this team.</p>
                ) : (
                  getMemberNames(selectedTeam).map((member, idx) => (
                    <div key={idx} className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-blue-100 text-blue-700 font-bold flex items-center justify-center rounded-full text-sm">
                        {(member.name || member)
                          .split(" ")
                          .map((word) => word[0]?.toUpperCase())
                          .join("")}
                      </div>
                      <p>{formatName(member.name || member)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
            {actionError && (
              <div className="text-red-600 text-sm mt-2">{actionError}</div>
            )}
          </div>
        </div>
      )}
      {/* Edit Team Dialog */}
      {showEditDialog && (
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Team</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="teamName">Team Name</Label>
                <Input
                  id="teamName"
                  name="teamName"
                  value={editForm.teamName}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, teamName: e.target.value }))
                  }
                />
                {formErrors.teamName && (
                  <p className="text-red-600 text-sm">{formErrors.teamName}</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  name="description"
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm((f) => ({
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
                  value={editForm.teamLead}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, teamLead: e.target.value }))
                  }
                >
                  <option value="">Select</option>
                  {teamLeads.map((lead) => (
                    <option key={lead.teamMemberId} value={lead.teamMemberId}>
                      {lead.name} ({lead.teamMemberId})
                    </option>
                  ))}
                </select>
                {formErrors.teamLead && (
                  <p className="text-red-600 text-sm">{formErrors.teamLead}</p>
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
                  onClick={() => setShowEditDialog(false)}
                >
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="button"
                onClick={handleEditTeam}
                disabled={actionLoading}
              >
                {actionLoading ? "Updating..." : "Update Team"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
export default Section_a;
