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
  const [lastMessageTime, setLastMessageTime] = useState(null);
  const [realTimeStatus, setRealTimeStatus] = useState("idle");
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

      // After loading messages, try to join company room if socket is connected
      if (socket && isConnected) {
        const user = getCurrentUser();
        const companyName =
          user?.companyName || user?.company_name || user?.company;
        if (companyName) {
          socket.emit("joinCompanyRoom", { companyName: companyName });
          console.log(
            "Retrying to join company room after message load:",
            companyName
          );
        }
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

    console.log("Initializing socket connection with user:", user);
    setCurrentUser(user);

    // Create socket connection with authentication
    const newSocket = io(image_url, {
      auth: {
        token: token,
      },
      transports: ["websocket", "polling"],
    });

    const joinCompanyRoom = () => {
      // Debug: Log user data to see available fields
      console.log("User data for room joining:", user);
      console.log("Available user fields:", Object.keys(user));

      // Try different possible field names for companyName
      const companyName = user.companyName || user.company_name || user.company;

      if (companyName) {
        newSocket.emit("joinCompanyRoom", { companyName: companyName });
        console.log("Joining company room:", companyName);

        // Set a timeout to check if room joining was successful
        setTimeout(() => {
          if (newSocket.connected) {
            console.log("✅ Socket connected, checking room status...");
            newSocket.emit("checkRoomStatus", {
              timestamp: new Date().toISOString(),
            });
          }
        }, 1000);

        return true;
      } else {
        console.warn("No companyName found in user data:", user);
        setError(
          "Unable to join company chat room - company information missing"
        );
        return false;
      }
    };

    newSocket.on("connect", () => {
      console.log("✅ Socket connected successfully");
      setIsConnected(true);
      setError(null);

      // Try to join company room
      joinCompanyRoom();

      // Test real-time functionality
      setTimeout(() => {
        console.log("🧪 Testing real-time message reception...");
        newSocket.emit("testMessage", {
          message: "Test message from client",
          timestamp: new Date().toISOString(),
        });
      }, 2000);
    });

    newSocket.on("disconnect", () => {
      console.log("❌ Socket disconnected");
      setIsConnected(false);
    });

    newSocket.on("receiveMessage", (messageData) => {
      console.log("📨 Received real-time message:", messageData);
      console.log("Sender name:", messageData.sender?.name);
      console.log("Sender email:", messageData.sender?.email);
      console.log("Message content:", messageData.message);
      console.log("Message ID:", messageData._id);
      console.log("Message timestamp:", messageData.createdAt);

      // Update real-time status
      setRealTimeStatus("active");
      setLastMessageTime(new Date());

      // Check if this message is already in our list to avoid duplicates
      const messageExists = messages.some(
        (msg) =>
          msg._id === messageData._id || // Check by ID first (most reliable)
          (msg.message === messageData.message &&
            msg.sender?.name === messageData.sender?.name &&
            Math.abs(
              new Date(msg.createdAt) -
                new Date(messageData.createdAt || messageData.timestamp)
            ) < 3000) // Within 3 seconds for better deduplication
      );

      if (!messageExists) {
        // Add new message to the list
        const newMessage = {
          _id: messageData._id || `temp_${Date.now()}_${Math.random()}`,
          sender: {
            _id: messageData.sender?._id,
            name: messageData.sender?.name,
            email: messageData.sender?.email,
          },
          message: messageData.message,
          createdAt:
            messageData.createdAt ||
            messageData.timestamp ||
            new Date().toISOString(),
        };

        console.log("✅ Adding new message to state:", newMessage);
        console.log("Current messages count:", messages.length);
        console.log("New messages count will be:", messages.length + 1);

        // Update messages state with the new message
        setMessages((prevMessages) => {
          const updatedMessages = [...prevMessages, newMessage];
          console.log(
            "✅ Messages state updated. New count:",
            updatedMessages.length
          );
          return updatedMessages;
        });

        // Reset real-time status after a delay
        setTimeout(() => {
          setRealTimeStatus("idle");
        }, 3000);
      } else {
        console.log("Message already exists, skipping duplicate");
      }
    });

    newSocket.on("roomJoined", (data) => {
      console.log("🏠 Successfully joined room:", data.message);
      setError(null);
    });

    newSocket.on("roomStatus", (data) => {
      console.log("🔍 Room status received:", data);
      console.log("Your rooms:", data.socketRooms);
      console.log("All system rooms:", data.allRooms);
    });

    newSocket.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error);
      setIsConnected(false);
      setError(
        "Failed to connect to chat server. Please check your connection."
      );
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      console.log("🧹 Cleaning up socket connection");
      newSocket.close();
    };
  }, []);

  // Load messages on component mount
  useEffect(() => {
    loadMessages();
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    console.log("🔄 Messages state changed. New count:", messages.length);
    console.log("Latest message:", messages[messages.length - 1]);
    console.log("All messages in state:", messages);

    // Scroll to bottom immediately when new messages arrive
    if (messages.length > 0) {
      setTimeout(() => {
        scrollToBottom();
      }, 100); // Small delay to ensure DOM is updated
    }
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
      // Send message via API
      const response = await sendMessageViaAPI(messageText);

      if (response && response._id) {
        console.log("✅ Message sent successfully via API:", response);

        // The message should be received via socket.io real-time
        // If for some reason it's not, we can add it manually as a fallback
        setTimeout(() => {
          // Check if the message was received via socket
          const messageReceived = messages.some(
            (msg) =>
              msg.message === messageText &&
              msg.sender?.name ===
                currentUser?.firstName + " " + currentUser?.lastName
          );

          if (!messageReceived) {
            console.log(
              "⚠️ Message not received via socket, adding manually as fallback"
            );
            const fallbackMessage = {
              _id: `fallback_${Date.now()}`,
              sender: {
                _id: currentUser?._id,
                name: currentUser?.firstName + " " + currentUser?.lastName,
                email: currentUser?.email,
              },
              message: messageText,
              createdAt: new Date().toISOString(),
            };

            setMessages((prev) => [...prev, fallbackMessage]);
          }
        }, 2000); // Wait 2 seconds before fallback
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      // Restore the message if sending failed
      setNewMessage(messageText);
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Format date
  const formatDate = (timestamp) => {
    console.log("Formatting date for timestamp:", timestamp);
    const date = new Date(timestamp);
    console.log("Parsed date:", date);
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
    console.log("Grouping messages:", messages);
    const groups = {};
    messages.forEach((message) => {
      const date = formatDate(message.createdAt);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    console.log("Grouped messages:", groups);
    return groups;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading messages...</p>
        </div>
      </div>
    );
  }

  // Calculate message groups inside render function
  const messageGroups = groupMessagesByDate(messages);
  console.log("🎯 Final messageGroups for rendering:", messageGroups);
  console.log("🎯 Object.keys(messageGroups):", Object.keys(messageGroups));
  console.log("🎯 First group entries:", Object.entries(messageGroups));

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
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
                {isConnected && currentUser?.companyName && (
                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                    Room: {currentUser.companyName}
                  </span>
                )}
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {messages.length} messages
                </span>
                {/* Real-time Status */}
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    realTimeStatus === "active"
                      ? "text-green-600 bg-green-50 animate-pulse"
                      : "text-gray-600 bg-gray-100"
                  }`}
                >
                  Real-time: {realTimeStatus === "active" ? "Active" : "Ready"}
                </span>
                {lastMessageTime && (
                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                    Last: {formatTime(lastMessageTime)}
                  </span>
                )}
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

            {/* Debug Info */}
            <div className="text-xs text-gray-500">
              {currentUser?.companyName && (
                <span>Company: {currentUser.companyName}</span>
              )}
            </div>

            {/* Test Button */}
            {isConnected && (
              <button
                onClick={() => {
                  if (socket) {
                    socket.emit("testMessage", {
                      message: "Manual test message",
                      timestamp: new Date().toISOString(),
                    });
                    console.log("Sent manual test message");
                  }
                }}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200 transition-colors"
              >
                Test RT
              </button>
            )}

            {/* Debug Room Status Button */}
            {isConnected && (
              <button
                onClick={() => {
                  if (socket) {
                    console.log("🔍 Checking socket room status...");
                    console.log("Socket ID:", socket.id);
                    console.log("Socket connected:", socket.connected);

                    // Emit a room status check
                    socket.emit("checkRoomStatus", {
                      timestamp: new Date().toISOString(),
                    });
                  }
                }}
                className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-md text-sm hover:bg-yellow-200 transition-colors"
              >
                Check Rooms
              </button>
            )}

            {/* Simulate Real Message Button */}
            {isConnected && (
              <button
                onClick={() => {
                  if (socket) {
                    console.log("🧪 Simulating real message flow...");

                    // Simulate the exact message format that the server sends
                    const simulatedMessage = {
                      _id: `sim_${Date.now()}`,
                      sender: {
                        _id: "simulated_user_id",
                        name: "Simulated User",
                        email: "sim@test.com",
                      },
                      message: "This is a simulated real message",
                      createdAt: new Date().toISOString(),
                    };

                    // Emit it as if it came from the server
                    socket.emit("receiveMessage", simulatedMessage);
                    console.log("Sent simulated message:", simulatedMessage);
                  }
                }}
                className="px-3 py-1 bg-green-100 text-green-700 rounded-md text-sm hover:bg-green-200 transition-colors"
              >
                Simulate Message
              </button>
            )}

            {/* Test Company Room Broadcasting */}
            {isConnected && (
              <button
                onClick={() => {
                  if (socket) {
                    console.log("🌐 Testing company room broadcasting...");

                    // Get the company name
                    const companyName =
                      currentUser?.companyName ||
                      currentUser?.company_name ||
                      currentUser?.company;

                    if (companyName) {
                      // Emit a test message to the company room
                      socket.emit("testCompanyRoom", {
                        companyName: companyName,
                        message: "Test message to company room",
                        timestamp: new Date().toISOString(),
                      });
                      console.log(
                        "Sent test message to company room:",
                        companyName
                      );
                    } else {
                      console.error(
                        "No company name found for broadcasting test"
                      );
                    }
                  }
                }}
                className="px-3 py-1 bg-purple-100 text-purple-700 rounded-md text-sm hover:bg-purple-200 transition-colors"
              >
                Test Broadcast
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mx-6 mt-4 flex-shrink-0">
          <div className="flex items-center justify-between">
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
            {error.includes("company information missing") && (
              <button
                onClick={() => {
                  const user = getCurrentUser();
                  const companyName =
                    user?.companyName || user?.company_name || user?.company;
                  if (companyName && socket) {
                    socket.emit("joinCompanyRoom", {
                      companyName: companyName,
                    });
                    console.log(
                      "Manual retry to join company room:",
                      companyName
                    );
                  }
                }}
                className="ml-4 px-3 py-1 bg-red-100 text-red-700 rounded-md text-sm hover:bg-red-200 transition-colors"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {/* Real-time Message Indicator */}
        {realTimeStatus === "active" && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-700 font-medium">
              New message received in real-time!
            </span>
            <span className="text-xs text-green-600">
              {lastMessageTime && formatTime(lastMessageTime)}
            </span>
          </div>
        )}

        {console.log(
          "Rendering messages. Count:",
          messages.length,
          "Messages:",
          messages
        )}
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
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
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
          <div>
            {console.log("🎨 Starting to render messages...")}
            {console.log("🎨 messageGroups:", messageGroups)}
            {Object.entries(messageGroups).map(([date, dateMessages]) => {
              console.log(
                `🎨 Rendering date group: ${date} with ${dateMessages.length} messages`
              );
              return (
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
                      console.log(`🎨 Rendering message ${index}:`, message);
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
                                    isOwnMessage
                                      ? "text-blue-600"
                                      : "text-gray-700"
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
              );
            })}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 px-6 py-4 flex-shrink-0">
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
