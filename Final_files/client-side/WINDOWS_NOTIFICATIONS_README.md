# Windows Notifications Integration

This document explains how to configure and use Windows notifications in your Project Management Tool.

## Overview

The Windows notifications system provides native desktop notifications that work even when the browser is minimized or in the background. This enhances user experience by ensuring important project updates, deadlines, and team activities are never missed.

## Features

- **Native Windows Notifications**: Uses the browser's Notification API for system-level notifications
- **Smart Categorization**: Different notification types (project, phase, subtask, team) with appropriate icons and actions
- **Click Navigation**: Click notifications to navigate directly to relevant project pages
- **Permission Management**: Automatic permission requests with user-friendly controls
- **Fallback Support**: Gracefully degrades to toast notifications if Windows notifications are disabled

## How It Works

### 1. Permission Request
- Users are prompted to enable notifications when they first visit the app
- Permission request appears after 3 seconds to avoid being too aggressive
- Users can enable/disable notifications at any time through settings

### 2. Notification Types
- **Project Notifications**: Project creation, completion, deadline reminders
- **Phase Notifications**: Phase additions, deadline reminders
- **Subtask Notifications**: Task assignments, deadline reminders
- **Team Notifications**: Team creation, member additions

### 3. Integration Points
- **Socket.IO**: Real-time notifications from backend
- **Cron Jobs**: Automated deadline reminders
- **User Actions**: Manual project/team updates

## Configuration

### Prerequisites
- Modern browser with Notification API support
- HTTPS connection (required for notifications in most browsers)
- User permission granted

### Browser Support
- ✅ Chrome/Edge (Chromium-based)
- ✅ Firefox
- ✅ Safari (limited support)
- ❌ Internet Explorer

### Environment Variables
No additional environment variables are required. The system uses the existing notification infrastructure.

## Usage

### Basic Implementation

```jsx
import useWindowsNotifications from '@/hooks/useWindowsNotifications';

function MyComponent() {
  const { isEnabled, showNotification, testNotification } = useWindowsNotifications();

  const handleShowNotification = () => {
    if (isEnabled) {
      showNotification('Hello!', {
        body: 'This is a custom notification',
        icon: '/custom-icon.png'
      });
    }
  };

  return (
    <div>
      <button onClick={handleShowNotification}>
        Show Notification
      </button>
      <button onClick={testNotification}>
        Test Notification
      </button>
    </div>
  );
}
```

### Advanced Usage

```jsx
import useWindowsNotifications from '@/hooks/useWindowsNotifications';

function ProjectComponent() {
  const { showProjectNotification } = useWindowsNotifications();

  const handleProjectUpdate = (projectData) => {
    // Show Windows notification for project updates
    showProjectNotification({
      title: 'Project Updated',
      message: `Project ${projectData.name} has been updated`,
      type: 'project_updated',
      projectId: projectData.id
    });
  };

  return (
    // Your component JSX
  );
}
```

## Components

### 1. NotificationSettings
A settings panel for users to manage notification preferences:
- Toggle Windows notifications on/off
- Test notification functionality
- View permission status
- Browser-specific instructions

### 2. NotificationPermissionRequest
A permission request dialog that appears when users first visit:
- Explains benefits of notifications
- Requests permission gracefully
- Provides clear enable/disable options

### 3. NotificationWrapper
A wrapper component that manages the overall notification state:
- Checks permission status on app load
- Shows permission request when appropriate
- Integrates with the main app structure

## API Reference

### WindowsNotificationService

#### Methods
- `showNotification(title, options)`: Show a basic notification
- `showProjectNotification(notification)`: Show project-related notification
- `showTeamNotification(notification)`: Show team-related notification
- `show(notification)`: Auto-detect and show appropriate notification type
- `requestPermission()`: Request notification permission
- `closeAll()`: Close all active notifications

#### Properties
- `isSupported`: Whether notifications are supported
- `permission`: Current permission status
- `isEnabled`: Whether notifications are enabled

### useWindowsNotifications Hook

#### Returns
- `isSupported`: Browser support status
- `permission`: Current permission level
- `isEnabled`: Whether notifications are active
- `requestPermission()`: Request permission function
- `showNotification()`: Show notification function
- `testNotification()`: Show test notification

## Customization

### Icons
Update notification icons by modifying the paths in `windowsNotificationService.js`:
```javascript
const defaultOptions = {
  icon: '/your-logo.png',
  badge: '/your-favicon.png',
  // ... other options
};
```

### Notification Types
Add new notification types by extending the service:
```javascript
showCustomNotification(notification) {
  return this.showNotification(notification.title, {
    body: notification.message,
    icon: '/custom-icon.png',
    tag: `pmt-custom-${notification.id}`,
    onClick: () => {
      // Custom click handler
    }
  });
}
```

### Styling
Customize the notification appearance by modifying the CSS classes in the components.

## Troubleshooting

### Common Issues

1. **Notifications not showing**
   - Check browser permission settings
   - Ensure HTTPS connection
   - Verify notification API support

2. **Permission denied**
   - Guide users to browser settings
   - Provide clear instructions for enabling

3. **Notifications not working in background**
   - This is expected behavior for some browsers
   - Notifications will show when the tab becomes active

### Debug Mode
Enable debug logging by checking the browser console:
```javascript
// Check notification status
console.log(notificationManager.getWindowsNotificationStatus());

// Test notification
notificationManager.showTestWindowsNotification();
```

## Best Practices

1. **Permission Timing**: Request permission after user engagement, not immediately
2. **Clear Messaging**: Explain why notifications are beneficial
3. **Graceful Degradation**: Always provide fallback notification methods
4. **User Control**: Allow users to easily enable/disable notifications
5. **Testing**: Test notifications across different browsers and devices

## Security Considerations

- Notifications only work over HTTPS
- User permission is required
- No sensitive data should be included in notification content
- Notifications are client-side only and don't transmit data

## Performance

- Notifications are lightweight and don't impact app performance
- Permission checks are cached after initial request
- Notification creation is asynchronous and non-blocking

## Future Enhancements

- Push notifications for mobile devices
- Notification scheduling and snoozing
- Custom notification sounds
- Notification history and management
- Integration with system calendar for deadline reminders
