import React, { useEffect, useState } from "react";
import MainLayout from "@/components/MainLayout";
import { api_url } from "@/api/Api";
import { apiHandler } from "@/api/ApiHandler";

const TrackerConnect = () => {
  const [otp, setOtp] = useState("");
  const [expiresAt, setExpiresAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pairStatus, setPairStatus] = useState("not_paired");
  const [checkingStatus, setCheckingStatus] = useState(false);

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

  const refreshPairingStatus = async () => {
    try {
      setCheckingStatus(true);
      const res = await apiHandler.GetApi(api_url.checkPairingStatus, token);
      if (res?.success) {
        setPairStatus(res.status || "not_paired");
      }
    } catch (_) {
      // ignore
    } finally {
      setCheckingStatus(false);
    }
  };

  const disconnect = async () => {
    try {
      setCheckingStatus(true);
      const res = await apiHandler.DeleteApi(api_url.disconnectTracker, token);
      if (res?.success) {
        setPairStatus("not_paired");
        // regenerate OTP so user can pair again easily
        generateOtp();
      }
    } finally {
      setCheckingStatus(false);
    }
  };

  useEffect(() => {
    generateOtp();
    refreshPairingStatus();

    // Set up interval to refresh OTP every 5 minutes
    const interval = setInterval(() => {
      generateOtp();
    }, 5 * 60 * 1000); // 5 minutes in milliseconds

    // Poll pairing status every 5 seconds
    const statusInterval = setInterval(() => {
      refreshPairingStatus();
    }, 5000);

    // Cleanup interval on component unmount
    return () => {
      clearInterval(interval);
      clearInterval(statusInterval);
    };
  }, []);

  return (
    <div className="max-w-xl mx-auto mt-6 bg-white shadow rounded-xl p-6">
      <h1 className="text-xl font-semibold mb-2">Connect Tracker App</h1>
      <p className="text-sm text-gray-600 mb-4">
        Install the desktop tracker on your system and enter the OTP below when
        prompted to pair this dashboard with your app.
      </p>

      {pairStatus !== "paired" && (
        <div className="border rounded-lg p-4 mb-4 flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">Your OTP</div>
            <div className="text-2xl font-bold tracking-widest">
              {otp || "------"}
            </div>
            {expiresAt && (
              <div className="text-xs text-gray-500 mt-1">
                Expires: {new Date(expiresAt).toLocaleTimeString()}
              </div>
            )}
          </div>
          <button
            onClick={generateOtp}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-60"
          >
            {loading ? "Refreshing..." : "Refresh OTP"}
          </button>
        </div>
      )}

      <div className="mb-4">
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${pairStatus === "paired" ? "bg-green-100 text-green-700" : pairStatus === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-700"}`}>
          <span className={`mr-2 inline-block h-2 w-2 rounded-full ${pairStatus === "paired" ? "bg-green-600" : pairStatus === "pending" ? "bg-yellow-600" : "bg-gray-500"}`}></span>
          {checkingStatus ? "Checking..." : pairStatus === "paired" ? "Paired" : pairStatus === "pending" ? "Pending" : "Not Paired"}
        </div>
        {pairStatus === "paired" && (
          <button onClick={disconnect} disabled={checkingStatus} className="ml-3 px-3 py-1 text-sm bg-red-600 text-white rounded-md disabled:opacity-60">
            {checkingStatus ? "Working..." : "Disconnect"}
          </button>
        )}
      </div>

      <div className="space-y-3">
        <a
          href="./ProjectFlow Setup 0.1.0.exe"
          download
          className="inline-block px-4 py-2 bg-gray-800 text-white rounded-md"
        >
          Download for Windows
        </a>
        <a
          href="/downloads/ProjectFlow-0.1.0-arm64.dmg"
          download
          className="inline-block ml-3 px-4 py-2 bg-gray-800 text-white rounded-md"
        >
          Download for macOS
        </a>
      </div>

      <div className="mt-6 text-sm text-gray-600">
        <ol className="list-decimal ml-5 space-y-1">
          <li>Download and install the Tracker app for your OS.</li>
          <li>Open the app and click "Connect to Dashboard".</li>
          <li>
            Enter your email ({email || "your email"}) and the OTP shown above.
          </li>
          <li>Upon success, your tracker will be paired to this account.</li>
        </ol>
      </div>
    </div>
  );
};

export default function TrackerConnectPageWrapper() {
  return (
    <MainLayout>
      <TrackerConnect />
    </MainLayout>
  );
}
