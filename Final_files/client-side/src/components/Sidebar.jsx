import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  ListChecks,
  BookCopy,
  History,
  Timer,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
} from "lucide-react";
// import notificationManager from "@/utils/notificationManager";
import { api_url, image_url } from "@/api/Api";
import { apiHandler } from "@/api/ApiHandler";

const Sidebar = ({ isCollapsed, onToggle }) => {
  const location = useLocation();
  // Notifications disabled on sidebar per requirements
  const [badges, setBadges] = useState({ tasks: 0, projects: 0, team: 0, teamMembers: 0 });
  // Organization-wide starred projects (by owner/admin/manager)
  const [orgStarred, setOrgStarred] = useState([]); // [{id,name}]
  // Member-only starred projects for teamLead/teamMember
  const [personalStarred, setPersonalStarred] = useState([]); // [{id,name}]
  const navigate = useNavigate();
  const userType = localStorage.getItem("userType");
  // Collapsed state (controlled or uncontrolled)
  const [collapsed, setCollapsed] = useState(
    typeof isCollapsed === "boolean" ? isCollapsed : true
  );
  useEffect(() => {
    if (typeof isCollapsed === "boolean") {
      setCollapsed(isCollapsed);
    }
  }, [isCollapsed]);

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
        { to: "/MyTeam", label: "Teams", icon: Users, badgeKey: "team" },
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
      label: "TIME TRACKING",
      items: [
        { to: "/tracker", label: "Tracker", icon: Timer },
      ],
    },
    {
      label: "COMMUNICATION",
      items: [{ to: "/messaging", label: "Messaging", icon: MessageCircle }],
    },
  ];

  // Load starred projects (org + personal) and listen for updates
  useEffect(() => {
    const loadStarred = async () => {
      // 1) Load personal starred (fast, per user)
      try {
        const identity = JSON.parse(localStorage.getItem("employee") || localStorage.getItem("user") || "{}");
        const personalKey = `personalStarred_${identity?.teamMemberId || identity?._id || identity?.email || "anon"}`;
        const raw = localStorage.getItem(personalKey);
        const ids = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
        const namesMapRaw = localStorage.getItem(`${personalKey}_names`);
        const nameMap = namesMapRaw ? JSON.parse(namesMapRaw) : {};
        const cachedPersonal = ids.map((id) => ({ id, name: nameMap[id] || id }));
        if (cachedPersonal.length) setPersonalStarred(cachedPersonal);
      } catch {}

      // 2) Fetch org-starred from backend (authoritative)
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await apiHandler.GetApi(api_url.getAllProjects, token);
        const projects = Array.isArray(res.projects) ? res.projects : [];
        const starredProjects = projects
          .filter((p) => p.starred === true)
          .map((p) => ({ id: p.project_id, name: p.project_name }));
        setOrgStarred(starredProjects);
        // Persist names map for quick subsequent loads for org-starred
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
      const scope = detail.scope || "auto"; // 'org' or 'personal'
      const list = (detail.projects || []).map((p) => ({ id: p.id, name: p.name || p.id }));
      if (scope === "org") {
        setOrgStarred(list);
        try {
          const nameMap = {};
          list.forEach((p) => (nameMap[p.id] = p.name));
          localStorage.setItem("starredProjectsNames", JSON.stringify(nameMap));
          localStorage.setItem("starredProjects", JSON.stringify(list.map((p) => p.id)));
        } catch {}
      } else {
        // personal scope by default
        setPersonalStarred(list);
        try {
          const identity = JSON.parse(localStorage.getItem("employee") || localStorage.getItem("user") || "{}");
          const personalKey = `personalStarred_${identity?.teamMemberId || identity?._id || identity?.email || "anon"}`;
          const nameMap = {};
          list.forEach((p) => (nameMap[p.id] = p.name));
          localStorage.setItem(personalKey, JSON.stringify(list.map((p) => p.id)));
          localStorage.setItem(`${personalKey}_names`, JSON.stringify(nameMap));
        } catch {}
      }
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

  // Disabled: no sidebar notification badges

  // Disabled: no sidebar notification live updates

  // Disabled: no sidebar notification events

  // Disabled: no sidebar notification events
  const toggleCollapsed = () => {
    if (typeof onToggle === "function") {
      try { onToggle(!collapsed); } catch { onToggle(); }
    } else {
      setCollapsed((c) => !c);
    }
  };

  return (
    <aside
      className={`h-screen fixed left-0 top-0 flex flex-col z-20 transition-all duration-300 bg-slate-50 border-r border-slate-200 overflow-y-auto will-change-[width] ${
        collapsed ? "w-16" : "w-64"
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
          {!collapsed && (
            <span className="text-blue-800 font-extrabold text-[20px] tracking-tight">
              Project Flow
            </span>
          )}
        </div>
        <button
          onClick={toggleCollapsed}
          className="text-slate-600 w-6 h-6 hover:text-blue-600 transition-colors p-1.5 rounded-md hover:bg-slate-100"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
      <nav className={`${collapsed ? "px-2" : "px-3"} py-3`}>
        {navLinks.map((section, index) => (
          <div key={index} className="mb-4">
            {!collapsed && (
              <h4 className="text-[13px] font-semibold text-blue-800 uppercase tracking-wide px-2 mb-2">
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
                        collapsed ? "px-2 justify-center" : "px-2"
                      } py-2 rounded-md transition ${
                        active
                          ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                          : "text-slate-800 hover:bg-blue-50 hover:text-blue-700"
                      }`}
                      title={collapsed ? item.label : ""}
                      onClick={async () => { /* Notifications removed from sidebar */ }}
                    >
                      <Icon size={collapsed ? 24 : 18} className={`${active ? "text-blue-700" : "text-slate-600 group-hover:text-blue-700"}`} />
                      {!collapsed && <span className="flex-1 text-[15px] font-medium">{item.label}</span>}
                      {!collapsed && item.badgeKey && badges[item.badgeKey] > 0 && (
                        <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-5 px-1.5 text-[10px] rounded-full bg-rose-600 text-white">
                          {badges[item.badgeKey]}
                        </span>
                      )}
                      {collapsed && item.badgeKey && badges[item.badgeKey] > 0 && (
                        <span className="absolute top-2 right-2 w-2 h-2 bg-rose-600 rounded-full"></span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
            {!collapsed && <div className="h-px bg-slate-200/70 mx-2" />}
          </div>
        ))}
        {/* Important Projects (org-wide) subsection */}
        {!collapsed && orgStarred.length > 0 && (
          <div className="mt-6">
            <h4 className="text-[13px] font-semibold text-blue-800 uppercase tracking-wide px-2 mb-2">Important projects</h4>
            <ul className="space-y-1">
              {orgStarred.map((p) => (
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
        {/* Personal Starred Projects for team leads/members */}
        {!collapsed && personalStarred.length > 0 && !canAccessTeamMembers && (
          <div className="mt-6">
            <h4 className="text-[13px] font-semibold text-blue-800 uppercase tracking-wide px-2 mb-2">Starred Projects</h4>
            <ul className="space-y-1">
              {personalStarred.map((p) => (
                <li key={p.id}>
                  <button
                    className={`w-full text-left relative flex items-center gap-3 px-2 py-2 rounded-md transition ${
                      location.pathname === "/ProjectDetails" ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200" : "text-slate-700 hover:bg-slate-100"
                    }`}
                    title={p.name}
                    onClick={() => {
                      navigate("/ProjectDetails", { state: { project_id: p.id } });
                    }}
                  >
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold">★</span>
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
