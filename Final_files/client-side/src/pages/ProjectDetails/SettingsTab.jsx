import { useState } from "react";
import {
  Settings,
  Users,
  Bell,
  Shield,
  Trash2,
  Edit,
  Save,
} from "lucide-react";

const SettingsTab = ({ project }) => {
  const [activeSection, setActiveSection] = useState("general");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [projectSettings, setProjectSettings] = useState({
    name: project?.project_name || "",
    description: project?.project_description || "",
    status: project?.project_status || "ongoing",
    visibility: "team",
    notifications: {
      taskUpdates: true,
      phaseChanges: true,
      comments: true,
      fileUploads: false,
    },
  });

  const sections = [
    { id: "general", name: "General", icon: Settings },
    { id: "team", name: "Team & Permissions", icon: Users },
    { id: "notifications", name: "Notifications", icon: Bell },
    { id: "security", name: "Security", icon: Shield },
    { id: "danger", name: "Danger Zone", icon: Trash2 },
  ];

  const handleSettingChange = (key, value) => {
    setProjectSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleNotificationChange = (key, value) => {
    setProjectSettings((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value,
      },
    }));
  };

  const handleSaveSettings = () => {
    // TODO: Implement API call to save settings
    console.log("Saving settings:", projectSettings);
  };

  const renderGeneralSection = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Project Name
        </label>
        <input
          type="text"
          value={projectSettings.name}
          onChange={(e) => handleSettingChange("name", e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          value={projectSettings.description}
          onChange={(e) => handleSettingChange("description", e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={4}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Project Status
        </label>
        <select
          value={projectSettings.status}
          onChange={(e) => handleSettingChange("status", e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
          <option value="on hold">On Hold</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Project Visibility
        </label>
        <select
          value={projectSettings.visibility}
          onChange={(e) => handleSettingChange("visibility", e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="team">Team Only</option>
          <option value="public">Public</option>
          <option value="private">Private</option>
        </select>
      </div>
    </div>
  );

  const renderTeamSection = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">
          Team Management
        </h4>
        <p className="text-sm text-blue-700">
          Manage team members and their permissions for this project.
        </p>
        <button className="mt-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
          Manage Team
        </button>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-yellow-900 mb-2">
          Permissions
        </h4>
        <p className="text-sm text-yellow-700">
          Configure who can view, edit, and manage this project.
        </p>
        <button className="mt-3 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
          Configure Permissions
        </button>
      </div>
    </div>
  );

  const renderNotificationsSection = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-900">
          Email Notifications
        </h4>

        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={projectSettings.notifications.taskUpdates}
              onChange={(e) =>
                handleNotificationChange("taskUpdates", e.target.checked)
              }
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              Task updates and changes
            </span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={projectSettings.notifications.phaseChanges}
              onChange={(e) =>
                handleNotificationChange("phaseChanges", e.target.checked)
              }
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Phase status changes</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={projectSettings.notifications.comments}
              onChange={(e) =>
                handleNotificationChange("comments", e.target.checked)
              }
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              New comments and mentions
            </span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={projectSettings.notifications.fileUploads}
              onChange={(e) =>
                handleNotificationChange("fileUploads", e.target.checked)
              }
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              File uploads and changes
            </span>
          </label>
        </div>
      </div>
    </div>
  );

  const renderSecuritySection = () => (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-green-900 mb-2">
          Project Security
        </h4>
        <p className="text-sm text-green-700">
          This project is currently set to team-only visibility. Only assigned
          team members can access it.
        </p>
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-900">Access Control</h4>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900">
                Two-Factor Authentication
              </p>
              <p className="text-xs text-gray-500">
                Required for all team members
              </p>
            </div>
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              Enabled
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900">
                Session Timeout
              </p>
              <p className="text-xs text-gray-500">Auto-logout after 8 hours</p>
            </div>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              8 hours
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDangerSection = () => (
    <div className="space-y-6">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-red-900 mb-2">Danger Zone</h4>
        <p className="text-sm text-red-700 mb-4">
          These actions are irreversible. Please proceed with caution.
        </p>

        <div className="space-y-3">
          <button className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
            <Trash2 size={16} />
            Delete Project
          </button>

          <button className="w-full bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
            Archive Project
          </button>
        </div>
      </div>
    </div>
  );

  const renderSectionContent = () => {
    switch (activeSection) {
      case "general":
        return renderGeneralSection();
      case "team":
        return renderTeamSection();
      case "notifications":
        return renderNotificationsSection();
      case "security":
        return renderSecuritySection();
      case "danger":
        return renderDangerSection();
      default:
        return renderGeneralSection();
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="flex">
          {/* Sidebar */}
          <div className="w-64 border-r border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Project Settings
            </h3>
            <nav className="space-y-1">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      activeSection === section.id
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <Icon size={16} />
                    {section.name}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {sections.find((s) => s.id === activeSection)?.name}
                </h2>
                <p className="text-sm text-gray-500">
                  Manage your project settings and preferences
                </p>
              </div>
              {activeSection === "general" && (
                <button
                  onClick={handleSaveSettings}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Save size={16} />
                  Save Changes
                </button>
              )}
            </div>

            {renderSectionContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;
