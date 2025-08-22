import { io } from "socket.io-client";
import { image_url } from "@/api/Api";
import CustomToast from "@/components/CustomToast";

class NotificationManager {
  constructor() {
    this.socket = null;
    this.isInitialized = false;
    this.listeners = new Map();
    this.notificationCount = 0;
  }

  initialize(token) {
    if (this.isInitialized && this.socket) {
      return this.socket;
    }

    console.log("NotificationManager: Initializing...");
    
    this.socket = io(image_url, { 
      auth: { token }, 
      transports: ["websocket", "polling"] 
    });

    this.socket.on("connect", () => {
      console.log("NotificationManager: Connected to server");
    });

    this.socket.on("notification:new", (notification) => {
      console.log("NotificationManager: Received notification:", notification._id, notification.title);
      
      // Only show toast once per notification
      this.notificationCount++;
      console.log(`NotificationManager: Total notifications received: ${this.notificationCount}`);
      
      const toastMsg = notification.title || notification.message;
      CustomToast.info(toastMsg || "New notification");
      
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
    console.log(`NotificationManager: Added listener for ${event}, total: ${this.listeners.get(event).length}`);
  }

  removeListener(event, callback) {
    if (!this.listeners.has(event)) return;
    
    const listeners = this.listeners.get(event);
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
      console.log(`NotificationManager: Removed listener for ${event}, total: ${listeners.length}`);
    }
  }

  notifyListeners(event, data) {
    if (!this.listeners.has(event)) return;
    
    const listeners = this.listeners.get(event);
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error("NotificationManager: Error in listener callback:", error);
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
    console.log("NotificationManager: Disconnected");
  }

  getSocket() {
    return this.socket;
  }
}

// Create a singleton instance
const notificationManager = new NotificationManager();
export default notificationManager;
