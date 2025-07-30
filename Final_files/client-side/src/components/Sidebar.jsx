import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  ListChecks,
  BookCopy,
  History,
  ChevronLeft,
} from "lucide-react";
const navLinks = [
  {
    label: "PRODUCTIVITY",
    items: [
      {
        to: "/Dashboard",
        label: "Overview",
        icon: <LayoutDashboard size={18} />,
      },
      { to: "/MyTeam", label: "My Team", icon: <Users size={18} /> },
      {
        to: "/TeamMember",
        label: "Team Members",
        icon: <UserPlus size={18} />,
      },
    ],
  },
  {
    label: "TASKS & PROJECTS",
    items: [
      { to: "/AllTask", label: "All Task", icon: <ListChecks size={18} /> },
      { to: "/AllProject", label: "My Projects", icon: <BookCopy size={18} /> },
      {
        to: "/WorkHistory",
        label: "Work History",
        icon: <History size={18} />,
      },
    ],
  },
];
const Sidebar = () => {
  const location = useLocation();
  return (
    <aside className="w-64 bg-white h-screen shadow-md fixed left-0 top-0 flex flex-col z-20">
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
          <span className="text-blue-700 font-semibold text-xl">
            Project Flow
          </span>
        </div>
        <ChevronLeft className="text-gray-700 w-5 h-5" size={18} />
      </div>
      <nav className="p-4">
        {navLinks.map((section, index) => (
          <div key={index} className="mb-4">
            <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">
              {section.label}
            </h4>
            <ul className="space-y-1 mb-4">
              {section.items.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={`flex items-center gap-3 px-4 py-2 font-medium transition border-l-4 ${
                      location.pathname === item.to
                        ? "bg-blue-50 text-blue-700 border-blue-700 rounded"
                        : "text-gray-700 hover:bg-gray-100 border-transparent"
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <hr />
          </div>
        ))}
      </nav>
    </aside>
  );
};
export default Sidebar;
