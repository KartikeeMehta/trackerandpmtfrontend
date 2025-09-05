import { io } from "socket.io-client";
import { image_url } from "@/api/Api";

class SocketManager {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect(token) {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    this.socket = io(image_url, { 
      auth: { token }, 
      transports: ["websocket", "polling"] 
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  on(event, callback) {
    if (!this.socket) return;
    
    // Remove any existing listeners for this event to prevent duplicates
    this.socket.off(event);
    
    // Store the new listener
    const key = `${event}_${callback.toString()}`;
    this.listeners.set(key, { event, callback });
    this.socket.on(event, callback);
    
    console.log(`SocketManager: Added listener for ${event}, total listeners: ${this.listeners.size}`);
  }

  off(event, callback) {
    if (!this.socket) return;
    
    const key = `${event}_${callback.toString()}`;
    this.listeners.delete(key);
    this.socket.off(event, callback);
    
    console.log(`SocketManager: Removed listener for ${event}, total listeners: ${this.listeners.size}`);
  }

  getSocket() {
    return this.socket;
  }
}

// Create a singleton instance
const socketManager = new SocketManager();
export default socketManager;
