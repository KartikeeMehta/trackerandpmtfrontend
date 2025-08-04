import { useState, useEffect, useRef } from "react";
import { Send, Paperclip, Smile, Users } from "lucide-react";

const MessagesTab = ({ project }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // TODO: Fetch messages from backend when API is ready
    // For now, using mock data
    setMessages([
      {
        id: 1,
        user: "EMP001",
        userName: "John Doe",
        message: "Hey team! How's the project coming along?",
        timestamp: "2024-01-21T10:30:00Z",
        isCurrentUser: false,
      },
      {
        id: 2,
        user: "EMP003",
        userName: "Jane Smith",
        message:
          "Design phase is progressing well. Should have mockups ready by Friday.",
        timestamp: "2024-01-21T10:32:00Z",
        isCurrentUser: false,
      },
      {
        id: 3,
        user: "EMP002",
        userName: "Mike Johnson",
        message: "Great! I'll review them over the weekend.",
        timestamp: "2024-01-21T10:35:00Z",
        isCurrentUser: true,
      },
      {
        id: 4,
        user: "EMP001",
        userName: "John Doe",
        message: "Perfect! Let's schedule a review meeting for Monday.",
        timestamp: "2024-01-21T10:40:00Z",
        isCurrentUser: false,
      },
    ]);

    setOnlineUsers([
      { id: "EMP001", name: "John Doe", status: "online" },
      { id: "EMP003", name: "Jane Smith", status: "online" },
      { id: "EMP002", name: "Mike Johnson", status: "away" },
      { id: "EMP004", name: "Sarah Wilson", status: "offline" },
    ]);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmitMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messageData = {
      id: Date.now(),
      user: "EMP002", // TODO: Get current user
      userName: "Mike Johnson", // TODO: Get current user name
      message: newMessage,
      timestamp: new Date().toISOString(),
      isCurrentUser: true,
    };

    setMessages((prev) => [...prev, messageData]);
    setNewMessage("");
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "online":
        return "bg-green-500";
      case "away":
        return "bg-yellow-500";
      case "offline":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-[600px] flex">
        {/* Online Users Sidebar */}
        <div className="w-64 border-r border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users size={18} className="text-blue-600" />
            Team Members
          </h3>
          <div className="space-y-3">
            {onlineUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div
                    className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(
                      user.status
                    )}`}
                  ></div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {user.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Project Chat
            </h2>
            <p className="text-sm text-gray-500">
              All team members can participate
            </p>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.isCurrentUser ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs lg:max-w-md ${
                    message.isCurrentUser ? "order-2" : "order-1"
                  }`}
                >
                  <div
                    className={`rounded-lg px-4 py-2 ${
                      message.isCurrentUser
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium">
                        {message.userName}
                      </span>
                      <span
                        className={`text-xs ${
                          message.isCurrentUser
                            ? "text-blue-200"
                            : "text-gray-500"
                        }`}
                      >
                        {formatTimestamp(message.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm">{message.message}</p>
                  </div>
                </div>
                {!message.isCurrentUser && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm order-1 ml-2">
                    {message.userName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-gray-200">
            <form
              onSubmit={handleSubmitMessage}
              className="flex items-end gap-3"
            >
              <div className="flex-1">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={2}
                />
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="p-1 text-gray-500 hover:text-gray-700"
                    >
                      <Paperclip size={16} />
                    </button>
                    <button
                      type="button"
                      className="p-1 text-gray-500 hover:text-gray-700"
                    >
                      <Smile size={16} />
                    </button>
                  </div>
                </div>
              </div>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"
                disabled={!newMessage.trim()}
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagesTab;
