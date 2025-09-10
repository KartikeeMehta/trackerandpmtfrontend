import React, { useState, useEffect } from "react";
import { Shield, Eye, EyeOff, X, Check, AlertTriangle, Bell, Palette, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api_url } from "@/api/Api";
import { apiHandler } from "@/api/ApiHandler";
import { useNavigate } from "react-router-dom";
import CustomToast from "@/components/CustomToast";
import NotificationSettings from "@/components/NotificationSettings";

const Section_a = () => {
  const [loading, setLoading] = useState(false);
  const navigate =useNavigate()
  const [message, setMessage] = useState({ type: "", text: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Notification preferences
  const [prefs, setPrefs] = useState(null);
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    apiHandler
      .GetApi(api_url.getMyNotifPrefs, token)
      .then((res) => setPrefs(res))
      .catch(() => {});
  }, []);

  // Tabs (side navigation)
  const [activeTab, setActiveTab] = useState("security"); // 'security' | 'notifications'

  const preferenceMeta = {
    project_created: { label: "Project Created", desc: "Receive notifications when a new project is assigned" },
    project_completed: { label: "Project Completed", desc: "Be notified when a project is marked completed" },
    project_deadline: { label: "Project Deadline", desc: "Reminders for upcoming project deadlines" },
    phase_added: { label: "Phase Added", desc: "Notify when a new project phase is created" },
    phase_deadline: { label: "Phase Deadline", desc: "Reminders for upcoming phase deadlines" },
    subtask_assigned: { label: "Subtask Assigned", desc: "Alerts when a subtask is assigned to you" },
    subtask_deadline: { label: "Subtask Deadline", desc: "Reminders for upcoming subtask deadlines" },
    team_created: { label: "Team Created", desc: "When you are added to a new team" },
    team_member_added: { label: "Team Member Added", desc: "When you are added to a team" },
    chat_mention: { label: "Chat Mention", desc: "Notify when someone mentions you with @ in chat" },
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    // Validation
    if (!passwordForm.currentPassword.trim()) {
      setMessage({ type: "error", text: "Current password is required" });
      setLoading(false);
      return;
    }

    if (!passwordForm.newPassword.trim()) {
      setMessage({ type: "error", text: "New password is required" });
      setLoading(false);
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setMessage({
        type: "error",
        text: "New password must be at least 6 characters long",
      });
      setLoading(false);
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: "error", text: "New password and confirm password do not match" });
      setLoading(false);
      return;
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setMessage({
        type: "error",
        text: "New password must be different from current password",
      });
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setMessage({
        type: "error",
        text: "Authentication token not found. Please login again.",
      });
      setLoading(false);
      return;
    }
    const obj = {
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
      confirmNewPassword: passwordForm?.confirmPassword

    }


    try {
      let response = await apiHandler.postApiWithToken(api_url.change_Password, obj, token);
      if (response && (response.message === "Password changed successfully" || response.success)) {
        setMessage(response?.message)
         localStorage.removeItem("token");
        navigate("/Login")
      }

      else {
        setMessage({
          type: "error",
          text:
            response?.message ||
            response?.error ||
            "Failed to change password. Please try again.",
        });
      }
    } catch (error) {
      console.error("Password change error:", error);

      // Handle specific error cases
      if (error.response?.status === 401) {
        setMessage({
          type: "error",
          text: "Current password is incorrect. Please check and try again.",
        });
      } else if (error.response?.status === 400) {
        setMessage({
          type: "error",
          text:
            error.response?.data?.message ||
            "Invalid password format. Please check your input.",
        });
      } else if (error.response?.status === 500) {
        setMessage({
          type: "error",
          text: "Server error occurred. Please try again later.",
        });
      } else {
        setMessage({
          type: "error",
          text: "An error occurred while changing password. Please check your connection and try again.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const togglePref = async (key) => {
    if (!prefs) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    const newValue = !(prefs?.[key] !== false);
    const payload = { [key]: newValue };
    const updated = await apiHandler.UpdateApi(api_url.updateMyNotifPrefs, payload, token);
    setPrefs(updated);
  };

  return (
    <div className="p-4 sm:p-6 md:p-10 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600 text-lg">Manage your account preferences and security</p>
      </div>

      {/* Content Area with Side Navigation */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left Nav */}
        <aside className="md:col-span-1 flex justify-center">
          <div className="bg-white rounded-xl border shadow-sm p-2 max-w-[260px] w-full">
            <nav className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => setActiveTab("security")}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === "security" ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className="flex items-center gap-2"><Lock className="w-4 h-4" />Security</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("notifications")}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === "notifications" ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className="flex items-center gap-2"><Bell className="w-4 h-4" />Notifications</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("appearance")}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === "appearance" ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className="flex items-center gap-2"><Palette className="w-4 h-4" />Appearance</span>
                <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">Maintenance</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("privacy")}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === "privacy" ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className="flex items-center gap-2"><Shield className="w-4 h-4" />Privacy</span>
                <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">Maintenance</span>
              </button>
            </nav>
          </div>
        </aside>

        {/* Right Content */}
        <section className="md:col-span-3 space-y-6">
          {activeTab === "security" && (
            <div className="bg-white rounded-xl shadow-md border p-6 md:p-8 w-full">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Security Settings</h2>

              {/* Message Display */}
              {message.text && (
                <div
                  className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
                    message.type === "success"
                      ? "bg-green-50 border border-green-200 text-green-800"
                      : "bg-red-50 border border-red-200 text-red-800"
                  }`}
                >
                  {message.type === "success" ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  )}
                  <span className="font-medium">{message.text}</span>
                  <button
                    onClick={() => setMessage({ type: "", text: "" })}
                    className="ml-auto text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="space-y-8">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Change Password</h3>
                  <form onSubmit={handlePasswordChange} className="space-y-6">
                    <div>
                      <Label htmlFor="currentPassword" className="text-sm font-medium text-gray-700">Current Password</Label>
                      <div className="relative mt-2">
                        <Input
                          id="currentPassword"
                          type={showPassword ? "text" : "password"}
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                          placeholder="Enter current password"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="newPassword" className="text-sm font-medium text-gray-700">New Password</Label>
                      <div className="relative mt-2">
                        <Input
                          id="newPassword"
                          type={showNewPassword ? "text" : "password"}
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                          placeholder="Enter new password"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                          minLength={6}
                        />
                        <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                          {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Password must be at least 6 characters long</p>
                    </div>

                    <div>
                      <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">Confirm New Password</Label>
                      <div className="relative mt-2">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                          placeholder="Confirm new password"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                          {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button type="submit" disabled={loading} className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed">
                        {loading ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            Changing Password...
                          </div>
                        ) : (
                          "Change Password"
                        )}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="bg-white rounded-xl shadow-md border p-6 md:p-8 w-full">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Notification Settings</h2>
              {prefs ? (
                <div className="grid grid-cols-1 gap-3">
                  {Object.keys(preferenceMeta).map((key) => (
                    <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{preferenceMeta[key].label}</div>
                        <div className="text-xs text-gray-500">{preferenceMeta[key].desc}</div>
                      </div>
                      {(() => {
                        const enabled = prefs?.[key] !== false;
                        return (
                          <button
                            type="button"
                            onClick={() => togglePref(key)}
                            aria-pressed={enabled}
                            className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none ${
                              enabled ? "bg-green-500" : "bg-red-500"
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                enabled ? "translate-x-5" : "translate-x-1"
                              }`}
                            />
                          </button>
                        );
                      })()}
                    </div>
                  ))}

                  <div className="pt-2">
                    <Button type="button" onClick={() => CustomToast.success("Notification settings saved")} className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 px-6 rounded-lg">
                      Save Notification Settings
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">Loading preferences...</div>
              )}

              {/* Windows Notifications Section */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Windows Notifications</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Configure native Windows notifications that work even when the browser is minimized.
                </p>
                <NotificationSettings />
              </div>
            </div>
          )}

          {activeTab === "appearance" && (
            <div className="bg-white rounded-xl shadow-md border p-10 w-full text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Appearance</h2>
              <p className="text-sm text-gray-600 mb-6">Customize how your app looks and feels.</p>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-sm">
                <AlertTriangle className="w-4 h-4" />
                This section is under maintenance
              </div>
            </div>
          )}

          {activeTab === "privacy" && (
            <div className="bg-white rounded-xl shadow-md border p-10 w-full text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Privacy</h2>
              <p className="text-sm text-gray-600 mb-6">Manage your privacy and data preferences.</p>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-sm">
                <AlertTriangle className="w-4 h-4" />
                This section is under maintenance
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Section_a;
