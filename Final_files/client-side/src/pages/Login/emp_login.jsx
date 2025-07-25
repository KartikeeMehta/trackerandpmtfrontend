import React, { useState } from "react";
import { api_url } from "@/api/Api";
import { apiHandler } from "@/api/ApiHandler";

const EmpLogin = () => {
  const [form, setForm] = useState({
    email: "",
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const response = await apiHandler.PostApi(
        api_url.employeeFirstLogin,
        form
      );
      if (response && response.message) {
        setMessage(response.message);
      } else {
        setError(response?.message || "Login failed");
      }
    } catch (err) {
      setError("Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#dbeafe] px-4 py-10 font-sans">
      <div className="w-full max-w-md bg-white/90 p-8 rounded-2xl shadow-xl border border-blue-100 flex flex-col items-center">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-6">
          <svg
            width="38"
            height="38"
            viewBox="0 0 44 44"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="44" height="44" rx="12" fill="#2563eb" />
            <path
              d="M13 29L22 15L31 29"
              stroke="#fff"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-xl font-bold text-blue-700 tracking-tight">
            ProjectFlow
          </span>
        </div>
        <h2 className="text-2xl font-bold mb-4 text-gray-800 text-center">
          Employee First Login
        </h2>
        <form onSubmit={handleSubmit} className="space-y-5 w-full">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2 text-gray-900 bg-white/80 focus:outline-none focus:ring-2 border-gray-300 focus:ring-blue-400"
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Temporary Password
            </label>
            <input
              type="password"
              name="oldPassword"
              value={form.oldPassword}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2 text-gray-900 bg-white/80 focus:outline-none focus:ring-2 border-gray-300 focus:ring-blue-400"
              required
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <input
              type="password"
              name="newPassword"
              value={form.newPassword}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2 text-gray-900 bg-white/80 focus:outline-none focus:ring-2 border-gray-300 focus:ring-blue-400"
              required
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2 text-gray-900 bg-white/80 focus:outline-none focus:ring-2 border-gray-300 focus:ring-blue-400"
              required
              autoComplete="new-password"
            />
          </div>
          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}
          {message && (
            <div className="text-green-600 text-sm text-center">{message}</div>
          )}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md font-semibold shadow-sm transition"
            disabled={loading}
          >
            {loading ? "Submitting..." : "Submit"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EmpLogin;
