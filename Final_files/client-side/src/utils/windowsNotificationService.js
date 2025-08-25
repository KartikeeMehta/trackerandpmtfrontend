class WindowsNotificationService {
  constructor() {
    this.isSupported = this.checkSupport();
    this.permission = 'default';
    this.soundEnabled = true; // Enable sound by default
    this.init();
  }

  checkSupport() {
    return 'Notification' in window;
  }

  async init() {
    if (!this.isSupported) {
      console.warn('Windows notifications not supported in this browser');
      return;
    }

    // Request permission if not granted
    if (Notification.permission === 'default') {
      this.permission = await Notification.requestPermission();
    } else {
      this.permission = Notification.permission;
    }

    console.log('Windows notification permission:', this.permission);
  }

  async requestPermission() {
    if (!this.isSupported) return false;
    
    this.permission = await Notification.requestPermission();
    return this.permission === 'granted';
  }

  showNotification(title, options = {}) {
    if (!this.isSupported || this.permission !== 'granted') {
      console.warn('Cannot show Windows notification - not supported or permission denied');
      return null;
    }

    const defaultOptions = {
      icon: '/logo_favicon.png', // Your app logo
      badge: '/logo_favicon.png', // Small icon for notification
      tag: 'pmt-notification', // Group similar notifications
      requireInteraction: false, // Auto-close after a few seconds
      silent: false, // Play notification sound (enabled)
      ...options
    };

    // Force sound to be enabled unless explicitly disabled
    if (defaultOptions.silent === undefined) {
      defaultOptions.silent = false; // false = sound ON
    }

    try {
      const notification = new Notification(title, defaultOptions);
      
      // Handle notification events
      notification.onclick = () => {
        // Focus the window when notification is clicked
        window.focus();
        notification.close();
        
        // Trigger custom click handler if provided
        if (options.onClick) {
          options.onClick();
        }
      };

      notification.onclose = () => {
        if (options.onClose) {
          options.onClose();
        }
      };

      notification.onshow = () => {
        if (options.onShow) {
          options.onShow();
        }
      };

      return notification;
    } catch (error) {
      console.error('Error showing Windows notification:', error);
      return null;
    }
  }

  // Show project-related notifications
  showProjectNotification(notification) {
    const { title, message, type, projectId } = notification;
    
    let icon = '/logo_favicon.png';
    let badge = '/logo_favicon.png';
    
    // Customize icon based on notification type
    switch (type) {
      case 'project_deadline':
      case 'phase_deadline':
      case 'subtask_deadline':
        icon = '/logo_favicon.png'; // Use favicon for deadline notifications
        break;
      case 'project_completed':
        icon = '/logo_favicon.png';
        break;
      default:
        icon = '/logo_favicon.png';
    }

    return this.showNotification(title, {
      body: message,
      icon,
      badge,
      tag: `pmt-${type}-${projectId || 'general'}`,
      requireInteraction: type.includes('deadline'), // Keep deadline notifications visible
      onClick: () => {
        // Always open dashboard from Windows notification clicks
        window.location.href = '/Dashboard';
      }
    });
  }

  // Show team-related notifications
  showTeamNotification(notification) {
    const { title, message, type } = notification;
    
    return this.showNotification(title, {
      body: message,
      icon: '/logo_favicon.png',
      badge: '/logo_favicon.png',
      tag: `pmt-${type}`,
      onClick: () => {
        // Always open dashboard from Windows notification clicks
        window.location.href = '/Dashboard';
      }
    });
  }

  // Show general notifications
  showGeneralNotification(notification) {
    const { title, message, type } = notification;
    
    return this.showNotification(title, {
      body: message,
      icon: '/logo_favicon.png',
      badge: '/logo_favicon.png',
      tag: `pmt-${type}`,
      onClick: () => {
        // Always open dashboard from Windows notification clicks
        window.location.href = '/Dashboard';
      }
    });
  }

  // Main method to show any notification
  show(notification) {
    const { type } = notification;
    
    if (type.includes('project') || type.includes('phase') || type.includes('subtask')) {
      return this.showProjectNotification(notification);
    } else if (type.includes('team')) {
      return this.showTeamNotification(notification);
    } else {
      return this.showGeneralNotification(notification);
    }
  }

  // Close all notifications
  closeAll() {
    if (this.isSupported) {
      // Close all notifications with our tag
      const notifications = document.querySelectorAll('[data-notification-tag]');
      notifications.forEach(notification => {
        if (notification.close) {
          notification.close();
        }
      });
    }
  }

  // Check if notifications are enabled
  isEnabled() {
    return this.isSupported && this.permission === 'granted';
  }

  // Get current permission status
  getPermissionStatus() {
    return this.permission;
  }

  // Enable/disable notification sound
  setSoundEnabled(enabled = true) {
    this.soundEnabled = enabled;
    console.log(`Notification sound ${enabled ? 'enabled' : 'disabled'}`);
  }

  // Get sound status
  isSoundEnabled() {
    return this.soundEnabled !== false; // Default to true
  }

  // Show notification with sound control
  showNotificationWithSound(title, options = {}) {
    const soundOptions = {
      ...options,
      silent: !this.isSoundEnabled() // Invert the logic: silent = false means sound ON
    };
    return this.showNotification(title, soundOptions);
  }
}

// Create singleton instance
const windowsNotificationService = new WindowsNotificationService();
export default windowsNotificationService;
