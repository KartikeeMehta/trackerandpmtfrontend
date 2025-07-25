import { Pencil, Trash2, Mail, Clock, Activity, Users } from "lucide-react";
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
import { useEffect, useState } from "react";
import { api_url } from "@/api/Api";
import { apiHandler } from "@/api/ApiHandler";

const Section_a = () => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [editForm, setEditForm] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
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

  return (
    <div className="p-4 sm:p-6 md:p-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-blue-900">
            Team Members
          </h2>
          <p className="text-gray-500 text-sm">
            View and manage your team members
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-900 text-white hover:bg-blue-800">
              Add Member
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

      {fetching ? (
        <div className="text-center text-gray-500">Loading team members...</div>
      ) : error ? (
        <div className="text-center text-red-600">{error}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {teamMembers.map((member, index) => (
            <div
              key={member._id || index}
              className="bg-white shadow-md rounded-xl p-5 flex flex-col gap-3 relative"
            >
              <div className="absolute right-4 top-4 flex gap-3">
                <Dialog open={editOpen} onOpenChange={setEditOpen}>
                  <DialogTrigger asChild>
                    <Pencil
                      size={16}
                      className="text-gray-600 cursor-pointer hover:text-blue-500"
                      onClick={() => {
                        setEditForm(member); // set selected member
                        setEditOpen(true);
                      }}
                    />
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
                              readOnly={field === "name" || field === "email"} // ✅ Make these fields read-only
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
                    <Trash2
                      size={16}
                      className="text-red-600 cursor-pointer hover:text-red-800"
                    />
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[420px] ">
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
              <div className="flex items-center gap-3 mt-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {member.name}
                  </h3>
                  <p className="text-sm text-gray-500">{member.role}</p>
                </div>
              </div>
              <div className="flex flex-col gap-1 mt-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <Mail className="w-4 h-4 text-gray-600" />
                  <span className="ml-2">{member.email}</span>
                </div>
                <div className="flex items-center">
                  <Phone className="w-4 h-4 text-gray-600" />
                  <span className="ml-2">{member.phoneNo}</span>
                </div>
                <div className="flex items-center">
                  <IdCard className="w-4 h-4 text-gray-600" />
                  <span className="ml-2">Emp ID: {member.teamMemberId}</span>
                </div>
                <div className="flex items-center">
                  <Activity className="w-4 h-4 text-gray-600" />
                  <span className="ml-2">{member.designation || "N/A"}</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 text-gray-600" />
                  <span className="ml-2">{member.location || "N/A"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Section_a;
