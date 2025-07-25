import React, { useEffect, useState } from "react";
import { CalendarDays, Users } from "lucide-react";
import { api_url } from "@/api/Api";
import { apiHandler } from "@/api/ApiHandler";

const Section_a = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      try {
        // Use the correct API endpoint for all employees (port 8000)
        const response = await apiHandler.GetApi(
          api_url.getAllEmployees,
          token
        );
        if (Array.isArray(response)) {
          setMembers(response);
        } else {
          setError(response?.message || "Failed to fetch members");
        }
      } catch (err) {
        setError("Failed to fetch members");
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, []);

  // Helper to format names: First letter capital, rest lowercase for each part
  function formatName(name) {
    if (!name) return "";
    return name
      .split(" ")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ");
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar is already present in the main layout */}
      <div className="w-64 bg-white shadow h-screen overflow-y-auto border-r">
        <h2 className="text-xl font-bold text-gray-800 p-6 pb-2">
          All Team Members
        </h2>
        {loading ? (
          <div className="text-gray-500 p-6">Loading members...</div>
        ) : error ? (
          <div className="text-red-600 p-6">{error}</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {members.map((member, index) => (
              <li key={index} className="p-4 hover:bg-gray-50 cursor-pointer">
                <span className="font-medium text-gray-800">
                  {formatName(member.name)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {/* The rest of the page can be left empty or used for future task details */}
      <div className="flex-1"></div>
    </div>
  );
};
export default Section_a;
