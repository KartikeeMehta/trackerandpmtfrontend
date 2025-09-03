import React from "react";
import MainLayout from "@/components/MainLayout";

function LaunchingSoon() {
  return (
    <div className="flex items-center min-h-[60vh] px-4">
      <div className="max-w-[1100px] w-full bg-white rounded-2xl shadow-lg border p-8 text-center">
        <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
          🚀
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2 tracking-tight">
          Tracker App — Launching Soon
        </h1>
        <p className="text-gray-600 text-sm leading-relaxed mb-6">
          We’re putting the final touches on our desktop Tracker for Windows and
          macOS. Time tracking, breaks, and real-time sync with your dashboard
          will arrive here shortly.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left mb-6">
          <div className="p-4 bg-gray-50 rounded-xl border">
            <div className="text-sm font-semibold text-gray-800">
              Punch In/Out
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Seamless session tracking with accurate totals.
            </div>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl border">
            <div className="text-sm font-semibold text-gray-800">
              Break Controls
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Tea, lunch, meetings — tracked separately.
            </div>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl border">
            <div className="text-sm font-semibold text-gray-800">
              Real-time Sync
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Live updates to your dashboard via secure pairing.
            </div>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold">
          Coming soon for Windows and macOS
        </div>
      </div>
    </div>
  );
}

export default function TrackerConnectPageWrapper() {
  return (
    <MainLayout>
      <LaunchingSoon />
    </MainLayout>
  );
}
