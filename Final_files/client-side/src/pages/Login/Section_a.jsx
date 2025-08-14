import React, { useState } from "react";
import { api_url } from "@/api/Api";
import { apiHandler } from "@/api/ApiHandler";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Smartphone, Shield } from "lucide-react";
import { useAuthRedirect } from "@/hooks/useAuthRedirect";

const Section_a = () => {
  useAuthRedirect();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  // 2FA states
  const [showTwoFactorForm, setShowTwoFactorForm] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [rememberDevice, setRememberDevice] = useState(false);
  const [deviceName, setDeviceName] = useState("");
  const [loginResponse, setLoginResponse] = useState(null);
  const [loading, setLoading] = useState(false);

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
    setLoading(true);
    setErrors({});

   

    // Check for device token first
    const deviceToken = localStorage.getItem("deviceToken");
    const deviceId = localStorage.getItem("deviceId");

    if (deviceToken && deviceId) {
      console.log("Found device token, checking if still valid...");
      try {
        const deviceResponse = await apiHandler.PostApi(
          api_url.validateDeviceToken,
          {
            email,
            deviceToken,
            deviceId,
          }
        );

        if (deviceResponse?.skipTwoFactor) {
          console.log("Device token valid, skipping 2FA");
          handleSuccessfulLogin(deviceResponse);
          return;
        }
      } catch (error) {
        console.log(
          "Device token validation failed, proceeding with normal login"
        );
        // Clear invalid device tokens
        localStorage.removeItem("deviceToken");
        localStorage.removeItem("deviceId");
      }
    }

    try {
      const response = await apiHandler.PostApi(api_url.login, {
        email,
        password,
      });

      console.log("Login response:", response);

      if (response?.success || response?.message === "Login successful") {
        console.log("User data:", response.user);
        console.log("Employee data:", response.employee);
        console.log(
          "2FA check - User 2FA enabled:",
          response.user?.twoFactorEnabled
        );
        console.log(
          "2FA check - Employee 2FA enabled:",
          response.employee?.twoFactorEnabled
        );

        // Check if user has 2FA enabled
        if (
          response.user?.twoFactorEnabled ||
          response.employee?.twoFactorEnabled
        ) {
          console.log("2FA is enabled, showing verification form");
          setLoginResponse(response);
          setShowTwoFactorForm(true);
          // Auto-generate device name
          const deviceName = `${navigator.platform} - ${navigator.userAgent.includes("Chrome")
              ? "Chrome"
              : navigator.userAgent.includes("Firefox")
                ? "Firefox"
                : navigator.userAgent.includes("Safari")
                  ? "Safari"
                  : "Browser"
            }`;
          setDeviceName(deviceName);
          console.log("Auto-generated device name:", deviceName);
        } else {
          console.log("2FA is disabled, proceeding with normal login");
          // No 2FA, proceed with normal login
          handleSuccessfulLogin(response);
        }
      } else {
        console.log("Login failed:", response?.message);
        setErrors({
          general:
            response?.message || "Login failed. Please check your credentials.",
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      setErrors({
        general: "An error occurred during login. Please try again.",
      });
    } finally {
      setLoading(false);
      console.log("=== LOGIN PROCESS END ===");
    }
  };

  const handleTwoFactorVerification = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    console.log("=== 2FA VERIFICATION START ===");
    console.log(
      "Email:",
      loginResponse.user?.email || loginResponse.employee?.email
    );
    console.log("Token entered:", twoFactorToken);
    console.log("Remember device:", rememberDevice);
    console.log("Device name:", deviceName);

    try {
      const payload = {
        email: loginResponse.user?.email || loginResponse.employee?.email,
        token: twoFactorToken,
        rememberDevice,
        deviceName: rememberDevice ? deviceName : undefined,
      };

      // console.log("2FA verification payload:", payload);
      console.log("Making API call to:", api_url.verifyTwoFactorToken);

      const response = await apiHandler.PostApi(
        api_url.verifyTwoFactorToken,
        payload
      );

      console.log("2FA verification response:", response);

      if (response?.message === "2FA verification successful") {
        console.log("=== 2FA VERIFICATION SUCCESSFUL ===");
        // Store device token if provided
        if (response.deviceToken) {
          console.log(
            "Storing device token:",
            response.deviceToken.substring(0, 20) + "..."
          );
          localStorage.setItem("deviceToken", response.deviceToken);
          localStorage.setItem("deviceId", response.deviceId);
        }

        console.log("About to call handleSuccessfulLogin...");
        handleSuccessfulLogin(response);
      } else {
        console.log("=== 2FA VERIFICATION FAILED ===");
        console.log("Error message:", response?.message);
        setErrors({
          twoFactor: response?.message || "Invalid verification code.",
        });
      }
    } catch (error) {
      console.error("=== 2FA VERIFICATION ERROR ===");
      console.error("Error details:", error);
      setErrors({
        twoFactor: "Verification failed. Please try again.",
      });
    } finally {
      setLoading(false);
      console.log("=== 2FA VERIFICATION END ===");
    }
  };

  const handleSuccessfulLogin = (response) => {
    console.log("=== HANDLE SUCCESSFUL LOGIN START ===");
    console.log("handleSuccessfulLogin called with response:", response);

    if (response.token) {
      console.log("Storing token:", response.token.substring(0, 20) + "...");
      localStorage.setItem("token", response.token);
      console.log("Token stored in localStorage");
    } else {
      console.log("No token in response");
    }

    if (response.user) {
      console.log("Storing user data");
      localStorage.setItem("user", JSON.stringify(response.user));
      localStorage.setItem("userType", "user");
      console.log("User data stored in localStorage");
      console.log("Navigating to Dashboard");
      navigate("/Dashboard");
    } else if (response.employee) {
      console.log("Storing employee data");
      localStorage.setItem("user", JSON.stringify(response.employee));
      localStorage.setItem("userType", "employee");
      console.log("Employee data stored in localStorage");
      console.log("Navigating to Profile");
      navigate("/Profile");
    } else {
      console.log("No user or employee data in response");
    }

    console.log("=== HANDLE SUCCESSFUL LOGIN END ===");
  };

  const handleBackToLogin = () => {
    setShowTwoFactorForm(false);
    setTwoFactorToken("");
    setRememberDevice(false);
    setDeviceName("");
    setLoginResponse(null);
    setErrors({});
  };

  if (showTwoFactorForm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#dbeafe] px-4 py-10 font-sans">
        <button
          onClick={handleBackToLogin}
          className="absolute top-6 left-6 bg-white/80 border border-blue-200 text-blue-700 px-4 py-1 rounded-md font-semibold shadow-sm hover:bg-blue-50 transition z-20"
        >
          ← Back to Login
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

          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-8 h-8 text-blue-600" />
            <h3 className="text-2xl font-bold text-center text-gray-800">
              Two-Factor Authentication
            </h3>
          </div>

          <p className="text-gray-600 text-center mb-6">
            Enter the 6-digit code from your authenticator app to complete your
            login.
          </p>

          <form
            onSubmit={handleTwoFactorVerification}
            className="space-y-5 w-full"
          >
            <div>
              <label
                htmlFor="twoFactorToken"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Verification Code
              </label>
              <input
                type="text"
                id="twoFactorToken"
                value={twoFactorToken}
                onChange={(e) => setTwoFactorToken(e.target.value)}
                className={`mt-1 block w-full border px-3 py-2 rounded-md focus:outline-none focus:ring-2 text-gray-900 bg-white/80 text-center text-lg tracking-widest ${errors.twoFactor
                    ? "border-red-500 focus:ring-red-400"
                    : "border-gray-300 focus:ring-blue-400"
                  }`}
                placeholder="000000"
                maxLength={6}
                autoComplete="off"
              />
              {errors.twoFactor && (
                <p className="text-sm text-red-500 mt-1">{errors.twoFactor}</p>
              )}
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  Remember this device for 7 days
                </span>
              </label>

              {rememberDevice && (
                <div>
                  <label
                    htmlFor="deviceName"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Device Name
                  </label>
                  <input
                    type="text"
                    id="deviceName"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 text-gray-900 bg-white/80 focus:ring-blue-400"
                    placeholder="e.g., My Laptop"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md font-semibold shadow-sm transition flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Verifying...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  Verify & Sign In
                </>
              )}
            </button>
          </form>

          <div className="text-center mt-6 w-full">
            <p className="text-sm text-gray-600">
              Don't have access to your authenticator app?{" "}
              <button
                onClick={() =>
                  setErrors({
                    twoFactor:
                      "Please contact your administrator for backup codes.",
                  })
                }
                className="text-blue-600 hover:underline font-medium"
              >
                Use backup code
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

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
              className={`mt-1 block w-full border px-3 py-2 rounded-md focus:outline-none focus:ring-2 text-gray-900 bg-white/80 ${errors.email
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
              className={`mt-1 block w-full border px-3 py-2 rounded-md focus:outline-none focus:ring-2 text-gray-900 bg-white/80 ${errors.password
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
          <h1
            onClick={() => navigate("/ForgetPassword")}
            className="flex justify-end text-blue-600 hover:underline cursor-pointer">Forget Password</h1>
          {errors.general && (
            <div className="text-center text-red-600 text-sm mb-2">
              {errors.general}
            </div>
          )}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md font-semibold shadow-sm transition flex items-center justify-center gap-2"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Signing In...
              </>
            ) : (
              "Sign In"
            )}
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
