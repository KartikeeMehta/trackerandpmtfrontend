import React from "react";
import { Apple, Monitor, Download, CheckCircle } from "lucide-react";

const DownloadApp = () => {
  return (
    <section className="w-full flex flex-col items-center justify-center px-4 py-16 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 min-h-[70vh]">
      <div className="w-full max-w-[1100px] text-center bg-white rounded-3xl shadow-xl border p-10">
        <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
          💻
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-3">
          ProjectFlow Desktop — Launching Soon
        </h2>
        <p className="text-base text-gray-600 max-w-2xl mx-auto leading-relaxed mb-6">
          Our cross‑platform desktop app for Windows and macOS is almost here.
          Download links will appear on this page as soon as we open the beta.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left mb-6">
          <div className="p-4 bg-gray-50 rounded-xl border">
            <div className="text-sm font-semibold text-gray-800">
              Fast Pairing
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Secure OTP-based connection to your account.
            </div>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl border">
            <div className="text-sm font-semibold text-gray-800">
              Smart Tracking
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Punch in/out, breaks, idle detection, and more.
            </div>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl border">
            <div className="text-sm font-semibold text-gray-800">Live Sync</div>
            <div className="text-xs text-gray-600 mt-1">
              Instant updates to your dashboard and reports.
            </div>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold">
          Windows and macOS builds coming soon
        </div>
      </div>
    </section>
  );
};

export default DownloadApp;
