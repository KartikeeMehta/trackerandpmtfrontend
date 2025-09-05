import { useState, useEffect, useCallback } from 'react';
import windowsNotificationService from '@/utils/windowsNotificationService';

export const useWindowsNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    // Check initial status
    setIsSupported(windowsNotificationService.isSupported);
    setPermission(windowsNotificationService.getPermissionStatus());
    setIsEnabled(windowsNotificationService.isEnabled());
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return false;
    
    const granted = await windowsNotificationService.requestPermission();
    setPermission(windowsNotificationService.getPermissionStatus());
    setIsEnabled(granted);
    return granted;
  }, [isSupported]);

  const showNotification = useCallback((title, options = {}) => {
    if (!isEnabled) return null;
    return windowsNotificationService.showNotification(title, options);
  }, [isEnabled]);

  const showProjectNotification = useCallback((notification) => {
    if (!isEnabled) return null;
    return windowsNotificationService.showProjectNotification(notification);
  }, [isEnabled]);

  const showTeamNotification = useCallback((notification) => {
    if (!isEnabled) return null;
    return windowsNotificationService.showTeamNotification(notification);
  }, [isEnabled]);

  const showGeneralNotification = useCallback((notification) => {
    if (!isEnabled) return null;
    return windowsNotificationService.showGeneralNotification(notification);
  }, [isEnabled]);

  const show = useCallback((notification) => {
    if (!isEnabled) return null;
    return windowsNotificationService.show(notification);
  }, [isEnabled]);

  const closeAll = useCallback(() => {
    windowsNotificationService.closeAll();
  }, []);

  const testNotification = useCallback(() => {
    if (!isEnabled) return null;
    return windowsNotificationService.showNotification('Test Notification', {
      body: 'This is a test Windows notification',
      icon: '/logo_favicon.png',
      badge: '/logo_favicon.png'
    });
  }, [isEnabled]);

  return {
    // Status
    isSupported,
    permission,
    isEnabled,
    
    // Actions
    requestPermission,
    showNotification,
    showProjectNotification,
    showTeamNotification,
    showGeneralNotification,
    show,
    closeAll,
    testNotification,
    
    // Utility
    getStatus: () => ({
      supported: isSupported,
      permission,
      enabled: isEnabled
    })
  };
};

export default useWindowsNotifications;
