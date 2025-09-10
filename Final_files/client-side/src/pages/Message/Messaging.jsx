import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { apiHandler } from "../../api/ApiHandler";
import { BASE_URL, image_url } from "../../api/Api";

const Messaging = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [menuFor, setMenuFor] = useState(null);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [error, setError] = useState(null);
  const [lastMessageTime, setLastMessageTime] = useState(null);
  const [realTimeStatus, setRealTimeStatus] = useState("idle");
  const [mentionOpen, setMentionOpen] = useState(false);
  const [directory, setDirectory] = useState([]);
  const [ownerName, setOwnerName] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Helpers to render mentions as full-name highlights
  const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const renderWithMentions = (text, mentions = []) => {
    const cleanText = String(text || "");
    const names = (Array.isArray(mentions) ? mentions : [])
      .map((m) => String(m || "").trim())
      .filter(Boolean);

    if (names.length === 0) {
      // Fallback: highlight only multi-word capitalized names after @ (e.g., @First Last[, Middle])
      const fullNamePattern = /(@[A-Z][\w.-]+(?:\s+[A-Z][\w.-]+)+)/g;
      const parts = cleanText.split(fullNamePattern);
      if (parts.length > 1) {
        return parts.map((part, i) => {
          if (!part) return null;
          if (fullNamePattern.test(part)) {
            fullNamePattern.lastIndex = 0;
            return (
              <span key={i} className={"px-1 rounded bg-blue-100 text-blue-700"}>{part}</span>
            );
          }
          return <span key={i}>{part}</span>;
        });
      }
      // Otherwise, highlight simple @token
      return cleanText.split(/(\@[\w.-]+)/g).map((chunk, i) => {
        if (/^\@[\w.-]+$/.test(chunk)) {
          return (
            <span key={i} className={"px-1 rounded bg-blue-100 text-blue-700"}>{chunk}</span>
          );
        }
        return <span key={i}>{chunk}</span>;
      });
    }

    // Build a robust pattern that tolerates variable whitespace between name parts
    const alternation = names
      .map((n) => n.split(/\s+/).map((p) => escapeRegExp(p)).join("\\s+"))
      .join("|");
    const pattern = new RegExp(`(@(?:${alternation}))`, "gi");
    const parts = cleanText.split(pattern);

    return parts.map((part, i) => {
      if (!part) return null;
      if (pattern.test(part)) {
        pattern.lastIndex = 0; // reset for subsequent tests
        return (
          <span key={i} className={"px-1 rounded bg-blue-100 text-blue-700"}>{part}</span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

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

      const mentions = Array.from(
        new Set((messageText.match(/@([\w.-]+)/g) || []).map((t) => t.slice(1)).slice(0, 10))
      );
      const response = await apiHandler.PostApi(
        `${BASE_URL}/chat/send`,
        { message: messageText, mentions },
        token
      );
      return response;
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  };

  const editMessageViaAPI = async (messageId, messageText) => {
    const token = getToken();
    return apiHandler.PostApi(`${BASE_URL}/chat/edit`, { messageId, message: messageText }, token);
  };

  const deleteMessageViaAPI = async (messageId) => {
    const token = getToken();
    return apiHandler.PostApi(`${BASE_URL}/chat/delete`, { messageId }, token);
  };

  // Initialize socket connection
  useEffect(() => {
    const token = getToken();
    const user = getCurrentUser();

    if (!token || !user) {
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

    const joinCompanyRoom = () => {
      // Try different possible field names for companyName
      const companyName = user.companyName || user.company_name || user.company;

      if (companyName) {
        newSocket.emit("joinCompanyRoom", { companyName: companyName });
        return true;
      } else {
        setError(
          "Unable to join company chat room - company information missing"
        );
        return false;
      }
    };

    newSocket.on("connect", () => {
      setIsConnected(true);
      setError(null);

      // Try to join company room
      joinCompanyRoom();
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
    });

    newSocket.on("receiveMessage", (messageData) => {
      // Update real-time status
      setRealTimeStatus("active");
      setLastMessageTime(new Date());

      // Check if this message is already in our list to avoid duplicates
      const messageExists = messages.some(
        (msg) =>
          (messageData?.type === "system_welcome" && msg?.type === "system_welcome") ||
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
          senderModel: messageData.senderModel || null,
          type: messageData?.type || null,
          createdAt:
            messageData.createdAt ||
            messageData.timestamp ||
            new Date().toISOString(),
        };

        // Update messages state with the new message
        setMessages((prevMessages) => {
          if (messageData?.type === "system_welcome") {
            // ensure only one welcome message exists
            const withoutWelcome = prevMessages.filter((m) => m?.type !== "system_welcome");
            return [...withoutWelcome, newMessage];
          }
          return [...prevMessages, newMessage];
        });

        // If this is a non-persistent welcome message, auto-remove after 15s
        if (messageData?.type === "system_welcome") {
          setTimeout(() => {
            setMessages((prev) => prev.filter((m) => m !== newMessage));
          }, 15000);
        }

        // Reset real-time status after a delay
        setTimeout(() => {
          setRealTimeStatus("idle");
        }, 3000);
      }
    });

    newSocket.on("messageEdited", (data) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === data._id ? { ...m, message: data.message, editedAt: data.editedAt } : m))
      );
    });

    newSocket.on("messageDeleted", (data) => {
      setMessages((prev) => prev.filter((m) => m._id !== data._id));
    });

    newSocket.on("roomJoined", (data) => {
      setError(null);
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

  // Load mention directory
  useEffect(() => {
    (async () => {
      try {
        const token = getToken();
        if (!token) return;
        const res = await apiHandler.GetApi(`${BASE_URL}/chat/directory`, token);
        const people = Array.isArray(res?.people) ? res.people : [];
        setDirectory(people);
        const owner = people.find((p) => String(p.teamMemberId || "").toUpperCase() === "OWNER");
        setOwnerName(owner ? String(owner.name || "") : "");
      } catch {}
    })();
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
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
      if (mentionOpen) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setMentionIndex((i) => i + 1);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setMentionIndex((i) => Math.max(0, i - 1));
          return;
        }
        if (e.key === "Enter") {
          // select current
          const match = getMentionMatches()[mentionIndex] || null;
          if (match) {
            e.preventDefault();
            insertMention(match.name);
          }
          return;
        }
        if (e.key === "Escape") {
          setMentionOpen(false);
          return;
        }
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (newMessage.trim() && isConnected) {
          handleSendMessage(e);
        }
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [newMessage, isConnected]);

  const getMentionMatches = () => {
    const at = newMessage.lastIndexOf("@");
    if (at === -1) return [];
    // Extract characters from @ until space
    const rest = newMessage.slice(at + 1);
    const stop = rest.search(/[\s]/);
    const token = stop === -1 ? rest : rest.slice(0, stop);
    const query = token.toLowerCase();
    const selfTmId = String(currentUser?.teamMemberId || "").toLowerCase();
    const selfName = (
      (currentUser?.name || `${currentUser?.firstName || ""} ${currentUser?.lastName || ""}`).trim()
    ).toLowerCase();
    const base = query.length === 0
      ? directory
      : directory.filter((p) => (p.name || "").toLowerCase().includes(query));
    // Exclude self by teamMemberId or by name; also exclude OWNER when current user is owner
    const filtered = base.filter((p) => {
      const tm = String(p.teamMemberId || "").toLowerCase();
      const nm = String(p.name || "").trim().toLowerCase();
      if (selfTmId && tm && tm === selfTmId) return false;
      if (selfName && nm === selfName) return false;
      if ((currentUser?.role || "").toLowerCase() === "owner" && tm === "owner") return false;
      return true;
    });
    return filtered.slice(0, 10);
  };

  const insertMention = (name) => {
    const at = newMessage.lastIndexOf("@");
    if (at === -1) return;
    const rest = newMessage.slice(at + 1);
    const stop = rest.search(/[\s]/);
    const after = stop === -1 ? "" : rest.slice(stop);
    const prefix = newMessage.slice(0, at);
    const next = `${prefix}@${name}${after ? after : " "}`;
    setNewMessage(next);
    setMentionOpen(false);
    setMentionIndex(0);
  };

  // Handle sending message (or saving edit)
  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (editingId) {
      const text = newMessage.trim();
      if (!text) {
        setEditingId(null);
        setEditText("");
        return;
      }
      try {
        await editMessageViaAPI(editingId, text);
        setEditingId(null);
        setEditText("");
        setNewMessage("");
      } catch (error) {}
      return;
    }

    if (!newMessage.trim() || !isConnected) return;

    const messageText = newMessage.trim();
    setNewMessage("");

    try {
      await sendMessageViaAPI(messageText);
    } catch (error) {
      console.error("Failed to send message:", error);
      setNewMessage(messageText);
    }
  };

  const startEdit = (msg) => {
    setEditingId(msg._id);
    setEditText(msg.message);
    setNewMessage(msg.message);
    inputRef.current?.focus();
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
    setNewMessage("");
  };

  const handleDelete = async (msg) => {
    try {
      await deleteMessageViaAPI(msg._id);
    } catch (error) {}
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

  return (
    <div className="flex flex-col bg-gray-50">
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
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Team Chat</h1>
              <div className="mt-1" />
            </div>
          </div>

          <div className="flex items-center space-x-3 ml-auto">
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
      <div className="flex-1 overflow-y-auto px-6 py-6 max-h-[68vh]">
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
            {Object.entries(messageGroups).map(([date, dateMessages]) => {
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
                      const roleLc = String(currentUser?.role || "").toLowerCase();
                      const canDeleteAny = roleLc === "owner" || roleLc === "admin";
                      const targetIsOwner =
                        (message?.senderModel || "").toLowerCase() === "owner" ||
                        String(message?.sender?.role || "").toLowerCase() === "owner" ||
                        (ownerName && String(message?.sender?.name || "").trim().toLowerCase() === String(ownerName).trim().toLowerCase());
                      const canSeeMenu = isOwnMessage || roleLc === "owner" || (roleLc === "admin" && !targetIsOwner);

                      return (
                        <div
                          key={message._id || index}
                          className={`flex ${
                            isOwnMessage ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`relative group max-w-xs lg:max-w-md ${
                              isOwnMessage ? "order-2" : "order-1"
                            }`}
                          >
                            {/* Sender Info */}
                            <div
                              className={`flex items-center space-x-2 mb-2 justify-start`}
                            >
                              <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                                <span className="text-white text-sm font-medium">
                                  {message.sender?.name
                                    ?.charAt(0)
                                    ?.toUpperCase() || "U"}
                                </span>
                              </div>

                              <div className="flex-1 flex items-center justify-between text-sm">
                                <span className="font-bold text-gray-900">
                                  {message.sender?.name || "Unknown User"}
                                </span>
                                <span className="text-gray-400 ml-2 whitespace-nowrap">
                                  {formatTime(message.createdAt)}
                                </span>
                              </div>
                              
                            </div>

                            {/* Message Container */}
                            <div
                              className={"relative px-4 py-3 rounded-lg shadow-sm bg-white text-gray-900 border border-gray-200 min-w-[230px]"}
                            >
                              {canSeeMenu && (
                                <button
                                  type="button"
                                  onClick={() => setMenuFor(menuFor === (message._id || i) ? null : (message._id || i))}
                                  className={`absolute right-1 top-1 translate-y-0 flex items-center justify-center h-6 w-6 rounded hover:bg-black/10 text-current`}
                                  title="More"
                                >
                                  <span className="text-lg leading-none">⋮</span>
                                </button>
                              )}
                              {canSeeMenu && menuFor === (message._id || i) && (
                                <div className={`absolute z-10 right-1 top-7 w-44 rounded-md border bg-white shadow-lg text-sm`}
                                  onMouseLeave={() => setMenuFor(null)}
                                >
                                  {isOwnMessage && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setMenuFor(null);
                                        startEdit(message);
                                      }}
                                      className="w-full px-3 py-2 hover:bg-blue-50 text-right"
                                    >
                                      <span className="font-medium text-gray-800">Edit</span>
                                    </button>
                                  )}
                                  {(() => {
                                    const roleLc = String(currentUser?.role || "").toLowerCase();
                                    const targetIsOwner =
                                      (message?.senderModel || "").toLowerCase() === "owner" ||
                                      String(message?.sender?.role || "").toLowerCase() === "owner" ||
                                      (ownerName && String(message?.sender?.name || "").trim().toLowerCase() === String(ownerName).trim().toLowerCase());
                                    const canDelete = isOwnMessage || roleLc === "owner" || (roleLc === "admin" && !targetIsOwner);
                                    return (
                                      canDelete && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setMenuFor(null);
                                            handleDelete(message);
                                          }}
                                          className="w-full px-3 py-2 hover:bg-red-50 text-red-600 text-right"
                                        >
                                          <span className="font-medium">Delete</span>
                                        </button>
                                      )
                                    );
                                  })()}
                                </div>
                              )}
                              <div className="flex items-start gap-2">
                                <div className="flex-1">
                              <p className="text-sm leading-relaxed text-gray-900">
                                    {renderWithMentions(message.message, message.mentions)}
                                  </p>
                                  {message.editedAt && (
                                    <div className={"mt-1 text-[10px] text-gray-400"}>
                                      edited
                                    </div>
                                  )}
                                </div>
                                {/* inline Edit/Delete removed; now accessible via the three-dots menu */}
                              </div>
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
      <div className="bg-white border-t border-gray-200 px-6 py-4 flex-shrink-0 relative">
        <form onSubmit={handleSendMessage} className="flex items-end space-x-4">
          <div className="flex-1">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => {
                const val = e.target.value;
                setNewMessage(val);
                const at = val.lastIndexOf("@");
                if (at >= 0) {
                  setMentionOpen(true);
                } else {
                  setMentionOpen(false);
                }
              }}
              placeholder={
                isConnected ? "Type your message... (Enter to send)" : "Connecting..."
              }
              disabled={!isConnected}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {mentionOpen && getMentionMatches().length > 0 && (
            <div className="absolute w-72 max-h-64 overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg z-10"
              style={{
                bottom: 80,
                left: (() => {
                  try {
                    const at = newMessage.lastIndexOf("@");
                    if (at === -1) return 24;
                    const temp = document.createElement("span");
                    temp.style.visibility = "hidden";
                    temp.style.position = "absolute";
                    temp.style.whiteSpace = "pre";
                    temp.style.font = window.getComputedStyle(inputRef.current).font;
                    temp.textContent = newMessage.slice(0, at + 1);
                    document.body.appendChild(temp);
                    const width = temp.getBoundingClientRect().width;
                    document.body.removeChild(temp);
                    const inputRect = inputRef.current.getBoundingClientRect();
                    return Math.min(inputRect.width - 320, 24 + width);
                  } catch {
                    return 24;
                  }
                })()
              }}
            >
              {getMentionMatches().map((p, idx) => (
                <button
                  key={p.teamMemberId || p.name || idx}
                  type="button"
                  onClick={() => insertMention(p.name)}
                  className={`w-full text-left px-3 py-2 text-sm ${idx === mentionIndex ? "bg-blue-50" : "bg-white"}`}
                >
                  {p.name}
                  <span className="text-gray-400 text-xs ml-2">{p.teamMemberId}</span>
                </button>
              ))}
            </div>
          )}

          {editingId ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelEdit}
                className="px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newMessage.trim() || !isConnected}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Save
              </button>
            </div>
          ) : (
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
          )}
        </form>
      </div>
    </div>
  );
};

export default Messaging;
