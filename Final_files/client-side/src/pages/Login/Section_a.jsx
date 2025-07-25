import React, { useState } from "react";
import { api_url } from "@/api/Api";
import { apiHandler } from "@/api/ApiHandler";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuthRedirect } from "@/hooks/useAuthRedirect";

const Section_a = () => {
  useAuthRedirect();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const navigate = useNavigate();

  const validate = () => {
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = "Email is required.";
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      newErrors.email = "Please enter a valid email.";
    }

    if (!password.trim()) {
      newErrors.password = "Password is required.";
    } else if (password.length < 5) {
      newErrors.password = "Password must be at least 6 characters.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submitForm = async (e) => {
    e.preventDefault();

    if (validate()) {
      try {
        const payload = { email, password };
        const response = await apiHandler.PostApi(api_url.login, payload);
        console.log(response, "response===>");

        if (response?.success || response?.message === "Login successful") {
          if (response.token) {
            localStorage.setItem("token", response.token);
          }
          if (response.user) {
            localStorage.setItem("user", JSON.stringify(response.user));
            localStorage.setItem("userType", "user");
            navigate("/Dashboard");
          } else if (response.employee) {
            localStorage.setItem("user", JSON.stringify(response.employee));
            localStorage.setItem("userType", "employee");
            navigate("/Profile"); // or another employee dashboard/profile page
          } else {
            setErrors({
              general:
                response?.message ||
                "Login failed. Please check your credentials.",
            });
          }
        } else {
          setErrors({
            general:
              response?.message ||
              "Login failed. Please check your credentials.",
          });
        }
      } catch (error) {
        setErrors({
          general: error.message || "Something went wrong during login.",
        });
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#dbeafe] px-4 py-10 font-sans">
      <button
        onClick={() => navigate("/")}
        className="absolute top-6 left-6 bg-white/80 border border-blue-200 text-blue-700 px-4 py-1 rounded-md font-semibold shadow-sm hover:bg-blue-50 transition z-20"
      >
        ← Home
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
        <h3 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Sign In To Your Account
        </h3>

        <form onSubmit={submitForm} className="space-y-5 w-full">
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
              className={`mt-1 block w-full border px-3 py-2 rounded-md focus:outline-none focus:ring-2 text-gray-900 bg-white/80 ${
                errors.email
                  ? "border-red-500 focus:ring-red-400"
                  : "border-gray-300 focus:ring-blue-400"
              }`}
              autoComplete="email"
            />
            {errors.email && (
              <p className="text-sm text-red-500 mt-1">{errors.email}</p>
            )}
          </div>

          <div className="relative">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`mt-1 block w-full border px-3 py-2 rounded-md focus:outline-none focus:ring-2 text-gray-900 bg-white/80 ${
                errors.password
                  ? "border-red-500 focus:ring-red-400"
                  : "border-gray-300 focus:ring-blue-400"
              } pr-10`}
              autoComplete="current-password"
            />
            <div
              className="absolute right-3 top-[38px] cursor-pointer text-gray-600"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </div>
            {errors.password && (
              <p className="text-sm text-red-500 mt-1">{errors.password}</p>
            )}
          </div>
          {errors.general && (
            <div className="text-center text-red-600 text-sm mb-2">
              {errors.general}
            </div>
          )}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md font-semibold shadow-sm transition"
          >
            Sign In
          </button>
        </form>

        <div className="text-center mt-6 w-full">
          <p className="text-center text-sm text-blue-600">
            Don't have an account?{" "}
            <Link to="/Register" className="font-medium underline">
              Register your company
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Section_a;
