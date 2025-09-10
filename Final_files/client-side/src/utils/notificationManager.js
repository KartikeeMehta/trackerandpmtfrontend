import { io } from "socket.io-client";
import { image_url } from "@/api/Api";
import CustomToast from "@/components/CustomToast";
import windowsNotificationService from "./windowsNotificationService.js";

class NotificationManager {
  constructor() {
    this.socket = null;
    this.isInitialized = false;
    this.listeners = new Map();
    this.notificationCount = 0;
    this.windowsNotificationsEnabled = false;
    this.initWindowsNotifications();
  }

  async initWindowsNotifications() {
    // Initialize Windows notifications
    this.windowsNotificationsEnabled =
      await windowsNotificationService.requestPermission();
  }

  initialize(token) {
    if (this.isInitialized && this.socket) {
      return this.socket;
    }

    this.socket = io(image_url, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    this.socket.on("connect", () => {
      // Connected to server
    });

    this.socket.on("notification:new", (notification) => {
      // Received notification
      this.notificationCount++;

      const toastMsg = notification.title || notification.message;

      // Show toast notification
      CustomToast.info(toastMsg || "New notification");

      // Show Windows notification
      try {
        // Always attempt to show for chat mentions; otherwise respect toggle
        if (notification?.type === "chat_mention") {
          windowsNotificationService.show({
            title: notification.title || "Mention",
            message: notification.message || "You were mentioned",
            type: notification.type,
          });
        } else if (this.windowsNotificationsEnabled) {
          windowsNotificationService.show(notification);
        }
      } catch (error) {
        // Ignore notification display errors
      }

      // Notify all registered listeners
      this.notifyListeners("notification:new", notification);
    });

    this.isInitialized = true;
    return this.socket;
  }

  addListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  removeListener(event, callback) {
    if (!this.listeners.has(event)) return;

    const listeners = this.listeners.get(event);
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  notifyListeners(event, data) {
    if (!this.listeners.has(event)) return;

    const listeners = this.listeners.get(event);
    listeners.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        // Error in listener callback
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isInitialized = false;
    this.listeners.clear();
  }

  getSocket() {
    return this.socket;
  }

  // Enable/disable Windows notifications
  async enableWindowsNotifications() {
    this.windowsNotificationsEnabled =
      await windowsNotificationService.requestPermission();
    return this.windowsNotificationsEnabled;
  }

  disableWindowsNotifications() {
    this.windowsNotificationsEnabled = false;
  }

  // Check Windows notification status
  getWindowsNotificationStatus() {
    return {
      enabled: this.windowsNotificationsEnabled,
      supported: windowsNotificationService.isSupported,
      permission: windowsNotificationService.getPermissionStatus(),
    };
  }

  // Show test Windows notification
  showTestWindowsNotification() {
    if (this.windowsNotificationsEnabled) {
      const testNotification = {
        title: "Test Notification",
        message: "This is a test Windows notification",
        type: "test",
      };
      return windowsNotificationService.show(testNotification);
    }
    return null;
  }
}

// Create a singleton instance
const notificationManager = new NotificationManager();
export default notificationManager;
