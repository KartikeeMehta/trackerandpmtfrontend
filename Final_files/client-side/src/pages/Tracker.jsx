import React, { useEffect, useState } from "react";
import { api_url } from "@/api/Api";
import { apiHandler } from "@/api/ApiHandler";

export default function TrackerPage() {
  const [stats, setStats] = useState({ totalTimeMs: 0, activeTimeMs: 0, idleTimeMs: 0, breaksTimeMs: 0, graceTimeMs: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sessions, setSessions] = useState([]);

  const token = localStorage.getItem("token");
  const userStr = localStorage.getItem("user") || localStorage.getItem("employee");
  const email = userStr ? JSON.parse(userStr)?.email : null;

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await apiHandler.GetApi(`${api_url.BASE_URL}/tracker/stats/today?email=${encodeURIComponent(email)}`);
        if (res?.success) { setStats(res); setError(""); } else { setError(res?.message || "Failed to fetch"); }
      } finally {
        setLoading(false);
      }
    };
    const fetchSessions = async () => {
      try {
        const r = await apiHandler.GetApi(`${api_url.BASE_URL}/tracker/sessions/today?email=${encodeURIComponent(email)}`);
        if (r?.success) setSessions(r.sessions || []);
      } catch {}
    };
    if (email) fetchStats();
    if (email) fetchSessions();
    const id = setInterval(() => { fetchStats(); fetchSessions(); }, 10000);
    return () => clearInterval(id);
  }, [email]);

  const fmt = (ms) => {
    const s = Math.floor(ms / 1000) % 60;
    const m = Math.floor(ms / (1000 * 60)) % 60;
    const h = Math.floor(ms / (1000 * 60 * 60));
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  // Simple donut chart without external deps
  const Donut = ({ data }) => {
    const total = Object.values(data).reduce((a, b) => a + b, 0) || 1;
    const parts = [
      { key: "active", color: "#16a34a", value: data.active },
      { key: "idle", color: "#f59e0b", value: data.idle },
      { key: "breaks", color: "#3b82f6", value: data.breaks },
      { key: "grace", color: "#8b5cf6", value: data.grace },
    ];
    let offset = 0;
    return (
      <svg width="120" height="120" viewBox="0 0 42 42">
        <circle cx="21" cy="21" r="15.915" fill="#fff" />
        {parts.map((p, idx) => {
          const frac = p.value / total;
          const dash = `${(frac * 100).toFixed(2)} ${100 - (frac * 100).toFixed(2)}`;
          const rotation = (offset / total) * 360;
          offset += p.value;
          return (
            <circle
              key={p.key}
              cx="21" cy="21" r="15.915"
              fill="transparent"
              stroke={p.color}
              strokeWidth="6"
              strokeDasharray={dash}
              strokeDashoffset="25"
              transform={`rotate(${rotation} 21 21)`}
            />
          );
        })}
      </svg>
    );
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Tracker</h1>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
      {loading ? (
        <div className="text-sm text-gray-500">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-4 bg-white rounded border">
              <div className="text-gray-500 text-xs">Total</div>
              <div className="text-lg font-semibold">{fmt(stats.totalTimeMs || 0)}</div>
            </div>
            <div className="p-4 bg-white rounded border">
              <div className="text-gray-500 text-xs">Active</div>
              <div className="text-lg font-semibold">{fmt(stats.activeTimeMs || 0)}</div>
            </div>
            <div className="p-4 bg-white rounded border">
              <div className="text-gray-500 text-xs">Idle</div>
              <div className="text-lg font-semibold">{fmt(stats.idleTimeMs || 0)}</div>
            </div>
            <div className="p-4 bg-white rounded border">
              <div className="text-gray-500 text-xs">Breaks</div>
              <div className="text-lg font-semibold">{fmt(stats.breaksTimeMs || 0)}</div>
            </div>
            <div className="p-4 bg-white rounded border">
              <div className="text-gray-500 text-xs">Grace</div>
              <div className="text-lg font-semibold">{fmt(stats.graceTimeMs || 0)}</div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded border p-4 flex items-center gap-4">
              <Donut data={{
                active: stats.activeTimeMs || 0,
                idle: stats.idleTimeMs || 0,
                breaks: stats.breaksTimeMs || 0,
                grace: stats.graceTimeMs || 0,
              }} />
              <div>
                <div className="text-sm text-gray-600">Distribution</div>
                <ul className="text-sm mt-2 space-y-1">
                  <li><span className="inline-block w-2 h-2 rounded-full mr-2" style={{background:'#16a34a'}}></span>Active: {fmt(stats.activeTimeMs || 0)}</li>
                  <li><span className="inline-block w-2 h-2 rounded-full mr-2" style={{background:'#f59e0b'}}></span>Idle: {fmt(stats.idleTimeMs || 0)}</li>
                  <li><span className="inline-block w-2 h-2 rounded-full mr-2" style={{background:'#3b82f6'}}></span>Breaks: {fmt(stats.breaksTimeMs || 0)}</li>
                  <li><span className="inline-block w-2 h-2 rounded-full mr-2" style={{background:'#8b5cf6'}}></span>Grace: {fmt(stats.graceTimeMs || 0)}</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-white rounded border">
            <h2 className="text-sm font-semibold mb-3">Tips</h2>
            <ul className="text-sm text-gray-600 list-disc ml-5 space-y-1">
              <li>Start/Stop from desktop to record active vs idle time correctly.</li>
              <li>Use break buttons for tea, lunch, and meetings to avoid over-counting idle.</li>
              <li>Grace window of 7 minutes is added after stopping a session.</li>
            </ul>
          </div>
        </>
      )}

      <div className="mt-6 bg-white rounded border p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Today Sessions</h2>
          <button
            onClick={async () => {
              const token = localStorage.getItem("token");
              if (!token) return;
              await apiHandler.DeleteApi(api_url.disconnectTracker, token);
              // disconnecting does not delete sessions
            }}
            className="text-xs px-3 py-1 bg-red-600 text-white rounded"
          >
            Disconnect App
          </button>
        </div>
        {sessions.length === 0 ? (
          <div className="text-sm text-gray-500">No sessions yet today.</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500">
                  <th className="text-left p-2">Started</th>
                  <th className="text-left p-2">Ended</th>
                  <th className="text-left p-2">Total</th>
                  <th className="text-left p-2">Active</th>
                  <th className="text-left p-2">Idle</th>
                  <th className="text-left p-2">Breaks</th>
                  <th className="text-left p-2">Grace</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s._id} className="border-t">
                    <td className="p-2">{s.startedAt ? new Date(s.startedAt).toLocaleTimeString() : "-"}</td>
                    <td className="p-2">{s.endedAt ? new Date(s.endedAt).toLocaleTimeString() : "-"}</td>
                    <td className="p-2">{fmt(s.totalTimeMs || 0)}</td>
                    <td className="p-2">{fmt(s.activeTimeMs || 0)}</td>
                    <td className="p-2">{fmt(s.idleTimeMs || 0)}</td>
                    <td className="p-2">{fmt(s.breaksTimeMs || 0)}</td>
                    <td className="p-2">{fmt(s.graceTimeMs || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


