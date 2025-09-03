import React from "react";

export default function TrackerPage() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="max-w-[1100px] w-full bg-white rounded-2xl shadow-lg border p-8 text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
            ⏱️
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2 tracking-tight">
            Time Tracking — Launching Soon
          </h1>
          <p className="text-gray-600 text-sm leading-relaxed mb-6">
            A powerful desktop tracker with punch in/out, break tracking, and
            real-time dashboard sync will be available shortly.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            <div className="p-4 bg-gray-50 rounded-xl border">
              <div className="text-sm font-semibold text-gray-800">
                Accurate Sessions
              </div>
              <div className="text-xs text-gray-600 mt-1">
                Track total, active, idle, and grace time.
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl border">
              <div className="text-sm font-semibold text-gray-800">
                Detailed Reports
              </div>
              <div className="text-xs text-gray-600 mt-1">
                Daily insights and session breakdowns.
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl border">
              <div className="text-sm font-semibold text-gray-800">
                Secure Pairing
              </div>
              <div className="text-xs text-gray-600 mt-1">
                OTP-based connection for your device.
              </div>
            </div>
          </div>
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold">
            Coming soon for Windows and macOS
          </div>
        </div>
      </div>
    </div>
  );
}
