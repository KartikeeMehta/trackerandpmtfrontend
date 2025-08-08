import { api_url } from "@/api/Api";
import { apiHandler } from "@/api/ApiHandler";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const Section_a = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    if (!email.trim()) {
      setError("Email is required");
      setLoading(false);
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }
    try {
      const obj = { email: email }
      const response = await apiHandler.PostApiWithoutToken(api_url.forget_pass, obj);
      if (response?.message === "OTP sent to email") {
        setMessage("OTP sent to your email.");
        navigate("/Verification", { state: { email } });
      } else {
        setError(response?.message || "Failed to send OTP.");
      }
    } catch (error) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-[#dbeafe] px-4 py-10 font-sans relative">
      <button
        onClick={() => navigate("/login")}
        className="absolute top-6 left-6 bg-white/80 border border-blue-200 text-blue-700 px-4 py-1 rounded-md font-semibold shadow-sm hover:bg-blue-50 transition"
      >
        ← Login
      </button>

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

        <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          Forgot Password
        </h3>

        <form onSubmit={handleSubmit} className="space-y-5 w-full">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              autoComplete="email"
              aria-required="true"
              className="mt-1 block w-full border px-3 py-2 rounded-md focus:outline-none focus:ring-2 text-gray-900 bg-white/80 border-gray-300 focus:ring-blue-400"
            />
          </div>

          {error && (
            <div className="text-center text-sm text-red-600">{error}</div>
          )}
          {message && (
            <div className="text-center text-sm text-green-600">{message}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full font-semibold py-2 px-4 rounded-md transition ${loading
              ? "bg-blue-300 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
          >
            {loading ? "Sending..." : "Send OTP"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Section_a;
