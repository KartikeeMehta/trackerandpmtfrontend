import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  ListChecks,
  BookCopy,
  History,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
} from "lucide-react";
import notificationManager from "@/utils/notificationManager";
import { api_url, image_url } from "@/api/Api";
import { apiHandler } from "@/api/ApiHandler";

const Sidebar = ({ isCollapsed, onToggle }) => {
  const location = useLocation();
  const [badges, setBadges] = useState({ tasks: 0, projects: 0, team: 0, teamMembers: 0 });
  const [starred, setStarred] = useState([]); // [{id,name}]
  const navigate = useNavigate();
  const userType = localStorage.getItem("userType");

  // Get the actual role from user object
  const getUserRole = () => {
    const user = localStorage.getItem("user");
    if (user) {
      try {
        const userData = JSON.parse(user);
        return userData.role || "teamMember";
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
    return "teamMember";
  };

  const userRole = getUserRole();

  // Define which roles can access Team Members
  const canAccessTeamMembers = ["owner", "admin", "manager"].includes(
    userRole?.toLowerCase()
  );

  // Debug logging
  console.log("Sidebar Debug:", {
    userType,
    userRole,
    canAccessTeamMembers,
    user: localStorage.getItem("user"),
  });

  const navLinks = [
    {
      label: "PRODUCTIVITY",
      items: [
        {
          to: "/Dashboard",
          label: userType === "employee" ? "My Overview" : "Overview",
          icon: LayoutDashboard,
        },
        { to: "/MyTeam", label: "My Team", icon: Users, badgeKey: "team" },
        // Only show Team Members for owner, admin, and manager
        ...(canAccessTeamMembers
          ? [
              {
                to: "/TeamMember",
                label: "Team Members",
                icon: UserPlus,
                badgeKey: "teamMembers",
              },
            ]
          : []),
      ],
    },
    {
      label: "TASKS & PROJECTS",
      items: [
        { to: "/AllTask", label: "All Task", icon: ListChecks, badgeKey: "tasks" },
        { to: "/AllProject", label: "My Projects", icon: BookCopy, badgeKey: "projects" },
        {
          to: "/WorkHistory",
          label: "Work History",
          icon: History,
        },
      ],
    },
    {
      label: "COMMUNICATION",
      items: [{ to: "/messaging", label: "Messaging", icon: MessageCircle }],
    },
  ];

  // Load starred projects and listen for updates
  useEffect(() => {
    const loadStarred = async () => {
      // 1) Load any cached list (fast)
      try {
        const raw = localStorage.getItem("starredProjects");
        const ids = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
        const projectsRaw = localStorage.getItem("starredProjectsNames");
        const nameMap = projectsRaw ? JSON.parse(projectsRaw) : {};
        const cachedList = ids.map((id) => ({ id, name: nameMap[id] || id }));
        if (cachedList.length > 0) setStarred(cachedList);
      } catch {}

      // 2) Fetch fresh from backend for this user (authoritative)
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await apiHandler.GetApi(api_url.getAllProjects, token);
        const projects = Array.isArray(res.projects) ? res.projects : [];
        const starredProjects = projects
          .filter((p) => p.starred === true)
          .map((p) => ({ id: p.project_id, name: p.project_name }));
        setStarred(starredProjects);
        // Persist names map for quick subsequent loads
        const nameMap = {};
        starredProjects.forEach((p) => (nameMap[p.id] = p.name));
        localStorage.setItem(
          "starredProjectsNames",
          JSON.stringify(nameMap)
        );
        localStorage.setItem(
          "starredProjects",
          JSON.stringify(starredProjects.map((p) => p.id))
        );
      } catch {}
    };
    loadStarred();
    const handler = (e) => {
      const detail = e?.detail || {};
      const arr = Array.isArray(detail.starred) ? detail.starred : [];
      const list = (detail.projects || []).map((p) => ({ id: p.id, name: p.name || p.id }));
      // persist names for next loads
      try {
        const nameMap = {};
        list.forEach((p) => (nameMap[p.id] = p.name));
        localStorage.setItem("starredProjectsNames", JSON.stringify(nameMap));
      } catch {}
      setStarred(list.length ? list : arr.map((id) => ({ id, name: id })));
    };
    window.addEventListener("starred:updated", handler);
    return () => window.removeEventListener("starred:updated", handler);
  }, []);

  // Map notification type to sidebar badge key
  const categorizeNotification = (type) => {
    if (["subtask_assigned", "subtask_deadline"].includes(type)) return "tasks";
    if (["project_created", "project_completed", "project_deadline", "phase_added", "phase_deadline", "project_member_added"].includes(type)) return "projects";
    if (type === "team_created") return "team";
    if (type === "team_member_added") return canAccessTeamMembers ? "teamMembers" : "team";
    return null;
  };

  // Initial unread badge fetch
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    (async () => {
      try {
        const res = await apiHandler.GetApi(api_url.getMyNotifications, token);
        const unread = (res?.notifications || []).filter((n) => n && n.read === false);
        const next = { tasks: 0, projects: 0, team: 0, teamMembers: 0 };
        unread.forEach((n) => {
          const k = categorizeNotification(n.type);
          if (k) next[k] += 1;
        });
        setBadges(next);
      } catch (e) {}
    })();
  }, []);

  // Socket updates
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    if (!token || !userStr) return;
    
    notificationManager.initialize(token);
    
    const handleNewNotification = (n) => {
      console.log("Sidebar received notification:", n._id, n.title);
      const k = categorizeNotification(n?.type);
      if (!k) return;
      setBadges((prev) => ({ ...prev, [k]: (prev[k] || 0) + 1 }));
      // Note: Toast is handled in notificationManager to avoid duplicates
    };
    
    notificationManager.addListener("notification:new", handleNewNotification);
    
    return () => {
      notificationManager.removeListener("notification:new", handleNewNotification);
    };
  }, []);

  // Listen for category read events from pages (e.g., AllTask)
  useEffect(() => {
    const handler = (e) => {
      const cat = e?.detail?.category;
      if (!cat) return;
      setBadges((prev) => ({ ...prev, [cat]: 0 }));
    };
    window.addEventListener("notifications:categoryRead", handler);
    return () => window.removeEventListener("notifications:categoryRead", handler);
  }, []);

  // Listen for all read events (from "Mark all read" and "All clear")
  useEffect(() => {
    const handler = () => {
      setBadges({ tasks: 0, projects: 0, team: 0, teamMembers: 0 });
    };
    window.addEventListener("notifications:allRead", handler);
    return () => window.removeEventListener("notifications:allRead", handler);
  }, []);
  return (
    <aside
      className={`h-screen fixed left-0 top-0 flex flex-col z-20 transition-all duration-300 bg-slate-50 border-r border-slate-200 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="flex items-center justify-between px-3 py-3 mt-2">
        <div className="flex items-center gap-2">
          <svg
            width="30"
            height="30"
            viewBox="0 0 44 44"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="44" height="44" rx="8" fill="#2563EB" />
            <path
              d="M13 29L22 15L31 29"
              stroke="#fff"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {!isCollapsed && (
            <span className="text-slate-900 font-semibold text-[17px] tracking-wide">
              Project Flow
            </span>
          )}
        </div>
        <button
          onClick={onToggle}
          className="text-slate-600 w-6 h-6 hover:text-blue-600 transition-colors p-1.5 rounded-md hover:bg-slate-100"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
      <nav className={`${isCollapsed ? "px-2" : "px-3"} py-3`}>
        {navLinks.map((section, index) => (
          <div key={index} className="mb-4">
            {!isCollapsed && (
              <h4 className="text-[12px] font-semibold text-slate-400 uppercase tracking-wide px-2 mb-2">
                {section.label}
              </h4>
            )}
            <ul className="space-y-1.5 mb-4">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.to;
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className={`group relative flex items-center gap-3 ${
                        isCollapsed ? "px-2 justify-center" : "px-2"
                      } py-2 rounded-md transition ${
                        active
                          ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                      title={isCollapsed ? item.label : ""}
                      onClick={async () => {
                        if (item.badgeKey) {
                          setBadges((prev) => ({ ...prev, [item.badgeKey]: 0 }));
                          
                          // Mark all unread notifications of this category as read on the server
                          const token = localStorage.getItem("token");
                          if (token) {
                            try {
                              // Get all notifications and mark unread ones of this category as read
                              const res = await apiHandler.GetApi(api_url.getMyNotifications, token);
                              const notifications = res?.notifications || [];
                              
                              // Find unread notifications of this category
                              const unreadNotifications = notifications.filter(n => {
                                if (n.read) return false;
                                
                                const type = n?.type || "";
                                let notificationCategory = null;
                                
                                if (["subtask_assigned", "subtask_deadline"].includes(type)) {
                                  notificationCategory = "tasks";
                                } else if (["project_created", "project_completed", "project_deadline", "phase_added", "phase_deadline", "project_member_added"].includes(type)) {
                                  notificationCategory = "projects";
                                } else if (type === "team_created") {
                                  notificationCategory = "team";
                                } else if (type === "team_member_added") {
                                  notificationCategory = canAccessTeamMembers ? "teamMembers" : "team";
                                }
                                
                                return notificationCategory === item.badgeKey;
                              });
                              
                              // Mark each unread notification as read
                              for (const notification of unreadNotifications) {
                                if (notification._id) {
                                  await apiHandler.UpdateApi(api_url.markNotifRead + notification._id + "/read", {}, token);
                                }
                              }
                            } catch (error) {
                              console.error("Error marking notifications as read:", error);
                            }
                          }
                          
                          // Also clear the notification icon count for this category
                          window.dispatchEvent(new CustomEvent("notifications:sidebarClick", { detail: { category: item.badgeKey } }));
                        }
                      }}
                    >
                      <Icon size={isCollapsed ? 24 : 18} className={`${active ? "text-blue-700" : "text-slate-600 group-hover:text-slate-800"}`} />
                      {!isCollapsed && <span className="flex-1 text-[15px]">{item.label}</span>}
                      {!isCollapsed && item.badgeKey && badges[item.badgeKey] > 0 && (
                        <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-5 px-1.5 text-[10px] rounded-full bg-rose-600 text-white">
                          {badges[item.badgeKey]}
                        </span>
                      )}
                      {isCollapsed && item.badgeKey && badges[item.badgeKey] > 0 && (
                        <span className="absolute top-2 right-2 w-2 h-2 bg-rose-600 rounded-full"></span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
            {!isCollapsed && <div className="h-px bg-slate-200/70 mx-2" />}
          </div>
        ))}
        {/* Important Projects subsection */}
        {!isCollapsed && starred.length > 0 && (
          <div className="mt-6">
            <h4 className="text-[12px] font-semibold text-slate-400 uppercase tracking-wide px-2 mb-2">Important projects</h4>
            <ul className="space-y-1">
              {starred.map((p) => (
                <li key={p.id}>
                  <button
                    className={`w-full text-left relative flex items-center gap-3 px-2 py-2 rounded-md transition ${
                      location.pathname === "/ProjectDetails" ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200" : "text-slate-700 hover:bg-slate-100"
                    }`}
                    title={p.name}
                    onClick={() => {
                      // Navigate directly to project details
                      navigate("/ProjectDetails", { state: { project_id: p.id } });
                    }}
                  >
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xs font-bold">★</span>
                    <span className="flex-1 truncate text-[15px]">{p.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
