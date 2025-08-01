import React, { useState, useEffect } from "react";
import {
  User,
  Bell,
  Shield,
  Palette,
  Database,
  Globe,
  Mail,
  Key,
  Eye,
  EyeOff,
  Save,
  X,
  Check,
  AlertTriangle,
  Info,
  Smartphone,
  Download,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { api_url } from "@/api/Api";
import { apiHandler } from "@/api/ApiHandler";

const Section_a = () => {
  const [activeTab, setActiveTab] = useState("security");
  const [userDetails, setUserDetails] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 2FA states
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorSetup, setTwoFactorSetup] = useState(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [showBackupCodesDialog, setShowBackupCodesDialog] = useState(false);
  const [backupCodes, setBackupCodes] = useState([]);
  const [trustedDevices, setTrustedDevices] = useState([]);
  const [showTrustedDevicesDialog, setShowTrustedDevicesDialog] =
    useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    taskReminders: true,
    projectUpdates: true,
    teamMessages: true,
    weeklyReports: false,
    dailyDigest: false,
  });

  const [appearanceSettings, setAppearanceSettings] = useState({
    theme: "light",
    sidebarCollapsed: false,
    compactMode: false,
    showAvatars: true,
    showStatusIndicators: true,
  });

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    sessionTimeout: 30,
    loginNotifications: true,
    passwordExpiry: 90,
  });

  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: "team",
    activityVisibility: "team",
    showOnlineStatus: true,
    allowDirectMessages: true,
  });

  useEffect(() => {
    fetchUserData();
    fetchTrustedDevices();
  }, []);

  const fetchUserData = async () => {
    const token = localStorage.getItem("token");
    try {
      const response = await apiHandler.GetApi(
        api_url.BASE_URL + "/profile",
        token
      );

      if (response?.success) {
        const data = response.user || response;
        console.log("Profile data received:", data);
        setUserDetails(data);

        // Check 2FA status for both user and employee types
        if (data.type === "user" && data.user) {
          console.log("User type detected, checking 2FA status...");
          // Check both root level and settings level for 2FA status
          const rootLevel2FA = data.user.twoFactorEnabled;
          const settingsLevel2FA = data.user.settings?.security?.twoFactorAuth;
          const final2FAStatus = rootLevel2FA || settingsLevel2FA;

          console.log("Root level 2FA:", rootLevel2FA);
          console.log("Settings level 2FA:", settingsLevel2FA);
          console.log("Final 2FA status:", final2FAStatus);

          setTwoFactorEnabled(!!final2FAStatus);
        } else if (data.type === "employee" && data.employee) {
          console.log("Employee type detected, checking 2FA status...");
          // Check both root level and settings level for 2FA status
          const rootLevel2FA = data.employee.twoFactorEnabled;
          const settingsLevel2FA =
            data.employee.settings?.security?.twoFactorAuth;
          const final2FAStatus = rootLevel2FA || settingsLevel2FA;

          console.log("Root level 2FA:", rootLevel2FA);
          console.log("Settings level 2FA:", settingsLevel2FA);
          console.log("Final 2FA status:", final2FAStatus);

          setTwoFactorEnabled(!!final2FAStatus);
        } else {
          console.log("No user/employee data found, setting 2FA to false");
          setTwoFactorEnabled(false);
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const fetchTrustedDevices = async () => {
    const token = localStorage.getItem("token");
    try {
      const response = await apiHandler.GetApi(
        api_url.getTrustedDevices,
        token
      );
      if (response?.devices) {
        setTrustedDevices(response.devices);
      }
    } catch (error) {
      console.error("Error fetching trusted devices:", error);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match" });
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("token");
    try {
      const response = await apiHandler.PutApi(
        api_url.changePassword ||
          "http://localhost:8000/api/profile/change-password",
        {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        },
        token
      );

      if (response?.message === "Password changed successfully") {
        setMessage({ type: "success", text: "Password changed successfully!" });
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        setMessage({
          type: "error",
          text: response?.message || "Failed to change password",
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "An error occurred while changing password",
      });
    } finally {
      setLoading(false);
    }
  };

  // 2FA Functions
  const handleGenerateTwoFactorSetup = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      const response = await apiHandler.PostApi(
        api_url.generateTwoFactorSetup,
        {},
        token
      );

      if (response?.qrCode) {
        setTwoFactorSetup(response);
        setBackupCodes(response.backupCodes);
        setShowSetupDialog(true);
      } else {
        setMessage({
          type: "error",
          text: "Failed to generate 2FA setup",
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "An error occurred while generating 2FA setup",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEnableTwoFactor = async () => {
    if (!verificationCode) {
      setMessage({ type: "error", text: "Please enter verification code" });
      return;
    }

    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      const response = await apiHandler.PostApi(
        api_url.enableTwoFactor,
        { token: verificationCode },
        token
      );

      if (
        response?.message === "Two-factor authentication enabled successfully"
      ) {
        setMessage({ type: "success", text: "2FA enabled successfully!" });
        setTwoFactorEnabled(true);
        setShowSetupDialog(false);
        setShowVerificationDialog(false);
        setVerificationCode("");
        fetchUserData();
      } else {
        setMessage({
          type: "error",
          text: response?.message || "Failed to enable 2FA",
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "An error occurred while enabling 2FA",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisableTwoFactor = async () => {
    if (!verificationCode) {
      setMessage({ type: "error", text: "Please enter verification code" });
      return;
    }

    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      const response = await apiHandler.PostApi(
        api_url.disableTwoFactor,
        { token: verificationCode },
        token
      );

      if (
        response?.message === "Two-factor authentication disabled successfully"
      ) {
        setMessage({ type: "success", text: "2FA disabled successfully!" });
        setTwoFactorEnabled(false);
        setShowVerificationDialog(false);
        setVerificationCode("");
        fetchUserData();
        fetchTrustedDevices();
      } else {
        setMessage({
          type: "error",
          text: response?.message || "Failed to disable 2FA",
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "An error occurred while disabling 2FA",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateBackupCodes = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      const response = await apiHandler.PostApi(
        api_url.regenerateBackupCodes,
        {},
        token
      );

      if (response?.backupCodes) {
        setBackupCodes(response.backupCodes);
        setMessage({
          type: "success",
          text: "Backup codes regenerated successfully!",
        });
      } else {
        setMessage({
          type: "error",
          text: "Failed to regenerate backup codes",
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "An error occurred while regenerating backup codes",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTrustedDevice = async (deviceId) => {
    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      const response = await apiHandler.DeleteApi(
        api_url.removeTrustedDevice + deviceId,
        token
      );

      if (response?.message === "Device removed successfully") {
        setMessage({ type: "success", text: "Device removed successfully!" });
        fetchTrustedDevices();
      } else {
        setMessage({
          type: "error",
          text: "Failed to remove device",
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "An error occurred while removing device",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationSettingsUpdate = async () => {
    setLoading(true);
    setMessage({ type: "", text: "" });

    const token = localStorage.getItem("token");
    try {
      const response = await apiHandler.PutApi(
        api_url.updateNotificationSettings ||
          "http://localhost:8000/api/settings/notifications",
        notificationSettings,
        token
      );

      if (response?.message === "Notification settings updated") {
        setMessage({
          type: "success",
          text: "Notification settings updated successfully!",
        });
      } else {
        setMessage({
          type: "error",
          text: response?.message || "Failed to update notification settings",
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "An error occurred while updating notification settings",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAppearanceSettingsUpdate = async () => {
    setLoading(true);
    setMessage({ type: "", text: "" });

    const token = localStorage.getItem("token");
    try {
      const response = await apiHandler.PutApi(
        api_url.updateAppearanceSettings ||
          "http://localhost:8000/api/settings/appearance",
        appearanceSettings,
        token
      );

      if (response?.message === "Appearance settings updated") {
        setMessage({
          type: "success",
          text: "Appearance settings updated successfully!",
        });
        // Apply theme changes immediately
        if (appearanceSettings.theme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      } else {
        setMessage({
          type: "error",
          text: response?.message || "Failed to update appearance settings",
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "An error occurred while updating appearance settings",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSecuritySettingsUpdate = async () => {
    setLoading(true);
    setMessage({ type: "", text: "" });

    const token = localStorage.getItem("token");
    try {
      const response = await apiHandler.PutApi(
        api_url.updateSecuritySettings ||
          "http://localhost:8000/api/settings/security",
        securitySettings,
        token
      );

      if (response?.message === "Security settings updated") {
        setMessage({
          type: "success",
          text: "Security settings updated successfully!",
        });
      } else {
        setMessage({
          type: "error",
          text: response?.message || "Failed to update security settings",
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "An error occurred while updating security settings",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrivacySettingsUpdate = async () => {
    setLoading(true);
    setMessage({ type: "", text: "" });

    const token = localStorage.getItem("token");
    try {
      const response = await apiHandler.PutApi(
        api_url.updatePrivacySettings ||
          "http://localhost:8000/api/settings/privacy",
        privacySettings,
        token
      );

      if (response?.message === "Privacy settings updated") {
        setMessage({
          type: "success",
          text: "Privacy settings updated successfully!",
        });
      } else {
        setMessage({
          type: "error",
          text: response?.message || "Failed to update privacy settings",
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "An error occurred while updating privacy settings",
      });
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "security", label: "Security", icon: Shield },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "privacy", label: "Privacy", icon: Eye },
  ];

  return (
    <div className="p-4 sm:p-6 md:p-10 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600 text-lg">
          Manage your account preferences and security
        </p>
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                      activeTab === tab.id
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            {/* Security Settings */}
            {activeTab === "security" && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Security Settings
                  </h2>

                  <div className="space-y-6">
                    {/* Password Change Section */}
                    <div className="border-b pb-8">
                      <h3 className="text-xl font-bold text-gray-900 mb-6">
                        Change Password
                      </h3>
                      <form
                        onSubmit={handlePasswordChange}
                        className="space-y-6"
                      >
                        <div>
                          <Label htmlFor="currentPassword">
                            Current Password
                          </Label>
                          <div className="relative">
                            <Input
                              id="currentPassword"
                              type={showPassword ? "text" : "password"}
                              value={passwordForm.currentPassword}
                              onChange={(e) =>
                                setPasswordForm((prev) => ({
                                  ...prev,
                                  currentPassword: e.target.value,
                                }))
                              }
                              placeholder="Enter current password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showPassword ? (
                                <EyeOff size={20} />
                              ) : (
                                <Eye size={20} />
                              )}
                            </button>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="newPassword">New Password</Label>
                          <div className="relative">
                            <Input
                              id="newPassword"
                              type={showNewPassword ? "text" : "password"}
                              value={passwordForm.newPassword}
                              onChange={(e) =>
                                setPasswordForm((prev) => ({
                                  ...prev,
                                  newPassword: e.target.value,
                                }))
                              }
                              placeholder="Enter new password"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setShowNewPassword(!showNewPassword)
                              }
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showNewPassword ? (
                                <EyeOff size={20} />
                              ) : (
                                <Eye size={20} />
                              )}
                            </button>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="confirmPassword">
                            Confirm New Password
                          </Label>
                          <div className="relative">
                            <Input
                              id="confirmPassword"
                              type={showConfirmPassword ? "text" : "password"}
                              value={passwordForm.confirmPassword}
                              onChange={(e) =>
                                setPasswordForm((prev) => ({
                                  ...prev,
                                  confirmPassword: e.target.value,
                                }))
                              }
                              placeholder="Confirm new password"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setShowConfirmPassword(!showConfirmPassword)
                              }
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showConfirmPassword ? (
                                <EyeOff size={20} />
                              ) : (
                                <Eye size={20} />
                              )}
                            </button>
                          </div>
                        </div>

                        <Button
                          type="submit"
                          disabled={loading}
                          className="w-full"
                        >
                          {loading ? "Changing..." : "Change Password"}
                        </Button>
                      </form>
                    </div>

                    {/* Two-Factor Authentication Section */}
                    <div className="border-b pb-8">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">
                            Two-Factor Authentication
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Add an extra layer of security to your account
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={twoFactorEnabled}
                            onChange={() => {
                              if (twoFactorEnabled) {
                                setShowVerificationDialog(true);
                              } else {
                                handleGenerateTwoFactorSetup();
                              }
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      {twoFactorEnabled && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-4">
                            <Button
                              onClick={() => setShowBackupCodesDialog(true)}
                              variant="outline"
                              size="sm"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              View Backup Codes
                            </Button>
                            <Button
                              onClick={handleRegenerateBackupCodes}
                              variant="outline"
                              size="sm"
                              disabled={loading}
                            >
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Regenerate Codes
                            </Button>
                            <Button
                              onClick={() => setShowTrustedDevicesDialog(true)}
                              variant="outline"
                              size="sm"
                            >
                              <Smartphone className="w-4 h-4 mr-2" />
                              Trusted Devices
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          Login Notifications
                        </h3>
                        <p className="text-sm text-gray-600">
                          Get notified when someone logs into your account
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={securitySettings.loginNotifications}
                          onChange={(e) =>
                            setSecuritySettings((prev) => ({
                              ...prev,
                              loginNotifications: e.target.checked,
                            }))
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-2">
                        Session Timeout
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Automatically log out after inactivity
                      </p>
                      <select
                        value={securitySettings.sessionTimeout}
                        onChange={(e) =>
                          setSecuritySettings((prev) => ({
                            ...prev,
                            sessionTimeout: parseInt(e.target.value),
                          }))
                        }
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value={15}>15 minutes</option>
                        <option value={30}>30 minutes</option>
                        <option value={60}>1 hour</option>
                        <option value={120}>2 hours</option>
                      </select>
                    </div>

                    <Button
                      onClick={handleSecuritySettingsUpdate}
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? "Updating..." : "Save Security Settings"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Notification Settings */}
            {activeTab === "notifications" && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Notification Settings
                  </h2>

                  <div className="space-y-4">
                    {Object.entries(notificationSettings).map(
                      ([key, value]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <h3 className="font-semibold text-gray-900 capitalize">
                              {key
                                .replace(/([A-Z])/g, " $1")
                                .replace(/^./, (str) => str.toUpperCase())}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {key === "emailNotifications" &&
                                "Receive email notifications for important updates"}
                              {key === "taskReminders" &&
                                "Get reminded about upcoming task deadlines"}
                              {key === "projectUpdates" &&
                                "Receive notifications when projects are updated"}
                              {key === "teamMessages" &&
                                "Get notified about new team messages"}
                              {key === "weeklyReports" &&
                                "Receive weekly summary reports"}
                              {key === "dailyDigest" &&
                                "Get daily digest of activities"}
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={value}
                              onChange={(e) =>
                                setNotificationSettings((prev) => ({
                                  ...prev,
                                  [key]: e.target.checked,
                                }))
                              }
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      )
                    )}

                    <Button
                      onClick={handleNotificationSettingsUpdate}
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? "Updating..." : "Save Notification Settings"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Appearance Settings */}
            {activeTab === "appearance" && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Appearance Settings
                  </h2>

                  <div className="space-y-6">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-2">
                        Theme
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Choose your preferred theme
                      </p>
                      <select
                        value={appearanceSettings.theme}
                        onChange={(e) =>
                          setAppearanceSettings((prev) => ({
                            ...prev,
                            theme: e.target.value,
                          }))
                        }
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="auto">Auto (System)</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          Compact Mode
                        </h3>
                        <p className="text-sm text-gray-600">
                          Reduce spacing for more content
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={appearanceSettings.compactMode}
                          onChange={(e) =>
                            setAppearanceSettings((prev) => ({
                              ...prev,
                              compactMode: e.target.checked,
                            }))
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          Show Avatars
                        </h3>
                        <p className="text-sm text-gray-600">
                          Display user avatars throughout the app
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={appearanceSettings.showAvatars}
                          onChange={(e) =>
                            setAppearanceSettings((prev) => ({
                              ...prev,
                              showAvatars: e.target.checked,
                            }))
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          Show Status Indicators
                        </h3>
                        <p className="text-sm text-gray-600">
                          Display online/offline status for team members
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={appearanceSettings.showStatusIndicators}
                          onChange={(e) =>
                            setAppearanceSettings((prev) => ({
                              ...prev,
                              showStatusIndicators: e.target.checked,
                            }))
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <Button
                      onClick={handleAppearanceSettingsUpdate}
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? "Updating..." : "Save Appearance Settings"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Privacy Settings */}
            {activeTab === "privacy" && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Privacy Settings
                  </h2>

                  <div className="space-y-6">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-2">
                        Profile Visibility
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Control who can see your profile information
                      </p>
                      <select
                        value={privacySettings.profileVisibility}
                        onChange={(e) =>
                          setPrivacySettings((prev) => ({
                            ...prev,
                            profileVisibility: e.target.value,
                          }))
                        }
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="public">Public</option>
                        <option value="team">Team Only</option>
                        <option value="private">Private</option>
                      </select>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-2">
                        Activity Visibility
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Control who can see your activity
                      </p>
                      <select
                        value={privacySettings.activityVisibility}
                        onChange={(e) =>
                          setPrivacySettings((prev) => ({
                            ...prev,
                            activityVisibility: e.target.value,
                          }))
                        }
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="public">Public</option>
                        <option value="team">Team Only</option>
                        <option value="private">Private</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          Show Online Status
                        </h3>
                        <p className="text-sm text-gray-600">
                          Let others see when you're online
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={privacySettings.showOnlineStatus}
                          onChange={(e) =>
                            setPrivacySettings((prev) => ({
                              ...prev,
                              showOnlineStatus: e.target.checked,
                            }))
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          Allow Direct Messages
                        </h3>
                        <p className="text-sm text-gray-600">
                          Allow team members to send you direct messages
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={privacySettings.allowDirectMessages}
                          onChange={(e) =>
                            setPrivacySettings((prev) => ({
                              ...prev,
                              allowDirectMessages: e.target.checked,
                            }))
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <Button
                      onClick={handlePrivacySettingsUpdate}
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? "Updating..." : "Save Privacy Settings"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2FA Setup Dialog */}
      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set Up Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Scan the QR code with your authenticator app to set up 2FA.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {twoFactorSetup && (
              <>
                <div className="flex justify-center">
                  <img
                    src={twoFactorSetup.qrCode}
                    alt="QR Code"
                    className="w-48 h-48"
                  />
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">
                    Manual entry code:
                  </p>
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                    {twoFactorSetup.secret}
                  </code>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">
                    Backup Codes
                  </h4>
                  <p className="text-sm text-blue-700 mb-3">
                    Save these codes in a secure location. You can use them to
                    access your account if you lose your authenticator device.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {backupCodes.map((code, index) => (
                      <code
                        key={index}
                        className="bg-white px-2 py-1 rounded text-xs font-mono border"
                      >
                        {code}
                      </code>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={() => setShowVerificationDialog(true)}
              disabled={loading}
            >
              {loading ? "Setting up..." : "Next: Verify Code"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2FA Verification Dialog */}
      <Dialog
        open={showVerificationDialog}
        onOpenChange={setShowVerificationDialog}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {twoFactorEnabled ? "Disable 2FA" : "Verify Setup"}
            </DialogTitle>
            <DialogDescription>
              Enter the 6-digit code from your authenticator app.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="verificationCode">Verification Code</Label>
              <Input
                id="verificationCode"
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter 6-digit code"
                maxLength={6}
                className="text-center text-lg tracking-widest"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={
                twoFactorEnabled
                  ? handleDisableTwoFactor
                  : handleEnableTwoFactor
              }
              disabled={loading || !verificationCode}
            >
              {loading
                ? "Verifying..."
                : twoFactorEnabled
                ? "Disable 2FA"
                : "Enable 2FA"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Backup Codes Dialog */}
      <Dialog
        open={showBackupCodesDialog}
        onOpenChange={setShowBackupCodesDialog}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Backup Codes</DialogTitle>
            <DialogDescription>
              Use these codes to access your account if you lose your
              authenticator device.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-yellow-800">
                Save these codes in a secure location. Each code can only be
                used once.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {backupCodes.map((code, index) => (
                <code
                  key={index}
                  className="bg-gray-100 px-2 py-1 rounded text-xs font-mono border"
                >
                  {code}
                </code>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleRegenerateBackupCodes}
              variant="outline"
              disabled={loading}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {loading ? "Regenerating..." : "Regenerate Codes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trusted Devices Dialog */}
      <Dialog
        open={showTrustedDevicesDialog}
        onOpenChange={setShowTrustedDevicesDialog}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Trusted Devices</DialogTitle>
            <DialogDescription>
              Devices that can access your account without 2FA for 7 days.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {trustedDevices.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No trusted devices found.
              </p>
            ) : (
              <div className="space-y-3">
                {trustedDevices.map((device, index) => (
                  <div
                    key={device.deviceId}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {device.deviceName}
                      </h4>
                      <p className="text-sm text-gray-600">
                        Last used:{" "}
                        {new Date(device.lastUsed).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        Expires:{" "}
                        {new Date(device.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleRemoveTrustedDevice(device.deviceId)}
                      variant="outline"
                      size="sm"
                      disabled={loading}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Section_a;
