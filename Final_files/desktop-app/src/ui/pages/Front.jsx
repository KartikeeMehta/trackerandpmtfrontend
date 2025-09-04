import React from 'react';

function Feature({ title, desc }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
      <div className="text-sm font-medium text-gray-900">{title}</div>
      <div className="text-xs text-gray-600 mt-0.5">{desc}</div>
    </div>
  );
}

export default function Front({ onConnect }) {
  return (
    <div className="p-10 bg-white">
      <div className="rounded-xl border border-gray-200 shadow-sm bg-white/90">
        <div className="px-6 py-8">
          <h1 className="text-3xl font-semibold mb-3 text-gray-900 tracking-tight">Welcome to ProjectFlow Tracker</h1>
          <p className="text-gray-600 mb-8 max-w-2xl">Track working hours, breaks, and idle time with beautiful reports your team will actually use.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <Feature title="Smart idle detection" desc="Auto-detects after 30 seconds" />
            <Feature title="One-click breaks" desc="Tea, lunch, meeting presets" />
            <Feature title="Graceful stops" desc="7 min grace after ending" />
          </div>
          <button
            onClick={onConnect}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-sky-600 hover:bg-sky-700 text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
          >
            Connect to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}


