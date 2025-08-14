import { useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { api_url, image_url } from "@/api/Api";
import { apiHandler } from "@/api/ApiHandler";

import { User, Settings, LogOut, Building2 } from "lucide-react";

const sampleLogo = <img src="/vite.svg" alt="Logo" className="h-8 w-8" />;

const TopBar = ({ isSidebarCollapsed = false }) => {
  const navigate = useNavigate();
  const [userDetails, setUserDetails] = useState({});
  console.log(userDetails, "userDetails------>");

  useEffect(() => {
    fetchUserData();
  }, []);

  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

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

  return (
    <header className={`h-[76px] bg-white shadow flex items-center justify-end gap-2 px-8 fixed top-0 z-10 transition-all duration-300 ${
      isSidebarCollapsed ? "left-16 right-0" : "left-64 right-0"
    }`}>
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
