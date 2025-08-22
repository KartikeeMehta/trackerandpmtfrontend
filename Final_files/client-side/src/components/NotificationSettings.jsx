import React, { useState, useEffect } from 'react';
import notificationManager from '@/utils/notificationManager';
import { Bell, BellOff, Settings, TestTube, Volume2, VolumeX } from 'lucide-react';

const NotificationSettings = () => {
  const [windowsNotificationsEnabled, setWindowsNotificationsEnabled] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    // Get initial status
    const status = notificationManager.getWindowsNotificationStatus();
    setNotificationStatus(status);
    setWindowsNotificationsEnabled(status.enabled);
  }, []);

  const handleToggleWindowsNotifications = async () => {
    setIsLoading(true);
    try {
      if (windowsNotificationsEnabled) {
        notificationManager.disableWindowsNotifications();
        setWindowsNotificationsEnabled(false);
      } else {
        const enabled = await notificationManager.enableWindowsNotifications();
        setWindowsNotificationsEnabled(enabled);
      }
      
      // Update status
      const status = notificationManager.getWindowsNotificationStatus();
      setNotificationStatus(status);
    } catch (error) {
      console.error('Error toggling Windows notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestNotification = () => {
    notificationManager.showTestWindowsNotification();
  };

  const getStatusText = () => {
    if (!notificationStatus.supported) {
      return 'Windows notifications not supported in this browser';
    }
    
    switch (notificationStatus.permission) {
      case 'granted':
        return 'Windows notifications are enabled';
      case 'denied':
        return 'Windows notifications are blocked. Please enable them in your browser settings.';
      case 'default':
        return 'Windows notifications are not yet configured';
      default:
        return 'Unknown status';
    }
  };

  const getStatusColor = () => {
    if (!notificationStatus.supported) return 'text-gray-500';
    if (notificationStatus.permission === 'granted') return 'text-green-600';
    if (notificationStatus.permission === 'denied') return 'text-red-600';
    return 'text-yellow-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-800">Notification Settings</h2>
      </div>

      {/* Windows Notifications Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {windowsNotificationsEnabled ? (
              <Bell className="w-5 h-5 text-green-600" />
            ) : (
              <BellOff className="w-5 h-5 text-gray-400" />
            )}
            <div>
              <h3 className="font-medium text-gray-700">Windows Notifications</h3>
              <p className="text-sm text-gray-500">Show native Windows notifications</p>
            </div>
          </div>
          
          <button
            onClick={handleToggleWindowsNotifications}
            disabled={isLoading || !notificationStatus.supported}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              windowsNotificationsEnabled ? 'bg-blue-600' : 'bg-gray-200'
            } ${!notificationStatus.supported ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                windowsNotificationsEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Status Information */}
        <div className={`text-sm ${getStatusColor()}`}>
          {getStatusText()}
        </div>

        {/* Sound Control */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {soundEnabled ? (
              <Volume2 className="w-5 h-5 text-green-600" />
            ) : (
              <VolumeX className="w-5 h-5 text-gray-400" />
            )}
            <div>
              <h3 className="font-medium text-gray-700">Notification Sound</h3>
              <p className="text-sm text-gray-500">Play sound with notifications</p>
            </div>
          </div>
          
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              soundEnabled ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                soundEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Test Button */}
        {windowsNotificationsEnabled && (
          <button
            onClick={handleTestNotification}
            className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
          >
            <TestTube className="w-4 h-4" />
            Test Notification
          </button>
        )}

        {/* Browser Instructions */}
        {notificationStatus.permission === 'denied' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <h4 className="font-medium text-yellow-800 mb-2">How to Enable Notifications</h4>
            <ol className="text-sm text-yellow-700 space-y-1">
              <li>1. Click the lock/info icon in your browser's address bar</li>
              <li>2. Find "Notifications" in the permissions list</li>
              <li>3. Change from "Block" to "Allow"</li>
              <li>4. Refresh this page</li>
            </ol>
          </div>
        )}
      </div>

      {/* Additional Settings */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="font-medium text-gray-700 mb-3">Other Settings</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Toast Notifications</span>
            <span className="text-sm text-green-600 font-medium">Always Enabled</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Sound Alerts</span>
            <span className="text-sm text-gray-500">Browser Default</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
