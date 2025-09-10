import React, { useEffect, useState } from "react";
import MainLayout from "@/components/MainLayout";
import { api_url } from "@/api/Api";
import { apiHandler } from "@/api/ApiHandler";

// Toast notification component
const Toast = ({ message, type = "success", onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg transform transition-all duration-300 ${
        type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          {type === "success" ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
        <span className="font-medium">{message}</span>
        <button
          onClick={onClose}
          className="ml-2 text-white hover:text-gray-200"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};
const TrackerConnect = () => {
  const [otp, setOtp] = useState("");
  const [expiresAt, setExpiresAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pairStatus, setPairStatus] = useState("not_paired");
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [toast, setToast] = useState(null);
  const [previousPairStatus, setPreviousPairStatus] = useState("not_paired");
  const token = localStorage.getItem("token");
  const userStr =
    localStorage.getItem("user") || localStorage.getItem("employee");
  const userObj = userStr ? JSON.parse(userStr) : null;
  const email = userObj?.email;
  const generateOtp = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiHandler.PostApi(api_url.pairing_generate, {}, token);
      if (res?.success) {
        setOtp(res.pairingOTP || res.otp);
        setExpiresAt(res.pairingOTPExpiry || res.expiresAt);
      } else {
        setError(res?.message || "Failed to generate OTP");
      }
    } catch (e) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };
  const refreshPairingStatus = async (isInitialLoad = false) => {
    let newStatus = pairStatus;
    try {
      if (isInitialLoad) {
        setCheckingStatus(true);
      }
      const res = await apiHandler.GetApi(api_url.checkPairingStatus, token);
      if (res?.success) {
        newStatus = res.status || "not_paired";
        setPairStatus(newStatus);

        // Only show toast on true transition to paired, not on refreshes.
        // - Guard with sessionStorage so it only shows once per tab session
        // - Additionally require that lastPaired is recent (< 30s)
        const lastPaired = res.lastPaired ? new Date(res.lastPaired) : null;
        const pairedRecently = lastPaired
          ? Date.now() - lastPaired.getTime() < 30 * 1000
          : false;
        const toastShown =
          sessionStorage.getItem("pf_paired_toast_shown") === "true";
        if (
          previousPairStatus !== "paired" &&
          newStatus === "paired" &&
          !toastShown &&
          pairedRecently
        ) {
          setToast({ message: "Connected with desktop app!", type: "success" });
          sessionStorage.setItem("pf_paired_toast_shown", "true");
        }
        setPreviousPairStatus(newStatus);
      }
    } catch (_) {
      // ignore
    } finally {
      if (isInitialLoad) {
        setCheckingStatus(false);
      }
    }
    return newStatus;
  };
  const disconnect = async () => {
    try {
      setCheckingStatus(true);
      const res = await apiHandler.DeleteApi(api_url.disconnectTracker, token);
      if (res?.success) {
        setPairStatus("not_paired");
        setPreviousPairStatus("not_paired");
        // Allow toast again on next successful pairing in this tab session
        sessionStorage.removeItem("pf_paired_toast_shown");
        setToast({ message: "Disconnected from desktop app", type: "success" });
        // regenerate OTP so user can pair again easily
        generateOtp();
      }
    } finally {
      setCheckingStatus(false);
    }
  };
  useEffect(() => {
    // On mount: first check status; only generate OTP if not paired
    let mounted = true;
    (async () => {
      const status = await refreshPairingStatus(true);
      if (mounted && status !== "paired") {
        await generateOtp();
      }
    })();

    // Set up interval to refresh OTP every 5 minutes ONLY if not paired
    const otpInterval = setInterval(async () => {
      const status = await refreshPairingStatus(false);
      if (status !== "paired") {
        await generateOtp();
      }
    }, 5 * 60 * 1000);

    // Poll pairing status every 5 seconds (silent background updates)
    const statusInterval = setInterval(() => {
      refreshPairingStatus(false); // Silent background updates
    }, 5000);
    // Cleanup interval on component unmount
    return () => {
      mounted = false;
      clearInterval(otpInterval);
      clearInterval(statusInterval);
    };
  }, []);
  return (
    <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 min-h-screen">
      <div className="max-w-[1440px] m-auto p-6 pt-6">
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}

        {/* Header Section */}
        <div className="relative mb-8">
          <div className="backdrop-blur-md bg-white/40 border border-white/60 shadow-sm rounded-xl px-6 py-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl text-gray-800 drop-shadow-sm font-display font-bold">
                  Connect Desktop Tracker
                </h1>
                <p className="text-base text-gray-700/80 mt-1">
                  Install the desktop tracker on your system and enter the OTP
                  below when prompted to pair this dashboard with your app.
                </p>
              </div>
            </div>
          </div>
          <div className="h-px mt-3 bg-gradient-to-r from-transparent via-indigo-300/50 to-transparent"></div>
        </div>

        {/* OTP Card */}
        {pairStatus !== "paired" && (
          <div className="backdrop-blur-md bg-white/40 border border-white/60 shadow-sm rounded-xl p-6 mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 text-blue-700">
                    🔐
                  </span>
                  <div className="text-lg font-semibold text-gray-700">
                    Your Pairing Code
                  </div>
                </div>
                <div className="text-5xl font-bold tracking-widest text-gray-800 bg-white/80 backdrop-blur-sm px-6 py-4 rounded-xl shadow-sm border border-white/60 mb-4">
                  {otp || "------"}
                </div>
                {expiresAt && (
                  <div className="text-sm text-gray-500 flex items-center gap-2">
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Expires: {new Date(expiresAt).toLocaleTimeString()}
                  </div>
                )}
              </div>
              <div className="flex-shrink-0">
                <button
                  onClick={generateOtp}
                  disabled={loading}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-60 disabled:transform-none"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Refreshing...
                    </div>
                  ) : (
                    "Refresh OTP"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Status and Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Connection Status */}
          <div className="backdrop-blur-md bg-white/40 border border-white/60 shadow-sm rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700">
                📡
              </span>
              <div className="text-lg font-semibold text-gray-700">
                Connection Status
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div
                className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                  pairStatus === "paired"
                    ? "bg-green-100 text-green-700"
                    : pairStatus === "pending"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                <span
                  className={`mr-2 inline-block h-2 w-2 rounded-full ${
                    pairStatus === "paired"
                      ? "bg-green-600"
                      : pairStatus === "pending"
                      ? "bg-yellow-600"
                      : "bg-gray-500"
                  }`}
                ></span>
                {checkingStatus
                  ? "Checking..."
                  : pairStatus === "paired"
                  ? "Paired"
                  : pairStatus === "pending"
                  ? "Pending"
                  : "Not Paired"}
              </div>
              {pairStatus === "paired" && (
                <button
                  onClick={disconnect}
                  disabled={checkingStatus}
                  className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg disabled:opacity-60 hover:bg-red-700 transition-colors"
                >
                  {checkingStatus ? "Working..." : "Disconnect"}
                </button>
              )}
            </div>
          </div>

          {/* Download Section */}
          <div className="backdrop-blur-md bg-white/40 border border-white/60 shadow-sm rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-purple-100 text-purple-700">
                💻
              </span>
              <div className="text-lg font-semibold text-gray-700">
                Download Desktop App
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="https://www.dropbox.com/scl/fi/2ox6ste7fdgru265fhftj/WorkOrbit-Setup-0.1.0.exe?rlkey=q04ecsnb7lf8j2hws6wccukvf&st=o7zmkvav&dl=1"
                download
                className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                Download for Windows
              </a>
              <a
                href="https://www.dropbox.com/scl/fi/fkmj020y7toj9j1ulzsgc/WorkOrbit-0.1.0.dmg?rlkey=mf52az41bw8407jltfr80vhks&st=7mdhazfs&dl=1"
                download
                className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                Download for macOS
              </a>
            </div>
          </div>
        </div>
        {/* Instructions Section */}
        <div className="backdrop-blur-md bg-white/40 border border-white/60 shadow-sm rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700">
              📋
            </span>
            <div className="text-lg font-semibold text-gray-700">
              Setup Instructions
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-semibold">
                  1
                </div>
                <div>
                  <div className="font-medium text-gray-700">
                    Download & Install
                  </div>
                  <div className="text-sm text-gray-600">
                    Download and install the Tracker app for your operating
                    system using the buttons above.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-semibold">
                  2
                </div>
                <div>
                  <div className="font-medium text-gray-700">
                    Launch Application
                  </div>
                  <div className="text-sm text-gray-600">
                    Open the app and click "Connect to Dashboard" to start the
                    pairing process.
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-semibold">
                  3
                </div>
                <div>
                  <div className="font-medium text-gray-700">
                    Enter Credentials
                  </div>
                  <div className="text-sm text-gray-600">
                    Enter your email ({email || "your email"}) and the OTP code
                    shown above.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-semibold">
                  4
                </div>
                <div>
                  <div className="font-medium text-gray-700">
                    Complete Pairing
                  </div>
                  <div className="text-sm text-gray-600">
                    Upon successful connection, your tracker will be paired to
                    this account.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default function TrackerConnectPageWrapper() {
  return (
    <MainLayout noPadding={true}>
      <TrackerConnect />
    </MainLayout>
  );
}
