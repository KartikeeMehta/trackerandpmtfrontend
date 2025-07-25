import React, { useEffect, useState } from "react";
import { api_url, image_url } from "@/api/Api";
import { apiHandler } from "@/api/ApiHandler";
import { Users, Building2, Settings, Pencil } from "lucide-react";

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  });
  if (!message) return null;
  return (
    <div className={`fixed`} style={{ top: "10%", right: "1%" }}>
      <div
        className={`px-6 py-3 rounded shadow-lg text-white font-medium transition-all ${
          type === "success" ? "bg-green-600" : "bg-red-600"
        }`}
        role="alert"
      >
        {message}
        <button className="ml-4 text-white font-bold" onClick={onClose}>
          ×
        </button>
      </div>
    </div>
  );
}

const getUserType = () => {
  const storedType = localStorage.getItem("userType");
  if (storedType) return storedType;
  // fallback: try to infer from user object
  const stored = localStorage.getItem("user");
  if (stored) {
    const u = JSON.parse(stored);
    if (u.companyName) return "user";
    if (u.teamMemberId) return "employee";
  }
  return "user";
};

const Profile = () => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : {};
  });
  const [userType, setUserType] = useState(getUserType());
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(
    userType === "employee"
      ? {
          name: user.name || "",
          email: user.email || "",
          teamMemberId: user.teamMemberId || "",
          leadMember: user.leadMember || "",
          role: user.role || "employee",
          location: user.location || "",
        }
      : {
          companyName: user.companyName || "",
          companyDomain: user.companyDomain || "",
          companyAddress: user.companyAddress || "",
          founded_year: user.founded_year || "",
          website: user.website || "",
          industry: user.industry || "",
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          email: user.email || "",
          department: user.department || "",
          accountType: user.accountType || "Standard",
        }
  );
  const [toast, setToast] = useState({ message: "", type: "success" });
  const [logoPreview, setLogoPreview] = useState(
    user.companyLogo ? api_url.base + user.companyLogo : null
  );
  const [logoFile, setLogoFile] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setToast({ message: "", type: "success" });
    const token = localStorage.getItem("token");
    if (!token) {
      setToast({
        message: "No token found. Please log in again.",
        type: "error",
      });
      return;
    }
    if (userType === "employee") {
      // Employee update (use PUT /api/employees/editEmployee/:teamMemberId)
      const response = await apiHandler.PutApi(
        api_url.addEmployee.replace(
          "/addEmployee",
          `/editEmployee/${user.teamMemberId}`
        ),
        form,
        token
      );
      if (response && response.employee) {
        setUser(response.employee);
        localStorage.setItem("user", JSON.stringify(response.employee));
        setEditMode(false);
        setToast({ message: "Profile updated successfully!", type: "success" });
      } else {
        setToast({
          message: response?.message || "Update failed.",
          type: "error",
        });
      }
      return;
    }
    // Use FormData for file upload
    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      formData.append(key, value);
    });
    if (logoFile) {
      formData.append("companyLogo", logoFile);
    }
    // Use PATCH for update
    const response = await apiHandler.UpdateApi(
      api_url.register.replace("/register", "/update"),
      formData,
      token,
      true // isFormData
    );
    if (response && response.user) {
      setUser(response.user);
      localStorage.setItem("user", JSON.stringify(response.user));
      setEditMode(false);
      setToast({ message: "Profile updated successfully!", type: "success" });
      setLogoFile(null);
    } else {
      setToast({
        message: response?.message || "Update failed.",
        type: "error",
      });
    }
  };

  return (
    <div className="max-w-full">
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: toast.type })}
      />
      {userType === "employee" ? (
        <div>
          <div className="flex items-center gap-4 mb-8">
            <div className="h-16 w-16 rounded-full border bg-gray-200 flex items-center justify-center text-2xl font-bold">
              {user.name ? user.name[0] : "E"}
            </div>
            <div>
              <h2 className="text-3xl font-bold">Employee Profile</h2>
            </div>
            <button
              className="ml-auto px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
              onClick={() => setEditMode((prev) => !prev)}
            >
              {editMode ? "Cancel" : "Edit Profile"}
            </button>
          </div>
          <div className="bg-gray-50 rounded-lg p-6 shadow-sm">
            {editMode ? (
              <form
                onSubmit={handleUpdate}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                <div>
                  <label className="block text-sm font-medium">Name</label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Email</label>
                  <input
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">
                    Team Member ID
                  </label>
                  <input
                    value={form.teamMemberId}
                    className="w-full border rounded px-3 py-2 bg-gray-100 cursor-not-allowed"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">
                    Lead Member
                  </label>
                  <input
                    name="leadMember"
                    value={form.leadMember}
                    onChange={handleChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Role</label>
                  <input
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Location</label>
                  <input
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="font-semibold">Name</div>
                  <div>{user.name || "Not specified"}</div>
                </div>
                <div>
                  <div className="font-semibold">Email</div>
                  <div>{user.email || "Not specified"}</div>
                </div>
                <div>
                  <div className="font-semibold">Team Member ID</div>
                  <div>{user.teamMemberId || "Not specified"}</div>
                </div>
                <div>
                  <div className="font-semibold">Lead Member</div>
                  <div>{user.leadMember || "Not specified"}</div>
                </div>
                <div>
                  <div className="font-semibold">Role</div>
                  <div>{user.role || "Not specified"}</div>
                </div>
                <div>
                  <div className="font-semibold">Location</div>
                  <div>{user.location || "Not specified"}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="w-full mt-4 p-4 sm:p-8 bg-gray-50">
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast({ message: "", type: toast.type })}
          />
          <div className="flex items-center gap-4 mb-8">
            <img
              src={
                
                (user.companyLogo
                  ? image_url + user.companyLogo
                  : "/vite.svg")
              }
              alt="Company Logo"
              className="h-16 w-16 rounded-full border object-cover"
            />
            <div>
              <h2 className="text-3xl font-bold">Company Profile</h2>
            </div>
            <button
              className="ml-auto px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
              onClick={() => setEditMode((prev) => !prev)}
            >
              {editMode ? "Cancel" : "Edit Profile"}
            </button>
          </div>

          <div className="space-y-8">
            {/* User Information */}
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <div className=" gap-2 mb-4">
                <div className="font-bold flex items-center gap-2">
                  <div className="text-blue-500">
                    <Users />
                  </div>
                  <h2 className="text-2xl">User Information</h2>
                </div>
                <div className="text-gray-500 text-sm">
                  Your personal and professional details
                </div>
              </div>
              {editMode ? (
                <form
                  onSubmit={handleUpdate}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                >
                  <div>
                    <label className="block text-sm font-medium">
                      First Name
                    </label>
                    <input
                      name="firstName"
                      value={form.firstName}
                      onChange={handleChange}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">
                      Last Name
                    </label>
                    <input
                      name="lastName"
                      value={form.lastName}
                      onChange={handleChange}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Email</label>
                    <input
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">
                      Department
                    </label>
                    <input
                      name="department"
                      value={form.department}
                      onChange={handleChange}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">
                      Account Type
                    </label>
                    <input
                      name="accountType"
                      value={form.accountType}
                      onChange={handleChange}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="text-500">Full Name</div>
                    <div className="font-bold">
                      {user.firstName || ""} {user.lastName || ""}
                    </div>
                  </div>
                  <div>
                    <div className="text-500">Employee ID</div>
                    <div className="font-bold">
                      {user.employeeID || "Not specified"}
                    </div>
                  </div>
                  <div>
                    <div className="text-500">Email</div>
                    <div className="font-bold">
                      {user.email || "Not specified"}
                    </div>
                  </div>
                  <div>
                    <div className="text-500">Department</div>
                    <div className="font-bold">
                      {user.department || "Not specified"}
                    </div>
                  </div>
                  <div>
                    <div className="text-500">Role</div>
                    <div className="font-bold">
                      {user.role || "Not specified"}
                    </div>
                  </div>
                  <div>
                    <div className="text-500">Join Date</div>
                    <div className="font-bold">
                      {user.joinDate
                        ? new Date(user.joinDate).toLocaleDateString()
                        : "Not specified"}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Company Details */}
            <div className=" bg-white rounded-lg p-6 shadow-sm border">
              <div className=" gap-2 mb-4">
                <div className="font-bold flex items-center gap-2">
                  <div className="text-blue-500">
                    <Building2 />
                  </div>
                  <h2 className="text-2xl">Company Details</h2>
                </div>
                <div className="text-gray-500 text-sm">
                  Basic information about your company
                </div>
              </div>
              {editMode ? (
                <form
                  onSubmit={handleUpdate}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                  encType="multipart/form-data"
                >
                  <div className="col-span-2">
                    <label className="block text-sm font-medium">
                      Company Logo
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                    />
                    {logoPreview && (
                      <img
                        src={logoPreview}
                        alt="Logo Preview"
                        className="h-16 mt-2 rounded border object-cover"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-sm ">Company Name</label>
                    <input
                      name="companyName"
                      value={form.companyName}
                      className="w-full border rounded px-3 py-2 cursor-not-allowed"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm">Company ID</label>
                    <input
                      value={user.companyID || ""}
                      className="w-full border rounded px-3 py-2 bg-gray-100 cursor-not-allowed"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">
                      Company Address
                    </label>
                    <input
                      name="companyAddress"
                      value={form.companyAddress}
                      onChange={handleChange}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">
                      Founded Year
                    </label>
                    <input
                      value={user.founded_year || ""}
                      className="w-full border rounded px-3 py-2 bg-gray-100 cursor-not-allowed"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Website</label>
                    <input
                      name="website"
                      value={form.website}
                      onChange={handleChange}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">
                      Industry
                    </label>
                    <input
                      name="industry"
                      value={form.industry}
                      onChange={handleChange}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  <div className="col-span-2">
                    <button
                      type="submit"
                      className="mt-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="text-500">Company Name</div>
                    <div className="font-bold">
                      {user.companyName || "Not specified"}
                    </div>
                  </div>
                  <div>
                    <div className="text-500">Company ID</div>
                    <div className="font-bold">
                      {user.companyID || "Not specified"}
                    </div>
                  </div>
                  <div>
                    <div className="text-500">Address</div>
                    <div className="font-bold">
                      {user.companyAddress || "Not specified"}
                    </div>
                  </div>
                  <div>
                    <div className="text-500">Website</div>
                    <div className="font-bold">
                      {user.website || "Not specified"}
                    </div>
                  </div>
                  <div>
                    <div className="text-500">Industry</div>
                    <div className="font-bold">
                      {user.industry || "Not specified"}
                    </div>
                  </div>
                  <div>
                    <div className="text-500">Founded Year</div>
                    <div className="font-bold">
                      {user.founded_year || "Not specified"}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Account Settings (view only) */}
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <div className=" gap-2 mb-4">
                <div className="font-bold flex items-center gap-2">
                  <div className="text-blue-500">
                    <Settings />
                  </div>
                  <h2 className="text-2xl">Account Setting</h2>
                </div>
                <div className="text-gray-500 text-sm">
                  Your account preferences and settings
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-500">Account Status</div>
                  <div className="text-green-500 font-bold">
                    {user.accountStatus || "Active"}
                  </div>
                </div>
                <div>
                  <div className="text-500">Email Verification</div>
                  <div className="text-green-500 font-bold">
                    {user.emailVerified ? "Verified" : "Not Verified"}
                  </div>
                </div>
                <div>
                  <div className="text-500d">Last Login</div>
                  <div className="font-bold">
                    {user.lastLogin
                      ? new Date(user.lastLogin).toLocaleString()
                      : "Not specified"}
                  </div>
                </div>
                <div>
                  <div className="text-500">Account Type</div>
                  <div className="font-bold">
                    {user.accountType || "Standard"}
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

export default Profile;
