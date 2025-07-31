import { useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { api_url, image_url } from "@/api/Api";

import { User, Settings, LogOut, Building2 } from "lucide-react";

const sampleLogo = <img src="/vite.svg" alt="Logo" className="h-8 w-8" />;

const TopBar = () => {
  const navigate = useNavigate();
  const [userDetails, setUserDetails] = useState({});
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

  const fetchUserData = async () => {
    const token = localStorage.getItem("token"); // ✅ Get token

    const response = await fetch("http://localhost:8000/api/profile", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, // ✅ Pass token correctly
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch data"); // ✅ Handles non-200 responses
    }

    const data = await response.json(); // ✅ Parse response
    setUserDetails(data); // ✅ Save to state
  };

  return (
    <header className="h-[76px] bg-white shadow flex items-center justify-end gap-2 px-8 fixed left-64 right-0 top-0 z-10">
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

              (userDetails?.user?.companyLogo
                ? image_url + userDetails?.user?.companyLogo
                : "/vite.svg")
            }
            alt="Company Logo"
            className="h-8 w-8 rounded-full border object-cover"
          />
          <span className="font-semibold text-sm">
            {userDetails?.companyName}
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
            onClick={handleProfile}
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
