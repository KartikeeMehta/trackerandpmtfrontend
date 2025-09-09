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

  // Break Pattern Analysis (last 7 days)
  const breakPatternData = useMemo(() => {
    if (!status?.workSessions || !Array.isArray(status.workSessions)) {
      return [];
    }
    const today = new Date();
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
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
      const breakTypes = { manual: 0, tea_break: 0, lunch_break: 0, meeting_break: 0 };
      daySessions.forEach((session) => {
        if (session.breaks && Array.isArray(session.breaks)) {
          session.breaks.forEach((breakItem) => {
            const duration = breakItem.duration || 0;
            const breakType = breakItem.breakType || "manual";
            if (Object.prototype.hasOwnProperty.call(breakTypes, breakType)) {
              breakTypes[breakType] += duration;
            } else {
              breakTypes.manual += duration;
            }
          });
        }
      });
      return {
        date,
        manual: Math.round(breakTypes.manual),
        tea_break: Math.round(breakTypes.tea_break),
        lunch_break: Math.round(breakTypes.lunch_break),
        meeting_break: Math.round(breakTypes.meeting_break),
      };
    });
  }, [status?.workSessions]);

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

  // Hourly Input Intensity (avg keystrokes+clicks per hour over last 7 days)
  const hourlyInputIntensity = useMemo(() => {
    if (!Array.isArray(status?.workSessions)) return Array.from({ length: 24 }, () => 0);
    const end = selectedDate ? new Date(selectedDate) : new Date();
    const dayKeys = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(d.getDate() - i);
      const key = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(d);
      dayKeys.push(key);
    }
    const perHour = Array.from({ length: 24 }, () => 0);
    const seenDays = new Set(dayKeys);
    for (const s of status.workSessions) {
      const dKey = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(s.startTime));
      if (!seenDays.has(dKey)) continue;
      const start = new Date(s.startTime);
      const endT = new Date(s.endTime || s.startTime);
      // approximate: attribute all inputs equally to the hour of the start time
      const hourIST = Number(
        new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", hour: "2-digit", hour12: false }).format(start)
      );
      const inputs = (Number(s.totalKeystrokes) || 0) + (Number(s.totalMouseClicks) || 0);
      perHour[hourIST] += inputs;
    }
    // average per day across the 7-day window
    return perHour.map((v) => Math.round(v / 7));
  }, [status?.workSessions, selectedDate]);

  const HourlyInputIntensity = ({ data }) => {
    const width = 420;
    const height = 220;
    const cx = width / 2;
    const cy = 110;
    const maxVal = Math.max(1, ...data);
    const avgVal = data.length ? data.reduce((a, b) => a + b, 0) / data.length : 0;
    const Rmin = 28;
    const Rmax = 80;
    const step = (Math.PI * 2) / 24;
    const startAngle = -Math.PI / 2; // 0h at top
    const polar = (r, a) => ({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
    const sectorPath = (innerR, outerR, a0, a1) => {
      const p1 = polar(outerR, a0);
      const p2 = polar(outerR, a1);
      const p3 = polar(innerR, a1);
      const p4 = polar(innerR, a0);
      const large = a1 - a0 > Math.PI ? 1 : 0;
      return `M ${p1.x} ${p1.y} A ${outerR} ${outerR} 0 ${large} 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${innerR} ${innerR} 0 ${large} 0 ${p4.x} ${p4.y} Z`;
    };
    return (
      <div className="backdrop-blur-md bg-white/60 border border-white/60 shadow-sm rounded-xl px-4 pt-4 pb-3">
        <div className="flex items-center gap-3 mb-3.5">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-amber-100 text-amber-700">⚡</span>
          <div className="text-lg font-semibold text-gray-700">Hourly Input Intensity</div>
          <div className="ml-auto">
            <span className="text-xs text-gray-500">Avg per hour (last 7 days)</span>
          </div>
        </div>
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
          {/* background ring */}
          <circle cx={cx} cy={cy} r={Rmax + 10} fill="#f8fafc" />
          {/* average guide ring */}
          <circle cx={cx} cy={cy} r={Rmin + (Rmax - Rmin) * (avgVal / maxVal)} fill="none" stroke="#cbd5e1" strokeDasharray="4,3" />
          {/* hour wedges */}
          {data.map((v, i) => {
            const a0 = startAngle + i * step;
            const a1 = a0 + step * 0.9; // small gap between wedges
            const outer = Rmin + (v / maxVal) * (Rmax - Rmin);
            const d = sectorPath(Rmin, outer, a0, a1);
            return (
              <path key={i} d={d} fill="#3b82f6" opacity={0.85}>
                <title>{`${String(((i % 12)||12)).padStart(2,'0')}:00 ${i<12?'AM':'PM'} — ${v} avg inputs (last 7 days)`}</title>
              </path>
            );
          })}
          {/* cardinal labels */}
          {[{t:'12a',a:startAngle},{t:'6a',a:startAngle+6*step},{t:'12p',a:startAngle+12*step},{t:'6p',a:startAngle+18*step}].map((p,idx)=>{
            const pos = polar(Rmax + 16, p.a);
            return <text key={idx} x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="middle" className="text-xs font-semibold fill-gray-700">{p.t}</text>;
          })}
        </svg>
        <div className="mt-1 text-[11px] font-medium text-gray-600 text-right pr-1">each wedge = hour; radius encodes avg inputs over last 7 days</div>
      </div>
    );
  };

  // Calendar productivity heatmap data: current month by date -> productivity %
  const calendarProductivity = useMemo(() => {
    if (!Array.isArray(status?.workSessions)) return {};
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    // Get all days in month as YYYY-MM-DD (IST)
    const first = new Date(Date.UTC(year, month, 1));
    const nextMonth = new Date(Date.UTC(year, month + 1, 1));
    const byDate = {};
    // aggregate
    for (const s of status.workSessions) {
      try {
        const d = new Date(s.startTime);
        // only current month
        if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month) continue;
        const key = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Kolkata",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(d);
        if (!byDate[key]) byDate[key] = { prodMs: 0, workMs: 0 };
        byDate[key].prodMs += (Number(s.productiveTime) || 0) * 60 * 1000;
        byDate[key].workMs += (Number(s.duration) || 0) * 60 * 1000;
      } catch {}
    }
    // ensure keys for each day of month
    const res = {};
    for (let t = +first; t < +nextMonth; t += 24 * 60 * 60 * 1000) {
      const key = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(t));
      const agg = byDate[key] || { prodMs: 0, workMs: 0 };
      const pct = agg.workMs > 0 ? Math.round((agg.prodMs / agg.workMs) * 100) : 0;
      res[key] = pct;
    }
    return res;
  }, [status?.workSessions]);

  const CalendarHeatmap = ({ data }) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthName = now.toLocaleString("en-US", { month: "long" });
    const first = new Date(year, month, 1);
    const startWeekday = first.getDay(); // 0 Sun .. 6 Sat
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let day = 1; day <= daysInMonth; day++) cells.push(day);
    const colorFor = (pct) => {
      const x = Math.max(0, Math.min(100, pct || 0)) / 100;
      const alpha = 0.15 + x * 0.85; // from light to strong emerald
      return `rgba(16,185,129,${alpha.toFixed(2)})`;
    };
    const keyFor = (day) => new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(year, month, day));
    return (
      <div className="backdrop-blur-md bg-white/50 border border-white/60 shadow-sm rounded-xl px-3.5 pt-3.5 pb-3">
        <div className="flex items-center gap-3 mb-3.5">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700">📅</span>
          <div className="text-lg font-semibold text-gray-700">Calendar Productivity Heatmap</div>
          <div className="ml-auto text-sm text-gray-500">{monthName} {year}</div>
        </div>
        <div className="mb-2 grid grid-cols-7 text-[11px] text-gray-500">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
            <div key={d} className="text-center">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, idx) => {
            if (day === null) return <div key={`e-${idx}`} className="h-8"></div>;
            const k = keyFor(day);
            const pct = data[k] ?? 0;
            return (
              <div key={k} className="h-8 rounded relative group" style={{ background: colorFor(pct) }} title={`${k} — ${pct}% productive`}>
                <div className="absolute inset-0 flex items-center justify-center text-[11px] text-gray-700">
                  {day}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
          <span>Less</span>
          <div className="h-3 w-3 rounded" style={{ background: colorFor(5) }}></div>
          <div className="h-3 w-3 rounded" style={{ background: colorFor(25) }}></div>
          <div className="h-3 w-3 rounded" style={{ background: colorFor(50) }}></div>
          <div className="h-3 w-3 rounded" style={{ background: colorFor(75) }}></div>
          <div className="h-3 w-3 rounded" style={{ background: colorFor(100) }}></div>
          <span>More</span>
        </div>
      </div>
    );
  };

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
        <div className="backdrop-blur-md bg-white/50 border border-white/60 shadow-sm rounded-xl px-3.5 pt-3.5 pb-3">
          <div className="flex items-center gap-3 mb-3.5">
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

    // Calculate trend (difference between averages of second and first halves)
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    const firstAvg = firstHalf.length
      ? firstHalf.reduce((sum, d) => sum + d.productivity, 0) / firstHalf.length
      : 0;
    const secondAvg = secondHalf.length
      ? secondHalf.reduce((sum, d) => sum + d.productivity, 0) / secondHalf.length
      : 0;
    const trend = secondAvg - firstAvg;
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
      <div className="backdrop-blur-md bg-white/50 border border-white/60 shadow-sm rounded-xl px-3.5 pt-3.5 pb-3">
        <div className="flex items-center gap-3 mb-3.5">
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
                  <text x={padding - 10} y={y + 4} textAnchor="end" className="text-sm fill-gray-500">{value}%</text>
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
        <div className="mt-3 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-emerald-600">{Math.round(avgProductivity)}%</div>
            <div className="text-xs text-gray-500">Average</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">{Math.round(maxProductivity)}%</div>
            <div className="text-xs text-gray-500">Best Day</div>
          </div>
          <div>
            <div className={`text-2xl font-bold ${
              trend > 2 ? "text-green-600" : trend < -2 ? "text-red-600" : "text-gray-600"
            }`}>
              {trend > 0 ? "+" : ""}{Math.round(trend)}%
            </div>
            <div className="text-xs text-gray-500">Trend</div>
          </div>
        </div>
      </div>
    );
  };

  const BreakPatternCard = ({ days }) => {
    const colors = {
      manual: "#34d399",
      tea_break: "#60a5fa",
      lunch_break: "#f59e0b",
      meeting_break: "#ef4444",
    };
    return (
      <div className="backdrop-blur-md bg-white/50 border border-white/60 shadow-sm rounded-xl px-3.5 pt-3.5 pb-3">
        <div className="flex items-center gap-3 mb-3.5">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-sky-100 text-sky-700">☕</span>
          <div className="text-lg font-semibold text-gray-700">Break Pattern Analysis</div>
        </div>
        <div className="space-y-3">
          {days.map((d) => {
            const total = d.manual + d.tea_break + d.lunch_break + d.meeting_break || 1;
            return (
              <div key={d.date} className="flex items-center gap-3">
                <div className="w-20 text-sm text-gray-600">
                  {new Date(d.date).toLocaleDateString("en-US", { weekday: "short" })}
                </div>
                <div className="flex-1 h-3 rounded bg-gray-100 overflow-hidden flex">
                  <div style={{ width: `${(d.manual / total) * 100}%`, background: colors.manual }} />
                  <div style={{ width: `${(d.tea_break / total) * 100}%`, background: colors.tea_break }} />
                  <div style={{ width: `${(d.lunch_break / total) * 100}%`, background: colors.lunch_break }} />
                  {d.meeting_break > 0 && (
                    <div style={{ width: `${(d.meeting_break / total) * 100}%`, background: colors.meeting_break }} />
                  )}
                </div>
                <div className="w-20 text-right text-sm text-gray-700">{total}m</div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex gap-4 text-sm text-gray-700">
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded" style={{ background: colors.manual }}></span>Manual</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded" style={{ background: colors.tea_break }}></span>Tea Break</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded" style={{ background: colors.lunch_break }}></span>Lunch Break</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded" style={{ background: colors.meeting_break }}></span>Meeting Break</div>
        </div>
      </div>
    );
  };

  const IdleTrend = ({ days }) => {
    const chartHeight = 160;
    const chartWidth = 420;
    const padding = 32;
    const innerWidth = chartWidth - padding * 2;
    const innerHeight = chartHeight - padding * 2;
    const max = Math.max(60, ...days.map((d) => d.idleMin));
    const points = days.map((d, i) => {
      const x = padding + (i / (days.length - 1)) * innerWidth;
      const y = padding + (1 - d.idleMin / max) * innerHeight;
      return { x, y, d };
    });
    const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const area = `${path} L ${points[points.length - 1].x} ${padding + innerHeight} L ${padding} ${padding + innerHeight} Z`;
    return (
      <div className="backdrop-blur-md bg-white/50 border border-white/60 shadow-sm rounded-xl px-3.5 pt-3.5 pb-3">
        <div className="flex items-center gap-3 mb-3.5">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 text-gray-700">🧭</span>
          <div className="text-lg font-semibold text-gray-700">Idle Trend (7 days)</div>
        </div>
        <div className="pb-2">
          <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="overflow-visible">
          {[0, 20, 40, 60].map((v) => {
            const y = padding + (1 - v / max) * innerHeight;
            return (
              <g key={v}>
                <line x1={padding} y1={y} x2={padding + innerWidth} y2={y} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="2,2" />
                <text x={padding - 8} y={y + 4} textAnchor="end" className="text-xs fill-gray-500">{v}m</text>
              </g>
            );
          })}
          <path d={area} fill="#6b7280" opacity="0.12" />
          <path d={path} fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" />
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="3.5" fill="#6b7280" stroke="#fff" strokeWidth="1.5">
                <title>{new Date(p.d.date).toLocaleDateString()}\nIdle: {p.d.idleMin} min</title>
              </circle>
            </g>
          ))}
          </svg>
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
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-8">
                <StatCard bgFrom="from-indigo-50" bgTo="to-indigo-100" icon={<span>📅</span>} title="Total Days Worked" value={(s.totalDaysWorked || 0).toLocaleString()} />
                <StatCard bgFrom="from-green-50" bgTo="to-green-100" icon={<span>⏱️</span>} title="Total Work Time" value={fmt(minToMs(s.totalWorkTime || 0))} />
                <StatCard bgFrom="from-amber-50" bgTo="to-amber-100" icon={<span>☕</span>} title="Total Break Time" value={fmt(minToMs(s.totalBreakTime || 0))} />
                <StatCard bgFrom="from-sky-50" bgTo="to-sky-100" icon={<span>🛌</span>} title="Total Idle Time" value={fmt(minToMs(s.totalIdleTime || 0))} />
                <StatCard bgFrom="from-emerald-50" bgTo="to-emerald-100" icon={<span>✅</span>} title="Total Productive Time" value={fmt(minToMs(s.totalProductiveTime || 0))} />
              </div>

              {/* Placeholder cards (match tracker styles) */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
                <div className="backdrop-blur-md bg-white/50 border border-white/60 shadow-sm rounded-xl px-3.5 pt-3.5 pb-1.5 h-[200px] overflow-hidden">
                  <div className="flex items-center gap-3 mb-3.5">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-fuchsia-100 text-fuchsia-700">⌨️</span>
                    <div className="text-lg text-gray-700 font-semibold">Total Input Intensity</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl bg-gradient-to-br from-violet-50 to-violet-100 p-4 border border-white/60">
                      <div className="text-xs text-gray-500 mb-1">Keystrokes</div>
                      <div className="text-2xl font-bold text-violet-700 tabular-nums">
                        {(s.totalKeystrokes || 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {((s.totalKeystrokes || 0) && (s.totalProductiveTime || 0)) ? ((s.totalKeystrokes || 0) / (s.totalProductiveTime || 1)).toFixed(1) : (0).toFixed(1)} per minute
                      </div>
                    </div>
                    <div className="rounded-xl bg-gradient-to-br from-cyan-50 to-cyan-100 p-4 border border-white/60">
                      <div className="text-xs text-gray-500 mb-1">Mouse Clicks</div>
                      <div className="text-2xl font-bold text-cyan-700 tabular-nums">
                        {(s.totalMouseClicks || 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {((s.totalMouseClicks || 0) && (s.totalProductiveTime || 0)) ? ((s.totalMouseClicks || 0) / (s.totalProductiveTime || 1)).toFixed(1) : (0).toFixed(1)} per minute
                      </div>
                    </div>
                  </div>
                </div>
                <div className="backdrop-blur-md bg-white/50 border border-white/60 shadow-sm rounded-xl px-3.5 pt-3.5 pb-1.5 h-[200px] overflow-hidden">
                  <div className="flex items-center gap-3 mb-3.5">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700">⏰</span>
                    <div className="text-lg text-gray-700 font-semibold">Average Productivity & Work Hours</div>
                  </div>
                  {(() => {
                    const avgProd = Math.max(0, Math.min(100, Number((status?.overallStats?.averageProductivityPercentage) || 0)));
                    const avgHours = Number((status?.overallStats?.averageWorkHoursPerDay) || 0);
                    return (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 border border-white/60">
                          <div className="text-xs text-gray-500 mb-1">Avg Productivity</div>
                          <div className="text-2xl font-bold text-emerald-700 tabular-nums">{Math.round(avgProd)}%</div>
                          <div className="text-xs text-gray-600 mt-1">Last period average</div>
                        </div>
                        <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 border border-white/60">
                          <div className="text-xs text-gray-500 mb-1">Avg Hours/Day</div>
                          <div className="text-2xl font-bold text-indigo-700 tabular-nums">{avgHours.toFixed(2)}h</div>
                          <div className="text-xs text-gray-600 mt-1">Across worked days</div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
                <ProductivityTrends data={dailyProductivityData} />
                <BreakPatternCard days={breakPatternData} />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
                <IdleTrend days={idleTrendData} />
                <HourlyInputIntensity data={hourlyInputIntensity} />
              </div>

              {/* Calendar Productivity Heatmap (bottom) */}
              <div className="grid grid-cols-1 gap-6 mb-8">
                <CalendarHeatmap data={calendarProductivity} />
              </div>
            </>
          );
        })()
      )}
    </div>
  );
}


