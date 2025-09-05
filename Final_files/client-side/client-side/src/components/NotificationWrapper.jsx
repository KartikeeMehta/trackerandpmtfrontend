import React, { useState, useEffect } from 'react';
import NotificationPermissionRequest from './NotificationPermissionRequest';

const NotificationWrapper = ({ children }) => {
  const [showPermissionRequest, setShowPermissionRequest] = useState(false);
  const [hasCheckedPermission, setHasCheckedPermission] = useState(false);

  useEffect(() => {
    // Check if we should show the permission request
    const checkPermission = () => {
      if ('Notification' in window) {
        const permission = Notification.permission;
        
        // Only show if permission hasn't been decided yet
        if (permission === 'default') {
          // Wait a bit before showing the request to avoid being too aggressive
          setTimeout(() => {
            setShowPermissionRequest(true);
          }, 3000); // Show after 3 seconds
        }
      }
      setHasCheckedPermission(true);
    };

    // Check permission after a short delay
    const timer = setTimeout(checkPermission, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  const handlePermissionGranted = (granted) => {
    if (granted) {
      setShowPermissionRequest(false);
    }
  };

  const handleClose = () => {
    setShowPermissionRequest(false);
  };

  // Don't render anything until we've checked permissions
  if (!hasCheckedPermission) {
    return children;
  }

  return (
    <>
      {children}
      
      {/* Show permission request if needed */}
      {showPermissionRequest && (
        <NotificationPermissionRequest
          onClose={handleClose}
          onPermissionGranted={handlePermissionGranted}
        />
      )}
    </>
  );
};

export default NotificationWrapper;
