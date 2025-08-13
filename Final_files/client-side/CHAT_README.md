# Real-Time Messaging System Documentation

## Overview

This project implements a real-time messaging system using Socket.IO that allows company members to chat in real-time without refreshing the page. The system is designed for company-wide communication where all members of a company can see messages from each other.

## Architecture

### Frontend (React + Socket.IO Client)

- **Location**: `src/pages/Message/Messaging.jsx`
- **Socket Connection**: Connects to backend Socket.IO server
- **Real-time Updates**: Listens for `receiveMessage` events
- **Company Room**: Automatically joins company-specific chat room

### Backend (Node.js + Socket.IO + Express)

- **Location**: `server-side/index.js` and `server-side/controllers/chatController.js`
- **Socket.IO Server**: Handles real-time connections
- **Authentication**: JWT-based authentication for socket connections
- **Company Rooms**: Scopes messages by company name
- **Message Broadcasting**: Broadcasts messages to all company members

## How It Works

### 1. Connection Flow

```
User Login → JWT Token → Socket.IO Connection → Join Company Room → Ready for Chat
```

### 2. Message Flow

```
User Sends Message → API Call → Database Save → Socket.IO Broadcast → All Company Members Receive
```

### 3. Real-time Updates

- Messages appear instantly for all connected users
- No page refresh required
- Automatic message deduplication
- Real-time status indicators

## Key Features

### ✅ Real-time Messaging

- Instant message delivery
- Live typing indicators (can be added)
- Connection status monitoring

### ✅ Company Scoped

- Messages only visible to company members
- Automatic room management
- Secure company isolation

### ✅ Message Persistence

- Messages stored in MongoDB
- Daily message buckets for performance
- Message history retrieval

### ✅ User Management

- Supports both Owners and Employees
- Automatic user type detection
- Proper sender identification

## Setup Instructions

### 1. Backend Setup

```bash
cd server-side
npm install
npm start
```

### 2. Frontend Setup

```bash
cd client-side
npm install
npm run dev
```

### 3. Environment Variables

Ensure your `.env` file contains:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
PORT=8000
```

## Testing the System

### 1. Manual Testing

1. Open the messaging page in two different browser windows
2. Login with different company accounts
3. Send messages and verify real-time updates

### 2. Automated Testing

```bash
cd server-side
node chatTest.js
```

### 3. Browser Console Monitoring

Open browser console to see real-time logs:

- Socket connection status
- Message reception
- Room joining status

## Troubleshooting

### Common Issues

#### 1. Messages Not Appearing in Real-time

**Symptoms**: Messages only appear after page refresh
**Causes**:

- Socket connection failed
- Company room not joined
- Message broadcasting issue

**Solutions**:

```javascript
// Check socket connection status
console.log("Socket connected:", socket.connected);

// Verify company room joining
socket.emit("checkRoomStatus", { timestamp: Date.now() });

// Check server logs for broadcasting errors
```

#### 2. Socket Connection Failed

**Symptoms**: "Disconnected" status, no real-time updates
**Causes**:

- Invalid JWT token
- Server not running
- CORS issues

**Solutions**:

```javascript
// Verify token in localStorage
const token = localStorage.getItem("token");
console.log("Token exists:", !!token);

// Check server status
fetch("http://localhost:8000/api/test")
  .then((res) => res.json())
  .then((data) => console.log("Server status:", data));
```

#### 3. Company Room Issues

**Symptoms**: Users can't see each other's messages
**Causes**:

- Company name mismatch
- Room joining failed
- Multiple company rooms

**Solutions**:

```javascript
// Check company name consistency
console.log("User company:", user.companyName);

// Force room rejoin
socket.emit("joinCompanyRoom", { companyName: user.companyName });

// Verify room status
socket.emit("checkRoomStatus", { timestamp: Date.now() });
```

### Debug Commands

#### Frontend Debug

```javascript
// Check socket status
console.log("Socket ID:", socket.id);
console.log("Socket connected:", socket.connected);
console.log("User company:", currentUser.companyName);

// Test real-time messaging
socket.emit("testMessage", { message: "Test message" });

// Check room status
socket.emit("checkRoomStatus", { timestamp: Date.now() });
```

#### Backend Debug

```javascript
// Check connected users
console.log("Connected sockets:", io.sockets.sockets.size);

// List all rooms
console.log("All rooms:", Array.from(io.sockets.adapter.rooms.keys()));

// Check company room members
const companyRoom = `companyRoom:${companyName}`;
const roomMembers = io.sockets.adapter.rooms.get(companyRoom);
console.log(`Room ${companyRoom} members:`, roomMembers?.size || 0);
```

## Performance Optimization

### 1. Message Batching

- Messages are stored in daily buckets
- Reduces database queries
- Improves message loading performance

### 2. Connection Management

- Automatic reconnection handling
- Connection pooling
- Efficient room management

### 3. Memory Management

- Message deduplication
- Automatic cleanup of old messages
- Efficient state updates

## Security Features

### 1. Authentication

- JWT token validation
- Socket-level authentication
- User verification on connection

### 2. Company Isolation

- Messages scoped by company
- No cross-company message leakage
- Secure room management

### 3. Input Validation

- Message content validation
- XSS protection
- Rate limiting (can be added)

## Future Enhancements

### 1. Typing Indicators

```javascript
// Show when users are typing
socket.emit("typing", { companyName, userId });
socket.on("userTyping", (data) => {
  // Update UI to show typing indicator
});
```

### 2. Message Reactions

```javascript
// Add emoji reactions to messages
socket.emit("addReaction", { messageId, reaction, userId });
```

### 3. File Sharing

```javascript
// Support for file uploads in chat
socket.emit("sendFile", { file, messageId });
```

### 4. Read Receipts

```javascript
// Track message read status
socket.emit("markAsRead", { messageId, userId });
```

## Monitoring and Logging

### 1. Connection Monitoring

```javascript
// Track connection metrics
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);
  console.log(`Total connections: ${io.sockets.sockets.size}`);
});
```

### 2. Message Analytics

```javascript
// Track message statistics
socket.on("sendMessage", (data) => {
  console.log(`Message sent by: ${data.sender.name}`);
  console.log(`Company: ${data.companyName}`);
  console.log(`Time: ${new Date().toISOString()}`);
});
```

### 3. Error Tracking

```javascript
// Comprehensive error logging
socket.on("error", (error) => {
  console.error("Socket error:", error);
  // Log to external service (e.g., Sentry)
});
```

## Support

If you encounter issues:

1. **Check the browser console** for error messages
2. **Verify server logs** for backend issues
3. **Test with the provided test script** to isolate problems
4. **Check network tab** for failed requests
5. **Verify environment variables** are set correctly

## Conclusion

This real-time messaging system provides a robust foundation for company-wide communication. The combination of Socket.IO for real-time updates and MongoDB for persistence ensures reliable message delivery while maintaining performance and security.

For additional support or feature requests, please refer to the project documentation or create an issue in the project repository.
