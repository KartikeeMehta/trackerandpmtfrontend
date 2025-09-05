import React, { useEffect, useMemo, useRef, useState } from "react";
import { api_url } from "@/api/Api";
import { apiHandler } from "@/api/ApiHandler";



export default function TrackerPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


  const [status, setStatus] = useState(null);
  const [breaksData, setBreaksData] = useState({ date: '', breaks: [], totals: { count: 0, totalMinutes: 0, totalHMS: '00:00:00' } });
  const [selectedDate, setSelectedDate] = useState('');
  const [dateSummary, setDateSummary] = useState(null);
  const tickRef = useRef(null);

  const minToMs = (min) => Math.max(0, Number(min) || 0) * 60 * 1000;
  const formatIST = (dateLike) => {
    try {
      if (!dateLike) return '—';
      const d = new Date(dateLike);
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour12: true,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(d);
    } catch {
      return '—';
    }
  };

  const formatISTDate = (dateLike) => {
    try {
      if (!dateLike) return '—';
      const d = new Date(dateLike);
      
      // Extract only time from the timestamp without timezone conversion
      const time = new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZone: 'UTC'
      }).format(d);
      
      return time;
    } catch {
      return '—';
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
      const res = await apiHandler.GetApi(`${api_url.BASE_URL}/employee-tracker/status`, token);
      if (res?.success) { setStatus(res.status || null); setError(""); }
      else { setError(res?.message || "Failed to load tracker status"); }
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
      const qs = dateStr ? `?date=${encodeURIComponent(dateStr)}` : '';
      const res = await apiHandler.GetApi(`${api_url.BASE_URL}/employee-tracker/breaks${qs}`, token);
      if (res?.success) {
        setBreaksData({ date: res.date, breaks: res.breaks || [], totals: res.totals || { count: 0, totalMinutes: 0, totalHMS: '00:00:00' } });
      }
      } catch {}
    };


  const fetchDailySummary = async (dateStr) => {
    try {
      const token = localStorage.getItem("token");
      const qs = dateStr ? `?date=${encodeURIComponent(dateStr)}` : '';
      const res = await apiHandler.GetApi(`${api_url.BASE_URL}/employee-tracker/daily-summary${qs}`, token);
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
    fetchStatus(true); // Initial load with loading state
    const poll = setInterval(() => fetchStatus(false), 15000); // Subsequent loads without loading state
    return () => clearInterval(poll);
  }, []);

  useEffect(() => {
    const date = status?.todaySummary?.date || new Date().toISOString().slice(0,10);
    setSelectedDate(date);
    fetchDailySummary(date);
    fetchBreaks(date);
  }, [status?.todaySummary?.date]);

  // Also fetch breaks for the IST date (next day) if the current date doesn't have breaks
  useEffect(() => {
    if (selectedDate && breaksData.breaks.length === 0) {
      // Try the next day in IST (since breaks might be stored as next day in IST)
      const nextDay = new Date(selectedDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = nextDay.toISOString().slice(0, 10);
      console.log('No breaks found for', selectedDate, ', trying next day:', nextDayStr);
      fetchBreaks(nextDayStr);
    }
  }, [selectedDate, breaksData.breaks.length]);

  useEffect(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [status?.currentSession?.isActive]);

  const cards = useMemo(() => {
    const day = status?.formatted?.todaySummary || {};
    const raw = status?.todaySummary || {};
    // Use only persisted values; no live accumulation
    const totalMs = day?.totalWorkTimeHMS ? 0 : minToMs(raw.totalWorkTime || 0);
    const breakMs = day?.totalBreakTimeHMS ? 0 : minToMs(raw.totalBreakTime || 0);
    const idleMs = day?.totalIdleTimeHMS ? 0 : minToMs(raw.totalIdleTime || 0);
    const productiveMs = day?.totalProductiveTimeHMS ? 0 : minToMs(raw.totalProductiveTime || 0);
    const activity = Number.isFinite(raw.averageActivityPercentage) ? Math.round(raw.averageActivityPercentage) : (totalMs > 0 ? Math.round((productiveMs / totalMs) * 100) : 0);
    return { totalMs, productiveMs, idleMs, breakMs, activity };
  }, [status]);

  const activeBreak = useMemo(() => {
    const cur = status?.currentSession;
    if (!cur) return null;
    return (cur.breaks || []).find((b) => b && b.isActive) || null;
  }, [status]);

  // Build today's break list from database only (no live integration)
  const allBreaks = useMemo(() => {
    const sessions = Array.isArray(status?.workSessions) ? status.workSessions : [];
    const curBreaks = Array.isArray(status?.currentSession?.breaks) ? status.currentSession.breaks : [];
    const list = [
      ...sessions.flatMap((s) => Array.isArray(s?.breaks) ? s.breaks : []),
      ...curBreaks,
    ];
    return list.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [status]);

  // Calculate daily productivity trends for the last 7 days
  const dailyProductivityData = useMemo(() => {
    if (!status?.workSessions || !Array.isArray(status.workSessions)) {
      return [];
    }

    // Get the last 7 days
    const today = new Date();
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      last7Days.push(date.toISOString().slice(0, 10));
    }

    // Process each day's data
    return last7Days.map(date => {
      // Find sessions for this date
      const daySessions = status.workSessions.filter(session => {
        const sessionDate = new Date(session.startTime).toISOString().slice(0, 10);
        return sessionDate === date;
      });

      if (daySessions.length === 0) {
        return {
          date,
          productivity: 0,
          productiveTime: 0,
          totalTime: 0,
          productiveTimeFormatted: '0h 0m',
          totalTimeFormatted: '0h 0m'
        };
      }

      // Calculate totals for the day
      let totalProductiveTime = 0;
      let totalWorkTime = 0;

      daySessions.forEach(session => {
        // Convert minutes to milliseconds
        const productiveMs = minToMs(session.totalProductiveTime || 0);
        const workMs = minToMs(session.totalWorkTime || 0);
        
        totalProductiveTime += productiveMs;
        totalWorkTime += workMs;
      });

      // Calculate productivity percentage
      const productivity = totalWorkTime > 0 ? (totalProductiveTime / totalWorkTime) * 100 : 0;

      return {
        date,
        productivity: Math.round(productivity),
        productiveTime: totalProductiveTime,
        totalTime: totalWorkTime,
        productiveTimeFormatted: fmt(totalProductiveTime),
        totalTimeFormatted: fmt(totalWorkTime)
      };
    });
  }, [status?.workSessions]);

  // Static datasets (temporary until APIs are finalized)
  const staticDailyProductivity = useMemo(() => (
    [
      { date: new Date(Date.now()-6*24*60*60*1000).toISOString(), productivity: 62, productiveTime: 5*3600000+15*60000, totalTime: 8*3600000, productiveTimeFormatted: fmt(5*3600000+15*60000), totalTimeFormatted: fmt(8*3600000) },
      { date: new Date(Date.now()-5*24*60*60*1000).toISOString(), productivity: 74, productiveTime: 6*3600000, totalTime: 8*3600000, productiveTimeFormatted: fmt(6*3600000), totalTimeFormatted: fmt(8*3600000) },
      { date: new Date(Date.now()-4*24*60*60*1000).toISOString(), productivity: 68, productiveTime: 5*3600000+30*60000, totalTime: 8*3600000, productiveTimeFormatted: fmt(5*3600000+30*60000), totalTimeFormatted: fmt(8*3600000) },
      { date: new Date(Date.now()-3*24*60*60*1000).toISOString(), productivity: 81, productiveTime: 6*3600000+30*60000, totalTime: 8*3600000, productiveTimeFormatted: fmt(6*3600000+30*60000), totalTimeFormatted: fmt(8*3600000) },
      { date: new Date(Date.now()-2*24*60*60*1000).toISOString(), productivity: 70, productiveTime: 5*3600000+36*60000, totalTime: 8*3600000, productiveTimeFormatted: fmt(5*3600000+36*60000), totalTimeFormatted: fmt(8*3600000) },
      { date: new Date(Date.now()-1*24*60*60*1000).toISOString(), productivity: 77, productiveTime: 6*3600000+10*60000, totalTime: 8*3600000, productiveTimeFormatted: fmt(6*3600000+10*60000), totalTimeFormatted: fmt(8*3600000) },
      { date: new Date().toISOString(), productivity: 72, productiveTime: 5*3600000+45*60000, totalTime: 8*3600000, productiveTimeFormatted: fmt(5*3600000+45*60000), totalTimeFormatted: fmt(8*3600000) }
    ]
  ), []);

  const staticHourlyHeatmap = useMemo(() => {
    // minutes of productive time per hour (0-23) averaged over recent days
    // keys 0..6 => Sun..Sat
    return {
      1: { 9: 42, 10: 48, 11: 40, 12: 20, 13: 18, 14: 35, 15: 38, 16: 25 },
      2: { 9: 45, 10: 50, 11: 46, 12: 22, 13: 20, 14: 36, 15: 40, 16: 28 },
      3: { 9: 30, 10: 44, 11: 50, 12: 18, 13: 15, 14: 34, 15: 42, 16: 30 },
      4: { 9: 35, 10: 46, 11: 48, 12: 16, 13: 18, 14: 37, 15: 41, 16: 29 },
      5: { 9: 25, 10: 40, 11: 45, 12: 15, 13: 14, 14: 30, 15: 36, 16: 20 }
    };
  }, []);

  const staticBreakPattern = useMemo(() => (
    [
      { date: new Date(Date.now()-6*24*60*60*1000).toISOString().slice(0,10), shortMin: 12, regularMin: 20, lunchMin: 45, longMin: 0 },
      { date: new Date(Date.now()-5*24*60*60*1000).toISOString().slice(0,10), shortMin: 10, regularMin: 18, lunchMin: 40, longMin: 0 },
      { date: new Date(Date.now()-4*24*60*60*1000).toISOString().slice(0,10), shortMin: 8,  regularMin: 15, lunchMin: 50, longMin: 0 },
      { date: new Date(Date.now()-3*24*60*60*1000).toISOString().slice(0,10), shortMin: 14, regularMin: 12, lunchMin: 40, longMin: 0 },
      { date: new Date(Date.now()-2*24*60*60*1000).toISOString().slice(0,10), shortMin: 9,  regularMin: 16, lunchMin: 45, longMin: 0 },
      { date: new Date(Date.now()-1*24*60*60*1000).toISOString().slice(0,10), shortMin: 11, regularMin: 12, lunchMin: 42, longMin: 0 },
      { date: new Date().toISOString().slice(0,10),                                   shortMin: 10, regularMin: 14, lunchMin: 40, longMin: 0 }
    ]
  ), []);

  const Heatmap = ({ data }) => {
    const weekdays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const hours = Array.from({length:24}, (_,h)=>h);
    const max = 60; // minutes per hour cap
    const colorFor = (v) => {
      const x = Math.max(0, Math.min(max, v||0)) / max;
      // interpolate from gray-100 to emerald-600
      const alpha = 0.15 + x * 0.85;
      return `rgba(16,185,129,${alpha.toFixed(2)})`;
    };
    return (
      <div className="backdrop-blur-md bg-white/40 border border-white/60 shadow-sm rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700">⏳</span>
          <div className="text-lg font-semibold text-gray-700">Hourly Productive Heatmap</div>
        </div>
        <div className="overflow-auto">
          <div className="min-w-[720px]">
            <div className="grid grid-cols-[80px_repeat(24,1fr)] gap-1">
              <div></div>
              {hours.map(h => (
                <div key={`h-${h}`} className="text-[10px] text-gray-500 text-center">{h}</div>
              ))}
              {weekdays.map((w, idx) => (
                <React.Fragment key={w}>
                  <div className="text-xs text-gray-600 flex items-center justify-end pr-2">{w}</div>
                  {hours.map(h => (
                    <div key={`${idx}-${h}`} className="h-6 rounded" style={{background: colorFor(data[idx]?.[h])}} title={`${w} ${h}:00 — ${(data[idx]?.[h]||0)} productive min`} />
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const BreakPatternCard = ({ days }) => {
    const colors = { short:'#60a5fa', regular:'#34d399', lunch:'#f59e0b', long:'#ef4444' };
    return (
      <div className="backdrop-blur-md bg-white/40 border border-white/60 shadow-sm rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-sky-100 text-sky-700">☕</span>
          <div className="text-lg font-semibold text-gray-700">Break Pattern Analysis</div>
        </div>
        <div className="space-y-3">
          {days.map((d) => {
            const total = d.shortMin + d.regularMin + d.lunchMin + d.longMin || 1;
            return (
              <div key={d.date} className="flex items-center gap-3">
                <div className="w-20 text-xs text-gray-500">{new Date(d.date).toLocaleDateString('en-US',{weekday:'short'})}</div>
                <div className="flex-1 h-3 rounded bg-gray-100 overflow-hidden flex">
                  <div style={{width:`${(d.shortMin/total)*100}%`, background:colors.short}} />
                  <div style={{width:`${(d.regularMin/total)*100}%`, background:colors.regular}} />
                  <div style={{width:`${(d.lunchMin/total)*100}%`, background:colors.lunch}} />
                  {d.longMin>0 && (<div style={{width:`${(d.longMin/total)*100}%`, background:colors.long}} />)}
                </div>
                <div className="w-20 text-right text-xs text-gray-600">{total}m</div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded" style={{background:colors.short}}></span>Short</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded" style={{background:colors.regular}}></span>Regular</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded" style={{background:colors.lunch}}></span>Lunch</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded" style={{background:colors.long}}></span>Long</div>
        </div>
      </div>
    );
  };

  // ===== Idle Visualizations (static) =====
  const staticIdleTrend = useMemo(() => (
    [
      { date: new Date(Date.now()-6*24*60*60*1000).toISOString().slice(0,10), idleMin: 40 },
      { date: new Date(Date.now()-5*24*60*60*1000).toISOString().slice(0,10), idleMin: 55 },
      { date: new Date(Date.now()-4*24*60*60*1000).toISOString().slice(0,10), idleMin: 30 },
      { date: new Date(Date.now()-3*24*60*60*1000).toISOString().slice(0,10), idleMin: 60 },
      { date: new Date(Date.now()-2*24*60*60*1000).toISOString().slice(0,10), idleMin: 35 },
      { date: new Date(Date.now()-1*24*60*60*1000).toISOString().slice(0,10), idleMin: 45 },
      { date: new Date().toISOString().slice(0,10),                                   idleMin: 50 }
    ]
  ), []);
  

  

  const IdleTrend = ({ days }) => {
    const chartHeight = 160;
    const chartWidth = 420;
    const padding = 32;
    const innerWidth = chartWidth - (padding * 2);
    const innerHeight = chartHeight - (padding * 2);
    const max = Math.max(60, ...days.map(d=>d.idleMin));
    const points = days.map((d, i) => {
      const x = padding + (i / (days.length - 1)) * innerWidth;
      const y = padding + (1 - (d.idleMin / max)) * innerHeight;
      return { x, y, d };
    });
    const path = points.map((p,i)=>`${i===0?'M':'L'} ${p.x} ${p.y}`).join(' ');
    const area = `${path} L ${points[points.length-1].x} ${padding+innerHeight} L ${padding} ${padding+innerHeight} Z`;
    return (
      <div className="backdrop-blur-md bg-white/40 border border-white/60 shadow-sm rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 text-gray-700">🧭</span>
          <div className="text-lg font-semibold text-gray-700">Idle Trend (7 days)</div>
        </div>
        <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="overflow-visible">
          {[0, 20, 40, 60].map(v => {
            const y = padding + (1 - (v / max)) * innerHeight;
            return (
              <g key={v}>
                <line x1={padding} y1={y} x2={padding+innerWidth} y2={y} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="2,2" />
                <text x={padding-8} y={y+4} textAnchor="end" className="text-[10px] fill-gray-500">{v}m</text>
              </g>
            );
          })}
          <path d={area} fill="#6b7280" opacity="0.12" />
          <path d={path} fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" />
          {points.map((p,i)=> (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="3.5" fill="#6b7280" stroke="#fff" strokeWidth="1.5">
                <title>{new Date(p.d.date).toLocaleDateString()}\nIdle: {p.d.idleMin} min</title>
              </circle>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  // Input Intensity Sparkline (static)
  const staticInputIntensity = useMemo(() => (
    [
      { date: new Date(Date.now()-6*24*60*60*1000).toISOString().slice(0,10), keystrokes: 4200, clicks: 850, activeMin: 360 },
      { date: new Date(Date.now()-5*24*60*60*1000).toISOString().slice(0,10), keystrokes: 4800, clicks: 900, activeMin: 380 },
      { date: new Date(Date.now()-4*24*60*60*1000).toISOString().slice(0,10), keystrokes: 3900, clicks: 820, activeMin: 340 },
      { date: new Date(Date.now()-3*24*60*60*1000).toISOString().slice(0,10), keystrokes: 5200, clicks: 1000, activeMin: 400 },
      { date: new Date(Date.now()-2*24*60*60*1000).toISOString().slice(0,10), keystrokes: 4500, clicks: 880, activeMin: 360 },
      { date: new Date(Date.now()-1*24*60*60*1000).toISOString().slice(0,10), keystrokes: 4700, clicks: 910, activeMin: 370 },
      { date: new Date().toISOString().slice(0,10),                                   keystrokes: 5100, clicks: 980, activeMin: 390 }
    ]
  ), []);

  const InputIntensityCard = ({ days }) => {
    const totals = days.reduce((acc, d) => {
      acc.keystrokes += d.keystrokes || 0;
      acc.clicks += d.clicks || 0;
      acc.activeMin += d.activeMin || 0;
      return acc;
    }, { keystrokes: 0, clicks: 0, activeMin: 0 });
    const kpm = totals.activeMin ? totals.keystrokes / totals.activeMin : 0;
    const cpm = totals.activeMin ? totals.clicks / totals.activeMin : 0;
    const peak = days
      .map(d => ({ date: d.date, kpm: d.activeMin ? d.keystrokes / d.activeMin : 0, cpm: d.activeMin ? d.clicks / d.activeMin : 0 }))
      .reduce((best, cur) => (cur.kpm + cur.cpm) > (best.kpm + best.cpm) ? cur : best, { date: days[0]?.date, kpm: 0, cpm: 0 });
    return (
      <div className="backdrop-blur-md bg-white/40 border border-white/60 shadow-sm rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-fuchsia-100 text-fuchsia-700">⌨️</span>
          <div className="text-lg font-semibold text-gray-700">Input Intensity (7 days)</div>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="rounded-xl bg-gradient-to-br from-violet-50 to-violet-100 p-4 border border-white/60">
            <div className="text-xs text-gray-500 mb-1">Keystrokes</div>
            <div className="text-2xl font-bold text-violet-700 tabular-nums">{totals.keystrokes.toLocaleString()}</div>
            <div className="text-xs text-gray-600 mt-1">{kpm.toFixed(1)} per minute</div>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-cyan-50 to-cyan-100 p-4 border border-white/60">
            <div className="text-xs text-gray-500 mb-1">Mouse Clicks</div>
            <div className="text-2xl font-bold text-cyan-700 tabular-nums">{totals.clicks.toLocaleString()}</div>
            <div className="text-xs text-gray-600 mt-1">{cpm.toFixed(1)} per minute</div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-gray-700">
          <span className="px-2 py-1 rounded-full bg-gray-100">Active time: {totals.activeMin} min</span>
          <span className="px-2 py-1 rounded-full bg-violet-100 text-violet-700">Peak day: {new Date(peak.date).toLocaleDateString('en-US', { weekday: 'short' })}</span>
          <span className="px-2 py-1 rounded-full bg-violet-50 text-violet-700">Keystrokes: {peak.kpm.toFixed(1)}/min</span>
          <span className="px-2 py-1 rounded-full bg-cyan-50 text-cyan-700">Clicks: {peak.cpm.toFixed(1)}/min</span>
        </div>
      </div>
    );
  };

  const Donut = ({ data }) => {
    const total = Object.values(data).reduce((a, b) => a + b, 0) || 1;


    const colors = ['#22c55e', '#f59e0b', '#3b82f6'];
    const keys = Object.keys(data);
    let acc = 0;
    return (


      <svg viewBox="0 0 42 42" className="w-44 h-44">
        <circle cx="21" cy="21" r="15.9155" fill="#fff" stroke="#E5E7EB" strokeWidth="6" />
        {keys.map((k, i) => {
          const val = data[k];
          const frac = val / total;
          const dash = `${(frac * 100).toFixed(2)} ${((1 - frac) * 100).toFixed(2)}`;
          const rot = `rotate(${(acc * 360) - 90} 21 21)`; acc += frac;
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

  // Daily Productivity Trends Chart Component
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

    const maxProductivity = Math.max(...data.map(d => d.productivity));
    const minProductivity = Math.min(...data.map(d => d.productivity));
    const avgProductivity = data.reduce((sum, d) => sum + d.productivity, 0) / data.length;
    
    // Calculate trend
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    const firstAvg = firstHalf.reduce((sum, d) => sum + d.productivity, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.productivity, 0) / secondHalf.length;
    const trend = secondAvg - firstAvg;
    const trendText = trend > 2 ? `Trending up ${Math.round(trend)}%` : trend < -2 ? `Trending down ${Math.round(Math.abs(trend))}%` : 'Stable';

    const chartHeight = 200;
    const chartWidth = 400;
    const padding = 40;
    const innerWidth = chartWidth - (padding * 2);
    const innerHeight = chartHeight - (padding * 2);

    const points = data.map((d, i) => {
      const x = padding + (i / (data.length - 1)) * innerWidth;
      const y = padding + ((100 - d.productivity) / 100) * innerHeight;
      return { x, y, data: d };
    });

    const pathData = points.map((point, i) => 
      `${i === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    ).join(' ');

    const areaData = `${pathData} L ${points[points.length - 1].x} ${padding + innerHeight} L ${padding} ${padding + innerHeight} Z`;

    return (
      <div className="backdrop-blur-md bg-white/40 border border-white/60 shadow-sm rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700">📈</span>
          <div className="text-lg font-semibold text-gray-700">Daily Productivity Trends</div>
          <div className="ml-auto text-sm text-gray-500">
            Last {data.length} days
          </div>
        </div>
        
        <div className="relative">
          <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="overflow-visible">
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map(value => {
              const y = padding + ((100 - value) / 100) * innerHeight;
              return (
                <g key={value}>
                  <line
                    x1={padding}
                    y1={y}
                    x2={padding + innerWidth}
                    y2={y}
                    stroke="#e5e7eb"
                    strokeWidth="1"
                    strokeDasharray="2,2"
                  />
                  <text
                    x={padding - 10}
                    y={y + 4}
                    textAnchor="end"
                    className="text-xs fill-gray-500"
                  >
                    {value}%
                  </text>
                </g>
              );
            })}

            {/* Area fill */}
            <path
              d={areaData}
              fill="url(#productivityGradient)"
              opacity="0.3"
            />

            {/* Line */}
            <path
              d={pathData}
              fill="none"
              stroke="#10b981"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data points */}
            {points.map((point, i) => (
              <g key={i}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="4"
                  fill="#10b981"
                  stroke="#fff"
                  strokeWidth="2"
                  className="hover:r-6 transition-all cursor-pointer"
                >
                  <title>
                    {new Date(point.data.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                    {'\n'}Productivity: {point.data.productivity}%
                    {'\n'}Productive Time: {point.data.productiveTimeFormatted}
                    {'\n'}Total Time: {point.data.totalTimeFormatted}
                  </title>
                </circle>
                <text
                  x={point.x}
                  y={padding + innerHeight + 20}
                  textAnchor="middle"
                  className="text-xs fill-gray-500"
                >
                  {new Date(point.data.date).toLocaleDateString('en-US', { weekday: 'short' })}
                </text>
              </g>
            ))}

            {/* Gradient definition */}
            <defs>
              <linearGradient id="productivityGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.3"/>
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.05"/>
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Stats */}
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
            <div className={`text-2xl font-bold ${trend > 2 ? 'text-green-600' : trend < -2 ? 'text-red-600' : 'text-gray-600'}`}>
              {trend > 0 ? '+' : ''}{Math.round(trend)}%
            </div>
            <div className="text-xs text-gray-500">Trend</div>
          </div>
        </div>
      </div>
    );
  };



  return (
    <div className="max-w-[1440px] bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 m-auto p-6 min-h-screen">
      {/* Header Section */}
      <div className="relative mb-8">
        <div className="backdrop-blur-md bg-white/40 border border-white/60 shadow-sm rounded-xl px-6 py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl text-gray-800 drop-shadow-sm font-display font-bold">
                Time Tracker
              </h1>
              <p className="text-base text-gray-700/80 mt-1">
                Track your productivity and work sessions for {selectedDate}
              </p>
            </div>
            
            <div className="flex flex-col items-end gap-3">
              {/* Auto-refresh notice moved here above date picker */}
              <div className="inline-flex items-center gap-2 text-sm text-emerald-800 bg-gradient-to-r from-emerald-50 to-emerald-100/70 border border-emerald-200 rounded-full px-4 py-2 shadow-md ring-1 ring-emerald-200/60">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700">⟳</span>
                <span className="font-semibold">Dashboard data auto-refreshes every 5 minutes</span>
              </div>
              <div className="relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
                <div className="relative bg-white/80 backdrop-blur-sm rounded-xl border border-white/60 shadow-lg hover:shadow-xl transition-all duration-200">
                  <input
                    type="date"
                    className="w-full px-4 py-3 text-sm font-medium text-gray-700 bg-transparent border-0 rounded-xl focus:outline-none focus:ring-0 cursor-pointer"
                    value={selectedDate}
                    onChange={(e) => { const d = e.target.value; setSelectedDate(d); fetchDailySummary(d); fetchBreaks(d); }}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>
              {error && (
                <div className="px-4 py-3 rounded-xl bg-gradient-to-r from-red-50 to-pink-50 text-red-700 text-sm border border-red-200 shadow-lg backdrop-blur-sm">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="h-px mt-3 bg-gradient-to-r from-transparent via-indigo-300/50 to-transparent"></div>
      </div>



      {loading ? (


        <div className="text-sm text-gray-500">Loading tracker…</div>
      ) : (
        <>


          {(() => {
            const todayStr = new Date().toISOString().slice(0,10);
            const isFuture = selectedDate && selectedDate > todayStr;
            if (isFuture) {
              return <div className="rounded-xl border bg-white p-6 shadow-sm text-sm text-gray-500">No data available yet for this future date.</div>;
            }
            if (!dateSummary) {
              return <div className="rounded-xl border bg-white p-6 shadow-sm text-sm text-gray-500">No data available for this date.</div>;
            }
            return (
              <>
                {/* Summary Cards */}
                <div className="flex flex-wrap xl:gap-6 gap-6 2xl:justify-between justify-start mb-8">
            <div className="flex border rounded bg-gradient-to-br from-blue-50 to-blue-100 py-4 px-4 w-full sm:w-[48%] md:w-[31%] xl:w-[18%] shadow-sm hover:shadow-lg transition-all duration-300 backdrop-blur-sm bg-white/60 border-white/60">
              <div className="w-full">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-700">⏱️</span>
                  <p className="font-semibold text-gray-700">Total Time</p>
                </div>
                <p className="text-2xl font-bold text-gray-800 tabular-nums">{fmt(cards.totalMs)}</p>
              </div>
            </div>

            <div className="flex border rounded bg-gradient-to-br from-green-50 to-green-100 py-4 px-4 w-full sm:w-[48%] md:w-[31%] xl:w-[18%] shadow-sm hover:shadow-lg transition-all duration-300 backdrop-blur-sm bg-white/60 border-white/60">
              <div className="w-full">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 text-green-700">✅</span>
                  <p className="font-semibold text-gray-700">Productive</p>
                </div>
                <p className="text-2xl font-bold text-gray-800 tabular-nums">{fmt(cards.productiveMs)}</p>
              </div>
            </div>

            <div className="flex border rounded bg-gradient-to-br from-amber-50 to-amber-100 py-4 px-4 w-full sm:w-[48%] md:w-[31%] xl:w-[18%] shadow-sm hover:shadow-lg transition-all duration-300 backdrop-blur-sm bg-white/60 border-white/60">
              <div className="w-full">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 text-amber-700">🛌</span>
                  <p className="font-semibold text-gray-700">Idle Time</p>
                </div>
                <p className="text-2xl font-bold text-gray-800 tabular-nums">{fmt(cards.idleMs)}</p>
              </div>
            </div>

            <div className="flex border rounded bg-gradient-to-br from-sky-50 to-sky-100 py-4 px-4 w-full sm:w-[48%] md:w-[31%] xl:w-[18%] shadow-sm hover:shadow-lg transition-all duration-300 backdrop-blur-sm bg-white/60 border-white/60">
              <div className="w-full">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-sky-100 text-sky-700">☕</span>
                  <p className="font-semibold text-gray-700">Breaks</p>
                </div>
                <p className="text-2xl font-bold text-gray-800 tabular-nums">{fmt(cards.breakMs)}</p>
              </div>
            </div>

            <div className="flex border rounded bg-gradient-to-br from-indigo-50 to-indigo-100 py-4 px-4 w-full sm:w-[48%] md:w-[31%] xl:w-[18%] shadow-sm hover:shadow-lg transition-all duration-300 backdrop-blur-sm bg-white/60 border-white/60">
              <div className="w-full">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700">📈</span>
                  <p className="font-semibold text-gray-700">Activity</p>
                </div>
                <p className="text-2xl font-bold text-gray-800">{cards.activity}%</p>
              </div>
            </div>
          </div>
              </>
            );
          })()}


          {/* Static Analytics Cards Above Trends */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
            <ProductivityTrends data={staticDailyProductivity} />
            <BreakPatternCard days={staticBreakPattern} />
          </div>

          {/* Idle Overview */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
            <InputIntensityCard days={staticInputIntensity} />
            <IdleTrend days={staticIdleTrend} />
          </div>

          {/* Hourly Productive Heatmap (Static for now) */}
          <div className="mb-8">
            <Heatmap data={staticHourlyHeatmap} />
          </div>

          {/* Analytics and Session Panels */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
            {/* Distribution Chart */}
            <div className="backdrop-blur-md bg-white/40 border border-white/60 shadow-sm rounded-xl p-6 flex items-center gap-6">
              <Donut data={{ productive: cards.productiveMs, idle: cards.idleMs, breaks: cards.breakMs }} />
              <div className="text-sm">
                <div className="text-gray-700 font-medium mb-3 text-lg">Time Distribution</div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full" style={{background:'#22c55e'}}></span>
                    <span className="text-gray-600 font-medium">Productive</span>
                    <span className="ml-auto px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 tabular-nums font-semibold">{fmt(cards.productiveMs)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full" style={{background:'#f59e0b'}}></span>
                    <span className="text-gray-600 font-medium">Idle</span>
                    <span className="ml-auto px-3 py-1 rounded-full bg-amber-50 text-amber-700 tabular-nums font-semibold">{fmt(cards.idleMs)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full" style={{background:'#3b82f6'}}></span>
                    <span className="text-gray-600 font-medium">Breaks</span>
                    <span className="ml-auto px-3 py-1 rounded-full bg-sky-50 text-sky-700 tabular-nums font-semibold">{fmt(cards.breakMs)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Current Session */}
            <div className="backdrop-blur-md bg-white/40 border border-white/60 shadow-sm rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700">⏰</span>
                <div className="text-lg text-gray-700 font-semibold">Current Session</div>
              </div>
              {status?.currentSession?.isActive ? (
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-base font-medium text-emerald-700">Active Session</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                  <span className="text-base text-gray-500">No Active Session</span>
                </div>
              )}
            </div>

            {/* Punch Details */}
            <div className="backdrop-blur-md bg-white/40 border border-white/60 shadow-sm rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-purple-100 text-purple-700">📋</span>
                <div className="text-lg text-gray-700 font-semibold">Punch Details</div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 font-medium">First Punch In</span>
                  <span className="text-sm font-semibold text-gray-900 tabular-nums">{formatISTDate(dateSummary?.firstPunchIn) || '—'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 font-medium">Last Punch Out</span>
                  <span className="text-sm font-semibold text-gray-900 tabular-nums">{formatISTDate(dateSummary?.lastPunchOut) || '—'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 font-medium">Breaks Taken</span>
                  <span className="text-sm font-semibold text-gray-900">{dateSummary?.breaksCount || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 font-medium">Sessions</span>
                  <span className="text-sm font-semibold text-gray-900">{dateSummary?.sessionsCount || 0}</span>
                </div>
              </div>
            </div>
          </div>



          {/* Breaks Table */}
          <div className="backdrop-blur-md bg-white/40 border border-white/60 shadow-sm rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-sky-100 text-sky-700">☕</span>
              <div className="text-lg font-semibold text-gray-700">Break History</div>
              <div className="text-sm text-gray-500 ml-auto">
                Date: {breaksData.date || (status?.todaySummary?.date || new Date().toISOString().slice(0,10))}
              </div>
            </div>

            {breaksData.breaks.length ? (
              <div className="overflow-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-gray-600 border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold">Type</th>
                      <th className="text-left py-3 px-4 font-semibold">Reason</th>
                      <th className="text-left py-3 px-4 font-semibold">Start Time</th>
                      <th className="text-left py-3 px-4 font-semibold">End Time</th>
                      <th className="text-left py-3 px-4 font-semibold">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {breaksData.breaks.map((b, idx) => (
                      <tr key={b.breakId || idx} className="border-b border-gray-100 hover:bg-white/30 transition-colors">
                        <td className="py-4 px-4">
                          <span className="px-3 py-1 rounded-full text-sm bg-sky-50 text-sky-700 border border-sky-100 font-medium capitalize">
                            {b.breakType?.replace('_',' ') || '—'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-gray-700 font-medium">{b.reason || '—'}</td>
                        <td className="py-4 px-4 tabular-nums text-gray-600 font-medium">{b.startTime || '—'}</td>
                        <td className="py-4 px-4 tabular-nums text-gray-600 font-medium">{b.endTime || (b.isActive ? 'Ongoing' : '—')}</td>
                        <td className="py-4 px-4 tabular-nums font-semibold text-gray-800">{b.durationHMS || (fmt(minToMs(b.duration || 0)))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-500 text-lg font-medium">No breaks found for this date</div>
                <div className="text-gray-400 text-sm mt-2">Take a break to see your break history here</div>
              </div>
            )}
          </div>


        </>
      )}
    </div>
  );


}