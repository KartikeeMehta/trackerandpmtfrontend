import React, { useState, useEffect } from 'react';
import { Bell, X, CheckCircle, AlertCircle } from 'lucide-react';

const NotificationPermissionRequest = ({ onClose, onPermissionGranted }) => {
  const [permission, setPermission] = useState('default');
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    // Check current permission status
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const handleRequestPermission = async () => {
    if (!('Notification' in window)) {
      return;
    }

    setIsRequesting(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        onPermissionGranted?.(true);
        // Auto-close after a delay
        setTimeout(() => {
          onClose?.();
        }, 2000);
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleClose = () => {
    onClose?.();
  };

  // Don't show if permission is already granted or denied
  if (permission === 'granted' || permission === 'denied') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm z-50">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <Bell className="w-6 h-6 text-blue-600" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 mb-1">
            Enable Notifications
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            Get notified about project updates, deadlines, and team activities even when the app is in the background.
          </p>
          
          <div className="flex gap-2">
            <button
              onClick={handleRequestPermission}
              disabled={isRequesting}
              className="flex-1 bg-blue-600 text-white text-sm px-3 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isRequesting ? 'Requesting...' : 'Enable'}
            </button>
            
            <button
              onClick={handleClose}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
        
        <button
          onClick={handleClose}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      {/* Success message */}
      {permission === 'granted' && (
        <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
          <CheckCircle className="w-4 h-4" />
          Notifications enabled successfully!
        </div>
      )}
      
      {/* Error message */}
      {permission === 'denied' && (
        <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="w-4 h-4" />
          Notifications were blocked. You can enable them later in settings.
        </div>
      )}
    </div>
  );
};

export default NotificationPermissionRequest;
