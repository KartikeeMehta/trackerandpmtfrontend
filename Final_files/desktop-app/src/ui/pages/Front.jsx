import React from 'react';

export default function Front({ onConnect }) {
  return (
    <div className="p-10 bg-white">
      <h1 className="text-2xl font-semibold mb-2 text-gray-900">Welcome to ProjectFlow Tracker</h1>
      <p className="text-gray-600 mb-6">Track working hours, breaks, and idle time for accurate reports.</p>
      <ul className="list-disc ml-6 text-gray-600 space-y-1">
        <li>Automatic idle detection after 30 seconds</li>
        <li>Quick break buttons for tea, lunch, and meetings</li>
        <li>7 min grace period after stopping a session</li>
      </ul>
      <div className="mt-8">
        <button onClick={onConnect} className="px-4 py-2 rounded-md bg-sky-600 hover:bg-sky-700 text-white">Connect to Dashboard</button>
      </div>
    </div>
  );
}


