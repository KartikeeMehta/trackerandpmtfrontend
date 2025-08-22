import { useNavigate } from "react-router-dom";
import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { api_url, image_url } from "@/api/Api";
import { apiHandler } from "@/api/ApiHandler";
import notificationManager from "@/utils/notificationManager";
import CustomToast from "@/components/CustomToast";

import { User, Settings, LogOut, Building2, Users, UserPlus, ListChecks, BookCopy, CheckCircle2, CalendarClock, Bell as BellIcon } from "lucide-react";

const sampleLogo = <img src="/vite.svg" alt="Logo" className="h-8 w-8" />;

const TopBar = ({ isSidebarCollapsed = false }) => {
  const navigate = useNavigate();
  const [userDetails, setUserDetails] = useState({});
  const [socket, setSocket] = useState(null);
  const [unread, setUnread] = useState(0);
  const [notifsOpen, setNotifsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    fetchUserData();
  }, []);

  // Initialize sockets for notifications
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    if (!token || !userStr) return;
    
    const s = notificationManager.initialize(token);
    s.on("connect", async () => {
      await refreshUnread();
    });
    
    const handleNewNotification = (n) => {
      console.log("TopBar received notification:", n._id, n.title);
      setUnread((u) => u + 1);
      // Don't add to local notifications state to avoid duplicates
      // The notifications will be fetched fresh when dropdown is opened
    };
    
    notificationManager.addListener("notification:new", handleNewNotification);
    setSocket(s);
    
    return () => {
      notificationManager.removeListener("notification:new", handleNewNotification);
    };
  }, []);

  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Close notifications dropdown on outside click or Escape
  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (!notifsOpen) return;
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifsOpen(false);
      }
    };
    const handleEsc = (e) => {
      if (e.key === "Escape") setNotifsOpen(false);
    };
    document.addEventListener("mousedown", handleGlobalClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleGlobalClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [notifsOpen]);

  // Listen for sidebar clicks to clear notification counts
  useEffect(() => {
    const handleSidebarClick = async (e) => {
      const category = e?.detail?.category;
      if (!category) return;
      
      // Refresh notifications from server to get updated read status
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const res = await apiHandler.GetApi(api_url.getMyNotifications, token);
          const updatedNotifications = res?.notifications || [];
          // Only show unread notifications in the dropdown
          const unreadNotifications = updatedNotifications.filter(n => !n.read);
          // Remove duplicates based on _id to prevent showing the same notification twice
          const uniqueNotifications = unreadNotifications.filter((notification, index, self) => 
            index === self.findIndex(n => n._id === notification._id)
          );
          setNotifications(uniqueNotifications);
          
          // Update unread count
          const newUnreadCount = updatedNotifications.filter(n => !n.read).length;
          setUnread(newUnreadCount);
        } catch (error) {
          console.error("Error refreshing notifications:", error);
        }
      }
    };
    
    window.addEventListener("notifications:sidebarClick", handleSidebarClick);
    return () => window.removeEventListener("notifications:sidebarClick", handleSidebarClick);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setOpen(false);
    navigate("/Login");
  };

  const handleProfile = () => {
    setOpen(false);
    navigate("/profile");
  };

  const handleSettings = () => {
    setOpen(false);
    navigate("/settings");
  };

  const fetchUserData = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      console.log("TopBar: No token found");
      return;
    }

    try {
      const response = await apiHandler.GetApi(
        api_url.BASE_URL + "/profile",
        token
      );

      if (response?.success || response?.user || response?.employee) {
        setUserDetails(response.user || response.employee || response);
      } else {
        console.log("TopBar: Invalid response format:", response);
      }
    } catch (error) {
      console.error("TopBar: Error fetching user data:", error);
      // Don't logout automatically, just log the error
    }
  };

  const refreshUnread = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await apiHandler.GetApi(api_url.getUnreadCount, token);
      setUnread(res?.count || 0);
    } catch (e) {}
  };

  const cleanupReadNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      
      // Use the server endpoint to cleanup old read notifications
      const res = await apiHandler.PostApi(api_url.cleanupReadNotifications, {}, token);
      if (res?.deletedCount > 0) {
        console.log(`Cleaned up ${res.deletedCount} old read notifications`);
      }
    } catch (error) {
      console.error("Error cleaning up read notifications:", error);
    }
  };

  // Group notifications by time window: Today, This week, Earlier
  const groupedNotifications = useMemo(() => {
    const groups = { today: [], week: [], earlier: [] };
    const now = Date.now();
    notifications.forEach((n) => {
      const t = new Date(n.createdAt).getTime();
      const diffDays = Math.floor((now - t) / (24 * 60 * 60 * 1000));
      if (diffDays === 0) groups.today.push(n);
      else if (diffDays <= 7) groups.week.push(n);
      else groups.earlier.push(n);
    });
    return groups;
  }, [notifications]);

  const openNotifications = async () => {
    setNotifsOpen((prev) => !prev);
    if (!notifsOpen) {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await apiHandler.GetApi(api_url.getMyNotifications, token);
      // Only show unread notifications in the dropdown
      const unreadNotifications = (res?.notifications || []).filter(n => !n.read);
      // Remove duplicates based on _id to prevent showing the same notification twice
      const uniqueNotifications = unreadNotifications.filter((notification, index, self) => 
        index === self.findIndex(n => n._id === notification._id)
      );
      setNotifications(uniqueNotifications);
      // Also sync the bell badge with the actual unread count
      setUnread(uniqueNotifications.length);
    }
  };

  const markAllRead = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    await apiHandler.UpdateApi(api_url.markAllNotifRead, {}, token);
    setUnread(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    // Also clear all sidebar badges
    window.dispatchEvent(new CustomEvent("notifications:allRead"));
    
    // Clean up old read notifications after marking all as read
    await cleanupReadNotifications();
  };

  const handleNotificationClick = async (n) => {
    try {
      const token = localStorage.getItem("token");
      if (token && n._id && !n.read) {
        await apiHandler.UpdateApi(api_url.markNotifRead + n._id + "/read", {}, token);
        setNotifications((prev) => prev.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
        setUnread((u) => Math.max(0, u - 1));
        
        // Clean up old read notifications after marking as read
        await cleanupReadNotifications();
      }
    } catch (e) {}
    setNotifsOpen(false);
    
    // Determine route based on notification type and clear both notification icon and sidebar
    const type = n?.type || "";
    let targetRoute = "/DashBoard";
    let category = null;
    
    if (["subtask_assigned", "subtask_deadline"].includes(type)) {
      targetRoute = "/AllTask";
      category = "tasks";
    } else if (["project_created", "project_completed", "project_deadline", "phase_added", "phase_deadline", "project_member_added"].includes(type)) {
      targetRoute = "/AllProject";
      category = "projects";
    } else if (type === "team_created") {
      targetRoute = "/MyTeam";
      category = "team";
    } else if (type === "team_member_added") {
      // Route to Team Members for admins/managers; otherwise to My Team for regular members
      try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const role = (user.role || "teamMember").toLowerCase();
        const canAccessTeamMembers = ["owner", "admin", "manager"].includes(role);
        targetRoute = canAccessTeamMembers ? "/TeamMember" : "/MyTeam";
        category = canAccessTeamMembers ? "teamMembers" : "team";
      } catch (_) {
        targetRoute = "/MyTeam";
        category = "team";
      }
    } else if (n.link && typeof n.link === "string") {
      // Fallback to server-provided link
      if (n.link.startsWith("http")) {
        window.location.href = n.link;
        return;
      }
      targetRoute = n.link;
    }
    
    // Clear both notification icon and sidebar for this specific notification
    if (category) {
      window.dispatchEvent(new CustomEvent("notifications:categoryRead", { detail: { category } }));
    }
    
    navigate(targetRoute);
  };

  return (
    <header className={`h-[76px] bg-white shadow flex items-center justify-end gap-2 px-8 fixed top-0 z-10 transition-all duration-300 ${
      isSidebarCollapsed ? "left-16 right-0" : "left-64 right-0"
    }`}>
      {/* Notification Bell - moved before company pill */}
      <div className="relative" ref={notifRef}>
        <button onClick={openNotifications} className="relative p-2 rounded-full hover:bg-gray-100">
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full px-1.5 py-0.5">{unread}</span>
          )}
        </button>
        {/* Notification Dropdown */}
        {notifsOpen && (
          <div className="absolute right-0 mt-2 w-[380px] max-h-[520px] overflow-hidden bg-white border rounded-2xl shadow-2xl z-50">
            {/* Sticky header with actions */}
            <div className="sticky top-0 bg-white/90 backdrop-blur flex items-center justify-between px-4 py-3 border-b">
              <span className="font-semibold text-[13px] tracking-wide text-gray-800">Notifications</span>
              <div className="flex items-center gap-4">
                <button onClick={markAllRead} className="text-[12px] font-medium text-blue-600 hover:text-blue-700">Mark all read</button>
                <button
                  onClick={async () => {
                    const token = localStorage.getItem("token");
                    if (!token) return;
                    await apiHandler.DeleteApi(api_url.clearAllNotif, token);
                    setUnread(0);
                    setNotifications([]);
                    window.dispatchEvent(new CustomEvent("notifications:allRead"));
                  }}
                  className="text-[12px] font-medium text-red-600 hover:text-red-700"
                >
                  All clear
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[460px] overflow-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-sm text-gray-500 flex items-center justify-center">No unread notifications</div>
              ) : (
                <div className="pb-2">
                  {groupedNotifications.today.length > 0 && (
                    <div className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Today</div>
                  )}
                  <ul className="divide-y">
                  {groupedNotifications.today.map((n) => {
                    const type = n?.type || "";
                    const iconMap = {
                      subtask_assigned: { Icon: ListChecks, color: "bg-indigo-100 text-indigo-600" },
                      subtask_deadline: { Icon: CalendarClock, color: "bg-amber-100 text-amber-600" },
                      project_created: { Icon: BookCopy, color: "bg-blue-100 text-blue-600" },
                      project_member_added: { Icon: BookCopy, color: "bg-blue-100 text-blue-600" },
                      project_completed: { Icon: CheckCircle2, color: "bg-emerald-100 text-emerald-600" },
                      project_deadline: { Icon: CalendarClock, color: "bg-amber-100 text-amber-600" },
                      phase_added: { Icon: BookCopy, color: "bg-sky-100 text-sky-600" },
                      phase_deadline: { Icon: CalendarClock, color: "bg-amber-100 text-amber-600" },
                      team_created: { Icon: Users, color: "bg-purple-100 text-purple-600" },
                      team_member_added: { Icon: UserPlus, color: "bg-pink-100 text-pink-600" },
                    };
                    const Fallback = { Icon: BellIcon, color: "bg-gray-100 text-gray-600" };
                    const meta = iconMap[type] || Fallback;
                    const { Icon } = meta;
                    const time = new Date(n.createdAt);
                    const diff = Date.now() - time.getTime();
                    const minutes = Math.floor(diff / 60000);
                    const hours = Math.floor(minutes / 60);
                    const days = Math.floor(hours / 24);
                    const timeAgo = minutes < 1
                      ? "just now"
                      : minutes < 60
                      ? `${minutes}m`
                      : hours < 24
                      ? `${hours}h`
                      : `${days}d`;
                    return (
                      <li key={n._id || n.createdAt}>
                        <button
                          onClick={() => handleNotificationClick(n)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 transition"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full ${meta.color}`}>
                              <Icon size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-[13px] font-semibold text-gray-900 truncate">{n.title || n.type}</p>
                                <span className="text-[11px] text-gray-400">{timeAgo}</span>
                              </div>
                              <p className="text-[12px] text-gray-600 leading-snug line-clamp-2">{n.message}</p>
                            </div>
                            {!n.read && <span className="mt-1 inline-block w-2 h-2 bg-blue-600 rounded-full shrink-0"></span>}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                  </ul>

                  {groupedNotifications.week.length > 0 && (
                    <div className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">This week</div>
                  )}
                  <ul className="divide-y">
                  {groupedNotifications.week.map((n) => {
                    const type = n?.type || "";
                    const iconMap = {
                      subtask_assigned: { Icon: ListChecks, color: "bg-indigo-100 text-indigo-600" },
                      subtask_deadline: { Icon: CalendarClock, color: "bg-amber-100 text-amber-600" },
                      project_created: { Icon: BookCopy, color: "bg-blue-100 text-blue-600" },
                      project_member_added: { Icon: BookCopy, color: "bg-blue-100 text-blue-600" },
                      project_completed: { Icon: CheckCircle2, color: "bg-emerald-100 text-emerald-600" },
                      project_deadline: { Icon: CalendarClock, color: "bg-amber-100 text-amber-600" },
                      phase_added: { Icon: BookCopy, color: "bg-sky-100 text-sky-600" },
                      phase_deadline: { Icon: CalendarClock, color: "bg-amber-100 text-amber-600" },
                      team_created: { Icon: Users, color: "bg-purple-100 text-purple-600" },
                      team_member_added: { Icon: UserPlus, color: "bg-pink-100 text-pink-600" },
                    };
                    const Fallback = { Icon: BellIcon, color: "bg-gray-100 text-gray-600" };
                    const meta = iconMap[type] || Fallback;
                    const { Icon } = meta;
                    const time = new Date(n.createdAt);
                    const diff = Date.now() - time.getTime();
                    const minutes = Math.floor(diff / 60000);
                    const hours = Math.floor(minutes / 60);
                    const days = Math.floor(hours / 24);
                    const timeAgo = minutes < 1
                      ? "just now"
                      : minutes < 60
                      ? `${minutes}m`
                      : hours < 24
                      ? `${hours}h`
                      : `${days}d`;
                    return (
                      <li key={n._id || n.createdAt}>
                        <button
                          onClick={() => handleNotificationClick(n)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 transition"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full ${meta.color}`}>
                              <Icon size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-[13px] font-semibold text-gray-900 truncate">{n.title || n.type}</p>
                                <span className="text-[11px] text-gray-400">{timeAgo}</span>
                              </div>
                              <p className="text-[12px] text-gray-600 leading-snug line-clamp-2">{n.message}</p>
                            </div>
                            {!n.read && <span className="mt-1 inline-block w-2 h-2 bg-blue-600 rounded-full shrink-0"></span>}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                  </ul>

                  {groupedNotifications.earlier.length > 0 && (
                    <div className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Earlier</div>
                  )}
                  <ul className="divide-y">
                  {groupedNotifications.earlier.map((n) => {
                    const type = n?.type || "";
                    const iconMap = {
                      subtask_assigned: { Icon: ListChecks, color: "bg-indigo-100 text-indigo-600" },
                      subtask_deadline: { Icon: CalendarClock, color: "bg-amber-100 text-amber-600" },
                      project_created: { Icon: BookCopy, color: "bg-blue-100 text-blue-600" },
                      project_member_added: { Icon: BookCopy, color: "bg-blue-100 text-blue-600" },
                      project_completed: { Icon: CheckCircle2, color: "bg-emerald-100 text-emerald-600" },
                      project_deadline: { Icon: CalendarClock, color: "bg-amber-100 text-amber-600" },
                      phase_added: { Icon: BookCopy, color: "bg-sky-100 text-sky-600" },
                      phase_deadline: { Icon: CalendarClock, color: "bg-amber-100 text-amber-600" },
                      team_created: { Icon: Users, color: "bg-purple-100 text-purple-600" },
                      team_member_added: { Icon: UserPlus, color: "bg-pink-100 text-pink-600" },
                    };
                    const Fallback = { Icon: BellIcon, color: "bg-gray-100 text-gray-600" };
                    const meta = iconMap[type] || Fallback;
                    const { Icon } = meta;
                    const time = new Date(n.createdAt);
                    const diff = Date.now() - time.getTime();
                    const minutes = Math.floor(diff / 60000);
                    const hours = Math.floor(minutes / 60);
                    const days = Math.floor(hours / 24);
                    const timeAgo = minutes < 1
                      ? "just now"
                      : minutes < 60
                      ? `${minutes}m`
                      : hours < 24
                      ? `${hours}h`
                      : `${days}d`;
                    return (
                      <li key={n._id || n.createdAt}>
                        <button
                          onClick={() => handleNotificationClick(n)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 transition"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full ${meta.color}`}>
                              <Icon size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-[13px] font-semibold text-gray-900 truncate">{n.title || n.type}</p>
                                <span className="text-[11px] text-gray-400">{timeAgo}</span>
                              </div>
                              <p className="text-[12px] text-gray-600 leading-snug line-clamp-2">{n.message}</p>
                            </div>
                            {!n.read && <span className="mt-1 inline-block w-2 h-2 bg-blue-600 rounded-full shrink-0"></span>}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <div
        className="flex items-center gap-2 cursor-pointer bg-[#dbdfe9] px-4 py-2 rounded-full"
        onClick={() => navigate("/DashBoard")}
      >
        <Building2 className="text-blue-600" />
        <span className="font-semibold text-sm">
          {userDetails?.companyName}
        </span>
      </div>

      <div className="flex items-center gap-4 relative">
        <button
          ref={triggerRef}
          className="flex items-center gap-2 rounded-xl p-2 focus:outline-none transition"
          onClick={() => setOpen((prev) => !prev)}
        >
          <img
            src={
              userDetails?.companyLogo
                ? image_url + userDetails?.companyLogo
                : "/vite.svg"
            }
            alt="Company Logo"
            className="h-8 w-8 rounded-full border object-cover"
          />
          <span className="font-semibold text-sm">
            {userDetails?.firstName && userDetails?.lastName
              ? `${userDetails.firstName} ${userDetails.lastName}`
              : userDetails?.name}
          </span>
          <ChevronDown
            className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""
              }`}
          />
        </button>

        <div
          ref={dropdownRef}
          className={`absolute right-0 mt-2 w-64 bg-white p-3 rounded-lg shadow-lg border z-50 overflow-hidden transition-all duration-200 ${open
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-95 pointer-events-none"
            }`}
          style={{ top: "48px" }}
        >
          <div className="mb-3">
            <h1 className="text-black text-base font-semibold">
              {userDetails?.companyName}
            </h1>
            <p className="text-sm text-gray-500">{userDetails?.email}</p>
          </div>

          <div
            onClick={handleProfile}
            className="group flex items-center gap-2 px-0 py-2 hover:bg-blue-50 cursor-pointer text-gray-800 text-sm font-medium rounded-md transition"
          >
            <User className="w-4 h-4 text-gray-500 group-hover:text-blue-500 transition-colors duration-200" />
            <span className="group-hover:text-blue-500">Profile</span>
          </div>

          <div
            onClick={handleSettings}
            className="group flex items-center gap-2 px-0 py-2 hover:bg-blue-50 cursor-pointer text-gray-800 text-sm font-medium rounded-md transition"
          >
            <Settings className="w-4 h-4 text-gray-500 group-hover:text-blue-500 transition-colors duration-200" />
            <span className="group-hover:text-blue-500">Settings</span>
          </div>

          <div
            onClick={handleLogout}
            className="flex items-center gap-2 px-0 py-2 hover:bg-red-50 cursor-pointer text-red-600 text-sm font-medium rounded-md transition border-t mt-2"
          >
            <LogOut className="w-4 h-4 text-red-500" />
            Logout
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
