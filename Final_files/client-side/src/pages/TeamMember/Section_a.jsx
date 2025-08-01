import {
  Pencil,
  Trash2,
  Mail,
  Clock,
  Activity,
  Users,
  ChevronDown,
} from "lucide-react";
import { Phone, IdCard, MapPin } from "lucide-react";
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
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api_url } from "@/api/Api";
import { apiHandler } from "@/api/ApiHandler";

const Section_a = () => {
  const navigate = useNavigate();
  const [teamMembers, setTeamMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [teamsDropdownOpen, setTeamsDropdownOpen] = useState(false);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    designation: "",
    role: "",
    location: "",
    phoneNo: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fetching, setFetching] = useState(true);
  const [open, setOpen] = useState(false); // <-- Dialog control
  const dropdownRef = useRef(null);

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setTeamsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const fetchMembers = async () => {
      setFetching(true);
      setError("");
      const token = localStorage.getItem("token");
      try {
        const response = await apiHandler.GetApi(
          api_url.getAllEmployees,
          token
        );
        if (Array.isArray(response)) {
          setTeamMembers(response);
        } else {
          setError(response?.message || "Failed to fetch team members");
        }
      } catch (err) {
        setError("Failed to fetch team members");
      } finally {
        setFetching(false);
      }
    };
    fetchMembers();
  }, []);

  useEffect(() => {
    const fetchTeams = async () => {
      const token = localStorage.getItem("token");
      console.log("Token:", token ? "Token exists" : "No token");
      try {
        console.log("Fetching teams from:", api_url.getAllTeams);
        const response = await apiHandler.GetApi(api_url.getAllTeams, token);
        console.log("Teams API response:", response);
        console.log("Response type:", typeof response);
        console.log("Is array:", Array.isArray(response));

        // Handle the correct response format from getAllTeams
        if (response && response.teams && Array.isArray(response.teams)) {
          setTeams(response.teams);
          console.log(
            "Teams set successfully:",
            response.teams.length,
            "teams"
          );
        } else if (Array.isArray(response)) {
          setTeams(response);
          console.log("Teams set successfully:", response.length, "teams");
        } else {
          console.log("No teams found in response");
          setTeams([]);
        }
      } catch (err) {
        console.error("Failed to fetch teams:", err);
        console.error("Error details:", err.response?.data || err.message);
        setTeams([]);
      }
    };
    fetchTeams();
  }, []);

  const handleAddFormChange = (e) => {
    const { name, value } = e.target;
    setAddForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const token = localStorage.getItem("token");
    const payload = { ...addForm };
    try {
      const response = await apiHandler.PostApi(
        api_url.addEmployee,
        payload,
        token
      );

      if (response && response.employee) {
        setTeamMembers((prev) => [...prev, response.employee]);
        setAddForm({
          name: "",
          email: "",
          designation: "",
          role: "",
          location: "",
          phoneNo: "",
        });
        setOpen(false); // ✅ Close dialog on success
      } else {
        setError(response?.message || "Failed to add member");
      }
    } catch (err) {
      setError("Failed to add member");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (teamMemberId) => {
    const token = localStorage.getItem("token");
    try {
      const response = await apiHandler.DeleteApi(
        api_url.deleteEmployee.replace(":teamMemberId", teamMemberId),
        token
      );
      if (response?.message === "Employee deleted successfully") {
        setTeamMembers((prev) =>
          prev.filter((emp) => emp.teamMemberId !== teamMemberId)
        );
      } else {
        alert(response?.message || "Failed to delete employee");
      }
    } catch (err) {
      alert("Failed to delete employee");
    }
  };

  const fetchTeamMembers = async (teamName) => {
    const token = localStorage.getItem("token");
    setLoadingTeamMembers(true);
    try {
      console.log("Fetching members for team:", teamName);
      const response = await apiHandler.GetApi(
        `${api_url.BASE_URL}/teams/${encodeURIComponent(teamName)}/members`,
        token
      );
      console.log("Team members response:", response);

      // Handle different response formats
      if (Array.isArray(response)) {
        // If response is directly an array of members
        setFilteredMembers(response);
      } else if (
        response &&
        response.members &&
        Array.isArray(response.members)
      ) {
        // If response is a team object with members array and teamLead
        console.log("Found members in response.members:", response.members);
        console.log("Found teamLead in response:", response.teamLead);

        // Combine team members and team lead
        let allTeamMembers = [...response.members];

        // Add team lead if it exists and is not already in the members array
        if (response.teamLead && response.teamLead._id) {
          const teamLeadExists = response.members.some(
            (member) => member._id === response.teamLead._id
          );
          if (!teamLeadExists) {
            // Add role property to team lead if it doesn't exist
            const teamLeadWithRole = {
              ...response.teamLead,
              role: response.teamLead.role || "teamLead",
            };
            allTeamMembers.push(teamLeadWithRole);
          }
        }

        console.log("Combined team members and lead:", allTeamMembers);
        setFilteredMembers(allTeamMembers);
      } else if (
        response &&
        Array.isArray(response.data) &&
        response.data.length > 0
      ) {
        // If response has data property with members
        setFilteredMembers(response.data);
      } else {
        console.log("No members found in response:", response);
        setFilteredMembers([]);
      }
    } catch (err) {
      console.error("Failed to fetch team members:", err);
      setFilteredMembers([]);
    } finally {
      setLoadingTeamMembers(false);
    }
  };

  const handleEditMember = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");

    try {
      const url = api_url.updateTeamMember.replace(
        ":teamMemberId",
        editForm.teamMemberId
      );
      const response = await apiHandler.PutApi(url, editForm, token);
      if (response?.message === "Employee updated successfully") {
        setTeamMembers((prev) =>
          prev.map((emp) =>
            emp.teamMemberId === editForm.teamMemberId
              ? { ...emp, ...editForm }
              : emp
          )
        );
        setEditOpen(false);
      } else {
        alert(response?.message || "Failed to update member");
      }
    } catch (err) {
      console.error("API Error:", err);
      alert("Failed to update member");
    }
  };

  // Filter members based on search query
  const getFilteredMembers = () => {
    const membersToFilter = selectedTeam ? filteredMembers : teamMembers;
    
    if (!searchQuery.trim()) {
      return membersToFilter;
    }

    return membersToFilter.filter((member) =>
      member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.designation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.role?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  return (
    <div className="p-4 sm:p-6 md:p-10 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 min-h-screen">
      {/* Header Section */}
      <div className="mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
          <div>
            <h2 className="text-4xl font-bold text-gray-900 mb-2">
              Team Members
            </h2>
            <p className="text-gray-600 text-lg">
              View and manage your team members
            </p>
          </div>

                                           <div className="flex items-center gap-4">
              {/* Search Employees */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-48 px-4 py-3 border border-gray-300 rounded-xl text-sm font-medium shadow-lg hover:shadow-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <svg
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              {/* Teams Dropdown */}
              <div className="relative" ref={dropdownRef}>
               <button
                 onClick={() => setTeamsDropdownOpen(!teamsDropdownOpen)}
                 className="bg-white border border-gray-300 hover:border-gray-400 text-gray-700 px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 w-48"
               >
                <span className="flex-1 text-left">
                  {selectedTeam ? selectedTeam : "Select Team"}
                </span>
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-200 ${
                    teamsDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {teamsDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-60 overflow-y-auto">
                  <div className="py-2">
                    <div
                      className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                      onClick={() => {
                        setSelectedTeam("");
                        setTeamsDropdownOpen(false);
                        setFilteredMembers([]); // Clear filtered members to show all
                      }}
                    >
                      All Teams
                    </div>
                    {teams.length === 0 ? (
                      <div className="px-4 py-3 text-gray-500 text-sm">
                        No teams found
                      </div>
                    ) : (
                      teams.map((team, index) => {
                        console.log(`Team ${index}:`, team);
                        const teamName =
                          team.teamName ||
                          team.name ||
                          team.team_name ||
                          `Team ${index + 1}`;
                        return (
                          <div
                            key={team._id || team.id || index}
                            className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            onClick={() => {
                              setSelectedTeam(teamName);
                              setTeamsDropdownOpen(false);
                              fetchTeamMembers(teamName);
                            }}
                          >
                            {teamName}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

                         <Dialog open={open} onOpenChange={setOpen}>
               <DialogTrigger asChild>
                 <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl flex items-center gap-3 text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 w-48">
                   <Users size={18} /> Add Member
                 </Button>
               </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add Team Member</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddMember} className="grid gap-4">
                  {["name", "email", "designation", "phoneNo", "location"].map(
                    (field) => (
                      <div className="grid gap-2" key={field}>
                        <Label htmlFor={field}>
                          {field.charAt(0).toUpperCase() + field.slice(1)}
                        </Label>
                        <Input
                          id={field}
                          name={field}
                          placeholder={`Enter ${field}`}
                          value={addForm[field]}
                          onChange={handleAddFormChange}
                        />
                      </div>
                    )
                  )}
                  <div className="grid gap-2">
                    <Label htmlFor="role">Role</Label>
                    <select
                      id="role"
                      name="role"
                      className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={addForm.role}
                      onChange={handleAddFormChange}
                    >
                      <option value="">Select</option>
                      <option value="admin">Admin</option>
                      <option value="teamLead">Team Lead</option>
                      <option value="teamMember">Team Member</option>
                    </select>
                  </div>
                  {error && <div className="text-red-600 text-sm">{error}</div>}
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline" type="button">
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button type="submit" disabled={loading}>
                      {loading ? "Adding..." : "Save changes"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {fetching ? (
        <div className="text-center py-20">
          <div className="inline-flex items-center gap-3 text-gray-500 text-lg">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            Loading team members...
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md mx-auto">
            <div className="text-red-600 text-lg font-medium">{error}</div>
          </div>
        </div>
      ) : selectedTeam ? (
        // Show filtered members when a team is selected
        loadingTeamMembers ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center gap-3 text-gray-500 text-lg">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              Loading team members for {selectedTeam}...
            </div>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="text-center py-20">
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 max-w-md mx-auto">
              <div className="text-yellow-600 text-lg font-medium">
                No members found in team "{selectedTeam}"
              </div>
            </div>
          </div>
                 ) : (
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-8">
             {getFilteredMembers().map((member, index) => (
                          <div
              key={member._id || index}
              className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-gray-100 cursor-pointer transition-all duration-300 transform hover:-translate-y-2 overflow-hidden"
              onClick={() => setSelectedMember(member)}
            >
                {/* Card Header with Actions */}
                <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                  <Dialog open={editOpen} onOpenChange={setEditOpen}>
                    <DialogTrigger asChild>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditForm(member);
                          setEditOpen(true);
                        }}
                        className="p-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-md hover:bg-blue-50 transition-colors duration-200"
                      >
                        <Pencil
                          size={16}
                          className="text-gray-600 hover:text-blue-600"
                        />
                      </button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>Edit Team Member</DialogTitle>
                      </DialogHeader>
                      {editForm && (
                        <form
                          onSubmit={(e) => handleEditMember(e)}
                          className="grid gap-4"
                        >
                          {[
                            "name",
                            "email",
                            "designation",
                            "phoneNo",
                            "location",
                          ].map((field) => (
                            <div className="grid gap-2" key={field}>
                              <Label htmlFor={field}>
                                {field.charAt(0).toUpperCase() + field.slice(1)}
                              </Label>
                              <Input
                                id={field}
                                name={field}
                                placeholder={`Enter ${field}`}
                                value={editForm[field]}
                                onChange={(e) =>
                                  setEditForm((prev) => ({
                                    ...prev,
                                    [e.target.name]: e.target.value,
                                  }))
                                }
                                readOnly={field === "name" || field === "email"}
                              />
                            </div>
                          ))}

                          <div className="grid gap-2">
                            <Label htmlFor="role">Role</Label>
                            <select
                              id="role"
                              name="role"
                              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={editForm.role}
                              onChange={(e) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  role: e.target.value,
                                }))
                              }
                            >
                              <option value="">Select</option>
                              <option value="admin">Admin</option>
                              <option value="teamLead">Team Lead</option>
                              <option value="teamMember">Team Member</option>
                            </select>
                          </div>
                          <DialogFooter>
                            <DialogClose asChild>
                              <Button type="button" variant="outline">
                                Cancel
                              </Button>
                            </DialogClose>
                            <Button type="submit">Save Changes</Button>
                          </DialogFooter>
                        </form>
                      )}
                    </DialogContent>
                  </Dialog>

                  <Dialog>
                    <DialogTrigger asChild>
                      <button 
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-md hover:bg-red-50 transition-colors duration-200"
                      >
                        <Trash2
                          size={16}
                          className="text-red-500 hover:text-red-700"
                        />
                      </button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[420px]">
                      <DialogHeader>
                        <DialogTitle>Are you absolutely sure?</DialogTitle>
                        <DialogDescription>
                          This action cannot be undone. This will permanently
                          delete this team member.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <div className="flex justify-center items-center gap-4 w-full">
                          <DialogClose asChild>
                            <Button className="w-28" variant="outline">
                              Cancel
                            </Button>
                          </DialogClose>
                          <Button
                            className="w-28"
                            variant="destructive"
                            onClick={() => handleDelete(member.teamMemberId)}
                          >
                            Delete
                          </Button>
                        </div>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Role Badge */}
                <div className="absolute top-4 left-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold capitalize shadow-lg ${
                      member.role === "admin"
                        ? "bg-gradient-to-r from-red-400 to-red-600 text-white"
                        : member.role === "teamLead"
                        ? "bg-gradient-to-r from-purple-400 to-purple-600 text-white"
                        : "bg-gradient-to-r from-blue-400 to-indigo-600 text-white"
                    }`}
                  >
                    {member.role}
                  </span>
                </div>

                {/* Card Content */}
                <div className="py-2 px-6 pt-16">
                  {/* Member Header */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-xl">
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 capitalize">
                        {member.name}
                      </h3>
                      <p className="text-sm text-gray-500 capitalize">
                        {member.designation || "Not specified"}
                      </p>
                    </div>
                  </div>

                  {/* Hover Effect Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </div>
              </div>
            ))}
          </div>
        )
             ) : getFilteredMembers().length === 0 ? (
         <div className="text-center text-gray-500 text-lg py-20">
           {searchQuery.trim() ? "No employees found matching your search" : "No Team Member"}
         </div>
       ) : (
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-8 ">
           {getFilteredMembers().map((member, index) => (
            <div
              key={member._id || index}
              className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-gray-100 cursor-pointer transition-all duration-300 transform hover:-translate-y-2 overflow-hidden"
              onClick={() => setSelectedMember(member)}
            >
              {/* Card Header with Actions */}
              <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                <Dialog open={editOpen} onOpenChange={setEditOpen}>
                  <DialogTrigger asChild>
                                          <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditForm(member);
                          setEditOpen(true);
                        }}
                        className="p-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-md hover:bg-blue-50 transition-colors duration-200"
                      >
                      <Pencil
                        size={16}
                        className="text-gray-600 hover:text-blue-600"
                      />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Edit Team Member</DialogTitle>
                    </DialogHeader>
                    {editForm && (
                      <form
                        onSubmit={(e) => handleEditMember(e)}
                        className="grid gap-4"
                      >
                        {[
                          "name",
                          "email",
                          "designation",
                          "phoneNo",
                          "location",
                        ].map((field) => (
                          <div className="grid gap-2" key={field}>
                            <Label htmlFor={field}>
                              {field.charAt(0).toUpperCase() + field.slice(1)}
                            </Label>
                            <Input
                              id={field}
                              name={field}
                              placeholder={`Enter ${field}`}
                              value={editForm[field]}
                              onChange={(e) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  [e.target.name]: e.target.value,
                                }))
                              }
                              readOnly={field === "name" || field === "email"}
                            />
                          </div>
                        ))}

                        <div className="grid gap-2">
                          <Label htmlFor="role">Role</Label>
                          <select
                            id="role"
                            name="role"
                            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={editForm.role}
                            onChange={(e) =>
                              setEditForm((prev) => ({
                                ...prev,
                                role: e.target.value,
                              }))
                            }
                          >
                            <option value="">Select</option>
                            <option value="admin">Admin</option>
                            <option value="teamLead">Team Lead</option>
                            <option value="teamMember">Team Member</option>
                          </select>
                        </div>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button type="button" variant="outline">
                              Cancel
                            </Button>
                          </DialogClose>
                          <Button type="submit">Save Changes</Button>
                        </DialogFooter>
                      </form>
                    )}
                  </DialogContent>
                </Dialog>

                <Dialog>
                  <DialogTrigger asChild>
                                          <button 
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-md hover:bg-red-50 transition-colors duration-200"
                      >
                      <Trash2
                        size={16}
                        className="text-red-500 hover:text-red-700"
                      />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                      <DialogTitle>Are you absolutely sure?</DialogTitle>
                      <DialogDescription>
                        This action cannot be undone. This will permanently
                        delete this team member.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <div className="flex justify-center items-center gap-4 w-full">
                        <DialogClose asChild>
                          <Button className="w-28" variant="outline">
                            Cancel
                          </Button>
                        </DialogClose>
                        <Button
                          className="w-28"
                          variant="destructive"
                          onClick={() => handleDelete(member.teamMemberId)}
                        >
                          Delete
                        </Button>
                      </div>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Role Badge */}
              <div className="absolute top-4 left-4">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold capitalize shadow-lg ${
                    member.role === "admin"
                      ? "bg-gradient-to-r from-red-400 to-red-600 text-white"
                      : member.role === "teamLead"
                      ? "bg-gradient-to-r from-purple-400 to-purple-600 text-white"
                      : "bg-gradient-to-r from-blue-400 to-indigo-600 text-white"
                  }`}
                >
                  {member.role}
                </span>
              </div>

              {/* Card Content */}
              <div className="py-2 px-6 pt-16">
                {/* Member Header */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-xl">
                      {member.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 capitalize">
                      {member.name}
                    </h3>
                    <p className="text-sm text-gray-500 capitalize">
                      {member.designation || "Not specified"}
                    </p>
                  </div>
                </div>

                {/* Hover Effect Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Team Member Detail View */}
      {selectedMember && (
                 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] overflow-hidden">
                         {/* Modal Header */}
             <div className="bg-gradient-to-r from-blue-400 to-indigo-400 text-white p-6">
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-4">
                   <div className="w-16 h-16 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                     <span className="text-white font-bold text-2xl">
                       {selectedMember.name.charAt(0).toUpperCase()}
                     </span>
                   </div>
                   <div>
                     <h3 className="text-2xl font-bold">
                       {selectedMember.name}
                     </h3>
                     <p className="text-blue-50 text-sm mt-1">
                       {selectedMember.designation || "Team Member"}
                     </p>
                   </div>
                 </div>
                <button
                  className="w-10 h-10 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full flex items-center justify-center transition-all duration-200"
                  onClick={() => setSelectedMember(null)}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

                                      {/* Modal Content */}
             <div 
               className="p-6 max-h-[calc(85vh-120px)] overflow-y-auto" 
               style={{ 
                 scrollbarWidth: 'none', 
                 msOverflowStyle: 'none',
                 WebkitScrollbar: { display: 'none' }
               }}
             >
                               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                  {/* Left Column - Member Info */}
                  <div className="lg:col-span-2 space-y-6">
                   {/* Basic Information */}
                   <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <IdCard className="w-5 h-5 text-blue-600" />
                      Basic Information
                    </h4>
                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div>
                         <label className="text-sm font-medium text-gray-600">Full Name</label>
                         <p className="text-gray-900 font-semibold">{selectedMember.name}</p>
                       </div>
                       <div>
                         <label className="text-sm font-medium text-gray-600">Email</label>
                         <p className="text-gray-900 font-semibold">{selectedMember.email || "Not provided"}</p>
                       </div>
                       <div>
                         <label className="text-sm font-medium text-gray-600">Designation</label>
                         <p className="text-gray-900 font-semibold capitalize">{selectedMember.designation || "Not specified"}</p>
                       </div>
                       <div>
                         <label className="text-sm font-medium text-gray-600">Role</label>
                         <p className="text-gray-900 font-semibold capitalize">{selectedMember.role || "teamMember"}</p>
                       </div>
                     </div>
                  </div>

                  {/* Contact Information */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Phone className="w-5 h-5 text-green-600" />
                      Contact Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Phone Number</label>
                        <p className="text-gray-900 font-semibold">{selectedMember.phoneNo || "Not provided"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Location</label>
                        <p className="text-gray-900 font-semibold capitalize">{selectedMember.location || "Not specified"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Team Information */}
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5 text-purple-600" />
                      Team Information
                    </h4>
                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div>
                         <label className="text-sm font-medium text-gray-600">Member ID</label>
                         <p className="text-gray-900 font-semibold">{selectedMember.teamMemberId || selectedMember._id || "N/A"}</p>
                       </div>
                     </div>
                  </div>
                </div>

                                                                     {/* Right Column - Quick Actions & Stats */}
                  <div className="space-y-6">
                                                          {/* Quick Actions */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-8 border border-blue-200 min-h-[250px]">
                      <h4 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h4>
                      <div className="space-y-4">
                        <button
                          onClick={() => {
                            setEditForm(selectedMember);
                            setEditOpen(true);
                            setSelectedMember(null);
                          }}
                          className="w-full bg-gradient-to-r from-blue-400 to-indigo-400 hover:from-blue-500 hover:to-indigo-500 text-white px-4 py-4 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2"
                        >
                          <Pencil size={16} />
                          Edit Member
                        </button>
                                                 <button
                           onClick={() => {
                             // Navigate to Create Task page with selected member data
                             navigate("/CreateTask", { 
                               state: { selectedMember: selectedMember } 
                             });
                           }}
                           className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-4 py-4 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2"
                         >
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                           </svg>
                           Add Task
                         </button>
                      </div>
                    </div>

                    {/* Member Statistics */}
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-8 border border-purple-200 min-h-[250px]">
                     <h4 className="text-lg font-semibold text-gray-900 mb-6">Member Statistics</h4>
                     <div className="space-y-6">
                                               <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Status</span>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Active
                          </span>
                        </div>
                       <div className="flex items-center justify-between">
                         <span className="text-sm text-gray-600">Member Since</span>
                         <span className="text-sm font-medium text-gray-900">
                           {new Date().toLocaleDateString()}
                         </span>
                       </div>
                       <div className="flex items-center justify-between">
                         <span className="text-sm text-gray-600">Last Updated</span>
                         <span className="text-sm font-medium text-gray-900">
                           {new Date().toLocaleDateString()}
                         </span>
                       </div>
                                               <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Team Role</span>
                          <span className="text-sm font-medium text-gray-900 capitalize">
                            {selectedMember.role || "Team Member"}
                          </span>
                        </div>
                     </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Section_a;
