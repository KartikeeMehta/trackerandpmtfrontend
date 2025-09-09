import React from "react";

export default function Front({ onConnect }) {
  return (
    <div className="p-10 animate-fade-in h-full flex justify-center items-center bg-gradient-to-br from-sky-50 to-emerald-50">
      <div className="max-w-2xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100 text-sky-700 text-xs border border-sky-200 animate-pop">
          <span className="h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
          WorkOrbit Desktop Tracker
        </div>

        <h1 className="mt-4 text-3xl sm:text-4xl font-semibold text-gray-900 tracking-tight">
          Focus on work, we’ll handle the tracking
        </h1>
        <p className="mt-3 text-gray-600 leading-relaxed">
          Automatic working, active, and idle time tracking with real-time sync
          to your WorkOrbit dashboard. Punch in to start, punch out to finish —
          everything else is calculated for you.
        </p>

        {/* Removed the informational cards for Total Time, Active Time, and Idle Time */}

        <button
          onClick={onConnect}
          className="mt-10 px-6 py-3 rounded-xl bg-gray-900 text-white shadow-lg shadow-gray-900/10 hover:bg-black transition-transform duration-200 active:scale-[0.98] animate-rise"
        >
          Connect to Dashboard
        </button>
      </div>
    </div>
  );
}

function FeatureCard({ title, desc, color }) {
  const colorMap = {
    sky: {
      ring: "ring-sky-200",
      dot: "bg-sky-500",
      bg: "bg-white",
    },
    emerald: {
      ring: "ring-emerald-200",
      dot: "bg-emerald-500",
      bg: "bg-white",
    },
    rose: {
      ring: "ring-rose-200",
      dot: "bg-rose-500",
      bg: "bg-white",
    },
  }[color || "sky"];

  return (
    <div
      className={`rounded-2xl border border-gray-200 ${colorMap.bg} shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-5 animate-rise`}
    >
      <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
        <span
          className={`h-2.5 w-2.5 rounded-full ${colorMap.dot} animate-pulse`}
        />
        {title}
      </div>
      <div className="mt-1 text-xs text-gray-500">{desc}</div>
      <div className={`mt-4 rounded-xl ring-1 ${colorMap.ring} p-4 text-left`}>
        <div className="h-2 w-3/4 rounded bg-gray-100" />
        <div className="mt-2 h-2 w-1/2 rounded bg-gray-100" />
        <div className="mt-2 h-2 w-2/3 rounded bg-gray-100" />
      </div>
    </div>
  );
}
