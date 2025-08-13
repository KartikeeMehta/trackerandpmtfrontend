import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { apiHandler } from "../../api/ApiHandler";
import { BASE_URL, image_url } from "../../api/Api";

const Messaging = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Get user token from localStorage
  const getToken = () => {
    return localStorage.getItem("token");
  };

  // Get current user info
  const getCurrentUser = () => {
    try {
      const userStr = localStorage.getItem("user");
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error("Error parsing user data:", error);
      return null;
    }
  };

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Load chat messages from API
  const loadMessages = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await apiHandler.GetApi(`${BASE_URL}/chat`, token);
      console.log("Loaded messages from API:", response);
      console.log("Current user from localStorage:", getCurrentUser());
      if (response && Array.isArray(response)) {
        setMessages(response);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Send message via API
  const sendMessageViaAPI = async (messageText) => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await apiHandler.PostApi(
        `${BASE_URL}/chat/send`,
        { message: messageText },
        token
      );
      return response;
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  };

  // Initialize socket connection
  useEffect(() => {
    const token = getToken();
    const user = getCurrentUser();

    if (!token || !user) {
      console.log("No token or user found");
      return;
    }

    setCurrentUser(user);

    // Create socket connection with authentication
    const newSocket = io(image_url, {
      auth: {
        token: token,
      },
      transports: ["websocket", "polling"],
    });

    newSocket.on("connect", () => {
      console.log("Connected to chat server");
      setIsConnected(true);
      setError(null);
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from chat server");
      setIsConnected(false);
    });

    newSocket.on("receiveMessage", (messageData) => {
      console.log("Received message:", messageData);
      console.log("Sender name:", messageData.sender?.name);
      console.log("Sender email:", messageData.sender?.email);

      // Add new message to the list
      setMessages((prev) => [
        ...prev,
        {
          _id: Date.now().toString(),
          sender: {
            _id: messageData.sender?._id,
            name: messageData.sender?.name,
            email: messageData.sender?.email,
          },
          message: messageData.message,
          createdAt:
            messageData.timestamp ||
            messageData.createdAt ||
            new Date().toISOString(),
        },
      ]);
    });

    newSocket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      setIsConnected(false);
      setError(
        "Failed to connect to chat server. Please check your connection."
      );
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.close();
    };
  }, []);

  // Load messages on component mount
  useEffect(() => {
    loadMessages();
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (newMessage.trim() && isConnected) {
          handleSendMessage(e);
        }
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [newMessage, isConnected]);

  // Handle sending message
  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim() || !isConnected) return;

    const messageText = newMessage.trim();
    setNewMessage("");

    try {
      await sendMessageViaAPI(messageText);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Format date
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString();
    }
  };

  // Group messages by date
  const groupMessagesByDate = (messages) => {
    const groups = {};
    messages.forEach((message) => {
      const date = formatDate(message.createdAt);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    return groups;
  };

  const messageGroups = groupMessagesByDate(messages);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Team Chat</h1>
              <div className="flex items-center space-x-2 mt-1">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? "bg-green-500" : "bg-red-500"
                  }`}
                ></span>
                <span className="text-sm text-gray-500">
                  {isConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg">
              <div
                className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-green-500" : "bg-red-500"
                }`}
              ></div>
              <span className="text-sm font-medium text-gray-700">
                {isConnected ? "Online" : "Offline"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mx-6 mt-4">
          <div className="flex items-center">
            <svg
              className="h-5 w-5 text-red-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <svg
                className="w-10 h-10 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No messages yet
            </h3>
            <p className="text-gray-500">
              Start a conversation with your team!
            </p>
          </div>
        ) : (
          Object.entries(messageGroups).map(([date, dateMessages]) => (
            <div key={date} className="mb-8">
              {/* Date Separator */}
              <div className="flex items-center justify-center mb-6">
                <div className="bg-white px-4 py-2 rounded-full border border-gray-200 shadow-sm">
                  <span className="text-sm font-medium text-gray-600">
                    {date}
                  </span>
                </div>
              </div>

              {/* Messages for this date */}
              <div className="space-y-4">
                {dateMessages.map((message, index) => {
                  const isOwnMessage =
                    currentUser &&
                    message.sender &&
                    (message.sender._id === currentUser._id ||
                      message.sender.email === currentUser.email ||
                      (currentUser.firstName &&
                        currentUser.lastName &&
                        message.sender.name ===
                          `${currentUser.firstName} ${currentUser.lastName}`) ||
                      (currentUser.name &&
                        message.sender.name === currentUser.name));

                  return (
                    <div
                      key={message._id || index}
                      className={`flex ${
                        isOwnMessage ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md ${
                          isOwnMessage ? "order-2" : "order-1"
                        }`}
                      >
                        {/* Sender Info */}
                        <div
                          className={`flex items-center space-x-2 mb-2 ${
                            isOwnMessage ? "justify-end" : "justify-start"
                          }`}
                        >
                          {!isOwnMessage && (
                            <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                              <span className="text-white text-sm font-medium">
                                {message.sender?.name
                                  ?.charAt(0)
                                  ?.toUpperCase() || "U"}
                              </span>
                            </div>
                          )}

                          <div
                            className={`text-sm ${
                              isOwnMessage ? "text-right" : "text-left"
                            }`}
                          >
                            <span
                              className={`font-medium ${
                                isOwnMessage ? "text-blue-600" : "text-gray-700"
                              }`}
                            >
                              {message.sender?.name || "Unknown User"}
                            </span>
                            <span className="text-gray-400 ml-2">
                              {formatTime(message.createdAt)}
                            </span>
                          </div>

                          {isOwnMessage && (
                            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                              <span className="text-white text-sm font-medium">
                                {message.sender?.name
                                  ?.charAt(0)
                                  ?.toUpperCase() || "U"}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Message Bubble */}
                        <div
                          className={`px-4 py-3 rounded-lg shadow-sm ${
                            isOwnMessage
                              ? "bg-blue-600 text-white"
                              : "bg-white text-gray-900 border border-gray-200"
                          }`}
                        >
                          <p className="text-sm leading-relaxed">
                            {message.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <form onSubmit={handleSendMessage} className="flex items-end space-x-4">
          <div className="flex-1">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={
                isConnected
                  ? "Type your message... (Ctrl+Enter to send)"
                  : "Connecting..."
              }
              disabled={!isConnected}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-2">
              Press Ctrl+Enter to send quickly
            </p>
          </div>

          <button
            type="submit"
            disabled={!newMessage.trim() || !isConnected}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <div className="flex items-center space-x-2">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
              <span>Send</span>
            </div>
          </button>
        </form>
      </div>
    </div>
  );
};

export default Messaging;
