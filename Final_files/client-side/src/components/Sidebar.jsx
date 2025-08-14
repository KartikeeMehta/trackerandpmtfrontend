import { Link, useLocation } from "react-router-dom";
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

const navLinks = [
  {
    label: "PRODUCTIVITY",
    items: [
      {
        to: "/Dashboard",
        label: "Overview",
        icon: LayoutDashboard,
      },
      { to: "/MyTeam", label: "My Team", icon: Users },
      {
        to: "/TeamMember",
        label: "Team Members",
        icon: UserPlus,
      },
    ],
  },
  {
    label: "TASKS & PROJECTS",
    items: [
      { to: "/AllTask", label: "All Task", icon: ListChecks },
      { to: "/AllProject", label: "My Projects", icon: BookCopy },
      {
        to: "/WorkHistory",
        label: "Work History",
        icon: History,
      },
    ],
  },
  {
    label: "COMMUNICATION",
    items: [
      { to: "/messaging", label: "Messaging", icon: MessageCircle },
    ],
  },
];

const Sidebar = ({ isCollapsed, onToggle }) => {
  const location = useLocation();

  return (
    <aside className={`bg-white h-screen shadow-md fixed left-0 top-0 flex flex-col z-20 transition-all duration-300 ${
      isCollapsed ? "w-16" : "w-64"
    }`}>
      <div className="flex items-center justify-between p-4 shadow-sm mt-3">
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
            <span className="text-blue-700 font-semibold text-xl">
              Project Flow
            </span>
          )}
        </div>
        <button
          onClick={onToggle}
          className="text-gray-700 w-5 h-5 hover:text-blue-600 transition-colors p-1 rounded hover:bg-gray-100"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight size={18} />
          ) : (
            <ChevronLeft size={18} />
          )}
        </button>
      </div>
      <nav className={`${isCollapsed ? "px-2" : "px-4"} py-4`}>
        {navLinks.map((section, index) => (
          <div key={index} className="mb-4">
            {!isCollapsed && (
              <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">
                {section.label}
              </h4>
            )}
            <ul className="space-y-1 mb-4">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className={`flex items-center gap-3 px-4 py-2 font-medium transition border-l-4 ${
                        location.pathname === item.to
                          ? "bg-blue-50 text-blue-700 border-blue-700 rounded"
                          : "text-gray-700 hover:bg-gray-100 border-transparent"
                      } ${isCollapsed ? "justify-center px-2" : ""}`}
                      title={isCollapsed ? item.label : ""}
                    >
                      <Icon size={isCollapsed ? 30 : 18} />
                      {!isCollapsed && <span>{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
            {!isCollapsed && <hr />}
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
