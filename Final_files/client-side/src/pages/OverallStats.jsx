import React, { useEffect, useMemo, useRef, useState } from "react";
import { api_url } from "@/api/Api";
import { apiHandler } from "@/api/ApiHandler";

export default function OverallStatsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [status, setStatus] = useState(null);
  const [breaksData, setBreaksData] = useState({
    date: "",
    breaks: [],
    totals: { count: 0, totalMinutes: 0, totalHMS: "00:00:00" },
  });
  const [selectedDate, setSelectedDate] = useState("");
  const [dateSummary, setDateSummary] = useState(null);
  const tickRef = useRef(null);
  const [intensityTick, setIntensityTick] = useState(0);

  const minToMs = (min) => Math.max(0, Number(min) || 0) * 60 * 1000;
  const formatIST = (dateLike) => {
    try {
      if (!dateLike) return "—";
      const d = new Date(dateLike);
      return new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        hour12: true,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(d);
    } catch {
      return "—";
    }
  };

  const formatISTDate = (dateLike) => {
    try {
      if (!dateLike) return "—";
      const d = new Date(dateLike);
      const time = new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
        timeZone: "UTC",
      }).format(d);
      return time;
    } catch {
      return "—";
    }
  };
  const fmt = (ms) => {
    const safe = Math.max(0, Number(ms) || 0);
    const s = Math.floor(safe / 1000) % 60;
    const m = Math.floor(safe / (1000 * 60)) % 60;
    const h = Math.floor(safe / (1000 * 60 * 60));
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  const fetchStatus = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setLoading(true);
      }
      const token = localStorage.getItem("token");
      const res = await apiHandler.GetApi(api_url.employeeTrackerStatus, token);
      if (res?.success) {
        setStatus(res.status || null);
        setError("");
      } else {
        setError(res?.message || "Failed to load tracker status");
      }
    } catch (e) {
      setError("Unable to reach server");
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  };

  const fetchBreaks = async (dateStr) => {
    try {
      const token = localStorage.getItem("token");
      const qs = dateStr ? `?date=${encodeURIComponent(dateStr)}` : "";
      const res = await apiHandler.GetApi(
        `${api_url.employeeTrackerBreaks}${qs}`,
        token
      );
      if (res?.success) {
        setBreaksData({
          date: res.date || dateStr,
          breaks: Array.isArray(res.breaks) ? res.breaks : [],
          totals: res.totals || {
            count: 0,
            totalMinutes: 0,
            totalHMS: "00:00:00",
          },
        });
      } else {
        setBreaksData({
          date: dateStr,
          breaks: [],
          totals: { count: 0, totalMinutes: 0, totalHMS: "00:00:00" },
        });
      }
    } catch {
      setBreaksData({
        date: dateStr,
        breaks: [],
        totals: { count: 0, totalMinutes: 0, totalHMS: "00:00:00" },
      });
    }
  };

  const fetchDailySummary = async (dateStr) => {
    try {
      const token = localStorage.getItem("token");
      const qs = dateStr ? `?date=${encodeURIComponent(dateStr)}` : "";
      const res = await apiHandler.GetApi(
        `${api_url.employeeTrackerDailySummary}${qs}`,
        token
      );
      if (res?.success) {
        setDateSummary(res.summary || null);
      } else {
        setDateSummary(null);
      }
    } catch {
      setDateSummary(null);
    }
  };

  useEffect(() => {
    fetchStatus(true);
    const poll = setInterval(() => fetchStatus(false), 15000);
    return () => clearInterval(poll);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setIntensityTick((t) => t + 1), 15000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const date = status?.todaySummary?.date || new Date().toISOString().slice(0, 10);
    setSelectedDate(date);
    fetchDailySummary(date);
    fetchBreaks(date);
  }, [status?.todaySummary?.date]);

  useEffect(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [status?.currentSession?.isActive]);

  const cards = useMemo(() => {
    const ds = dateSummary || {};
    const totalMs = minToMs(ds.totalWorkTime || 0);
    const breakMs = minToMs(ds.totalBreakTime || 0);
    const idleMs = minToMs(ds.totalIdleTime || 0);
    const productiveMs = minToMs(ds.totalProductiveTime || 0);
    const activity = (ds.totalWorkTime || 0) > 0
      ? Math.round(((ds.totalProductiveTime || 0) / (ds.totalWorkTime || 0)) * 100)
      : 0;
    return { totalMs, productiveMs, idleMs, breakMs, activity };
  }, [dateSummary]);

  const dailyProductivityData = useMemo(() => {
    if (!status?.workSessions || !Array.isArray(status.workSessions)) {
      return [];
    }
    const end = selectedDate ? new Date(selectedDate) : new Date();
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(end);
      date.setDate(date.getDate() - i);
      const istDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(date);
      last7Days.push(istDate);
    }
    return last7Days.map((date) => {
      const daySessions = status.workSessions.filter((session) => {
        const sessionDate = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Kolkata",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date(session.startTime));
        return sessionDate === date;
      });
      if (daySessions.length === 0) {
        return {
          date,
          productivity: 0,
          productiveTime: 0,
          totalTime: 0,
          productiveTimeFormatted: "0h 0m",
          totalTimeFormatted: "0h 0m",
        };
      }
      let totalProductiveTime = 0;
      let totalWorkTime = 0;
      daySessions.forEach((session) => {
        const productiveMs = minToMs(session.productiveTime || 0);
        const workMs = minToMs(session.duration || 0);
        totalProductiveTime += productiveMs;
        totalWorkTime += workMs;
      });
      const productivity = totalWorkTime > 0 ? (totalProductiveTime / totalWorkTime) * 100 : 0;
      return {
        date,
        productivity: Math.round(productivity),
        productiveTime: totalProductiveTime,
        totalTime: totalWorkTime,
        productiveTimeFormatted: fmt(totalProductiveTime),
        totalTimeFormatted: fmt(totalWorkTime),
      };
    });
  }, [status?.workSessions, selectedDate]);

  const idleTrendData = useMemo(() => {
    if (!status?.workSessions || !Array.isArray(status.workSessions)) {
      return [];
    }
    const end = selectedDate ? new Date(selectedDate) : new Date();
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(end);
      date.setDate(date.getDate() - i);
      const istDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(date);
      last7Days.push(istDate);
    }
    return last7Days.map((date) => {
      const sessionsForDay = status.workSessions.filter((s) => {
        const sessionDate = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Kolkata",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date(s.startTime));
        return sessionDate === date;
      });
      try {
        const cur = status.currentSession;
        if (cur && cur.startTime) {
          const curDate = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Kolkata",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(new Date(cur.startTime));
          if (curDate === date) sessionsForDay.push(cur);
        }
      } catch {}
      const idleMin = sessionsForDay.reduce((sum, s) => sum + (Number(s.idleTime) || 0), 0);
      return { date, idleMin: Math.max(0, Math.round(idleMin)) };
    });
  }, [status?.workSessions, status?.currentSession, selectedDate]);

  const inputIntensityData = useMemo(() => {
    if (!status?.workSessions || !Array.isArray(status.workSessions)) {
      return [];
    }
    const target = selectedDate
      ? selectedDate
      : new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Kolkata",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date());
    const daySessions = status.workSessions.filter((session) => {
      const sessionDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(session.startTime));
      return sessionDate === target;
    });
    try {
      if (status.currentSession && status.currentSession.startTime) {
        const curDate = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Kolkata",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date(status.currentSession.startTime));
        if (curDate === target) daySessions.push(status.currentSession);
      }
    } catch {}
    let totalKeystrokes = 0;
    let totalMouseClicks = 0;
    let totalActiveMin = 0;
    daySessions.forEach((session) => {
      totalKeystrokes += session.totalKeystrokes || 0;
      totalMouseClicks += session.totalMouseClicks || 0;
      totalActiveMin += session.productiveTime || 0;
    });
    return [
      { date: target, keystrokes: totalKeystrokes, clicks: totalMouseClicks, activeMin: totalActiveMin },
    ];
  }, [status?.workSessions, intensityTick, selectedDate]);

  const InputIntensityCard = ({ days }) => {
    const totals = days.reduce(
      (acc, d) => {
        acc.keystrokes += d.keystrokes || 0;
        acc.clicks += d.clicks || 0;
        acc.activeMin += d.activeMin || 0;
        return acc;
      },
      { keystrokes: 0, clicks: 0, activeMin: 0 }
    );
    const kpm = totals.activeMin ? totals.keystrokes / totals.activeMin : 0;
    const cpm = totals.activeMin ? totals.clicks / totals.activeMin : 0;
    const today = days[0]?.date ? new Date(days[0].date) : new Date();
    return (
      <div className="backdrop-blur-md bg-white/40 border border-white/60 shadow-sm rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-fuchsia-100 text-fuchsia-700">
            ⌨️
          </span>
          <div className="text-lg font-semibold text-gray-700">Input Intensity</div>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="rounded-xl bg-gradient-to-br from-violet-50 to-violet-100 p-4 border border-white/60">
            <div className="text-xs text-gray-500 mb-1">Keystrokes</div>
            <div className="text-2xl font-bold text-violet-700 tabular-nums">
              {totals.keystrokes.toLocaleString()}
            </div>
            <div className="text-xs text-gray-600 mt-1">{kpm.toFixed(1)} per minute</div>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-cyan-50 to-cyan-100 p-4 border border-white/60">
            <div className="text-xs text-gray-500 mb-1">Mouse Clicks</div>
            <div className="text-2xl font-bold text-cyan-700 tabular-nums">
              {totals.clicks.toLocaleString()}
            </div>
            <div className="text-xs text-gray-600 mt-1">{cpm.toFixed(1)} per minute</div>
          </div>
        </div>
      </div>
    );
  };

  const Donut = ({ data }) => {
    const total = Object.values(data).reduce((a, b) => a + b, 0) || 1;
    const colors = ["#22c55e", "#f59e0b", "#3b82f6"];
    const keys = Object.keys(data);
    let acc = 0;
    return (
      <svg viewBox="0 0 42 42" className="w-44 h-44">
        <circle cx="21" cy="21" r="15.9155" fill="#fff" stroke="#E5E7EB" strokeWidth="6" />
        {keys.map((k, i) => {
          const val = data[k];
          const frac = val / total;
          const dash = `${(frac * 100).toFixed(2)} ${((1 - frac) * 100).toFixed(2)}`;
          const rot = `rotate(${acc * 360 - 90} 21 21)`;
          acc += frac;
          return (
            <circle
              key={k}
              cx="21"
              cy="21"
              r="15.9155"
              fill="transparent"
              stroke={colors[i % colors.length]}
              strokeWidth="6"
              strokeDasharray={dash}
              transform={rot}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
    );
  };

  const ProductivityTrends = ({ data }) => {
    if (!data || data.length === 0) {
      return (
        <div className="backdrop-blur-md bg-white/40 border border-white/60 shadow-sm rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700">📈</span>
            <div className="text-lg font-semibold text-gray-700">Daily Productivity Trends</div>
          </div>
          <div className="text-center py-8 text-gray-500">
            <div className="text-lg font-medium mb-2">No data available</div>
            <div className="text-sm">Start tracking to see your productivity trends</div>
          </div>
        </div>
      );
    }
    const maxProductivity = Math.max(...data.map((d) => d.productivity));
    const avgProductivity = data.reduce((sum, d) => sum + d.productivity, 0) / data.length;
    const chartHeight = 200;
    const chartWidth = 400;
    const padding = 40;
    const innerWidth = chartWidth - padding * 2;
    const innerHeight = chartHeight - padding * 2;
    const points = data.map((d, i) => {
      const x = padding + (i / (data.length - 1)) * innerWidth;
      const y = padding + ((100 - d.productivity) / 100) * innerHeight;
      return { x, y, data: d };
    });
    const pathData = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const areaData = `${pathData} L ${points[points.length - 1].x} ${padding + innerHeight} L ${padding} ${padding + innerHeight} Z`;
    return (
      <div className="backdrop-blur-md bg-white/40 border border-white/60 shadow-sm rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700">📈</span>
          <div className="text-lg font-semibold text-gray-700">Daily Productivity Trends</div>
          <div className="ml-auto text-sm text-gray-500">Last {data.length} days</div>
        </div>
        <div className="relative">
          <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="overflow-visible">
            {[0, 25, 50, 75, 100].map((value) => {
              const y = padding + ((100 - value) / 100) * innerHeight;
              return (
                <g key={value}>
                  <line x1={padding} y1={y} x2={padding + innerWidth} y2={y} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="2,2" />
                  <text x={padding - 10} y={y + 4} textAnchor="end" className="text-xs fill-gray-500">{value}%</text>
                </g>
              );
            })}
            <path d={areaData} fill="url(#productivityGradient)" opacity="0.3" />
            <path d={pathData} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            {points.map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r="4" fill="#10b981" stroke="#fff" strokeWidth="2" className="hover:r-6 transition-all cursor-pointer">
                  <title>{new Date(p.data.date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}{"\n"}Productivity: {p.data.productivity}%{"\n"}Productive Time: {p.data.productiveTimeFormatted}{"\n"}Total Time: {p.data.totalTimeFormatted}</title>
                </circle>
              </g>
            ))}
            <defs>
              <linearGradient id="productivityGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-emerald-600">{Math.round(avgProductivity)}%</div>
            <div className="text-xs text-gray-500">Average</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">{Math.round(maxProductivity)}%</div>
            <div className="text-xs text-gray-500">Best Day</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-600">Range 7 days</div>
            <div className="text-xs text-gray-500">Window</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-[1440px] bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 m-auto p-6 min-h-screen">
      <div className="mb-4">
        <h1 className="text-3xl md:text-4xl text-gray-800 drop-shadow-sm font-display font-bold">
          Overall Stats
        </h1>
      </div>
      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : (
        (() => {
          const s = status?.overallStats || {};
          const StatCard = ({ bgFrom, bgTo, icon, title, value }) => (
            <div className={`rounded-xl border bg-gradient-to-br ${bgFrom} ${bgTo} py-4 px-4 shadow-sm hover:shadow-lg transition-all duration-300 backdrop-blur-sm bg-white/60 border-white/60`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white/80 text-gray-700 shadow-sm">
                  {icon}
                </span>
                <p className="font-semibold text-gray-700">{title}</p>
              </div>
              <p className="text-2xl font-bold text-gray-800 tabular-nums">{value}</p>
            </div>
          );
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              <StatCard
                bgFrom="from-indigo-50"
                bgTo="to-indigo-100"
                icon={<span>📅</span>}
                title="Total Days Worked"
                value={(s.totalDaysWorked || 0).toLocaleString()}
              />
              <StatCard
                bgFrom="from-green-50"
                bgTo="to-green-100"
                icon={<span>⏱️</span>}
                title="Total Work Time"
                value={fmt(minToMs(s.totalWorkTime || 0))}
              />
              <StatCard
                bgFrom="from-amber-50"
                bgTo="to-amber-100"
                icon={<span>☕</span>}
                title="Total Break Time"
                value={fmt(minToMs(s.totalBreakTime || 0))}
              />
              <StatCard
                bgFrom="from-sky-50"
                bgTo="to-sky-100"
                icon={<span>🛌</span>}
                title="Total Idle Time"
                value={fmt(minToMs(s.totalIdleTime || 0))}
              />
              <StatCard
                bgFrom="from-emerald-50"
                bgTo="to-emerald-100"
                icon={<span>✅</span>}
                title="Total Productive Time"
                value={fmt(minToMs(s.totalProductiveTime || 0))}
              />
            </div>
          );
        })()
      )}
    </div>
  );
}


