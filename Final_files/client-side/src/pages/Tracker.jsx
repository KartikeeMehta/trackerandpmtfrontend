import React, { useEffect, useMemo, useRef, useState } from "react";
import { api_url } from "@/api/Api";
import { apiHandler } from "@/api/ApiHandler";
export default function TrackerPage() {
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
  // Force-refresh tick for Input Intensity every 15s
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
      // Extract only time from the timestamp without timezone conversion
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

  // Guard against overlapping fetches and enforce IST date normalization
  const breaksRequestRef = useRef(0);
  const toISTDate = (dateLike) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(dateLike ? new Date(dateLike) : new Date());

  const fetchBreaks = async (dateStr) => {
    try {
      const reqId = ++breaksRequestRef.current;
      const token = localStorage.getItem("token");
      const istDate = toISTDate(dateStr || new Date());
      const qs = `?date=${encodeURIComponent(istDate)}`;
      const res = await apiHandler.GetApi(
        `${api_url.employeeTrackerBreaks}${qs}`,
        token
      );

      // Drop stale responses
      if (reqId !== breaksRequestRef.current) return;

      if (res?.success) {
        setBreaksData({
          date: res.date || istDate,
          breaks: Array.isArray(res.breaks) ? res.breaks : [],
          totals: res.totals || {
            count: 0,
            totalMinutes: 0,
            totalHMS: "00:00:00",
          },
        });
      } else {
        setBreaksData({
          date: istDate,
          breaks: [],
          totals: { count: 0, totalMinutes: 0, totalHMS: "00:00:00" },
        });
      }
    } catch {
      setBreaksData({
        date: toISTDate(dateStr || new Date()),
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
    fetchStatus(true); // Initial load with loading state
    const poll = setInterval(() => fetchStatus(false), 15000); // Subsequent loads without loading state
    return () => clearInterval(poll);
  }, []);

  // Independent 15s refresh to ensure Input Intensity card updates like others
  useEffect(() => {
    const id = setInterval(() => setIntensityTick((t) => t + 1), 15000);
    return () => clearInterval(id);
  }, []);

  // Initialize selected date from IST today and also respect server-provided todaySummary
  useEffect(() => {
    const istToday = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const date = status?.todaySummary?.date || istToday;
    setSelectedDate(date);
    fetchDailySummary(date);
    fetchBreaks(date);
  }, [status?.todaySummary?.date]);

  // Auto-rollover date picker across midnight (IST) on refresh or when page stays open
  useEffect(() => {
    const id = setInterval(() => {
      const istNow = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
      if (istNow !== selectedDate) {
        setSelectedDate(istNow);
        fetchDailySummary(istNow);
        fetchBreaks(istNow);
      }
    }, 60 * 1000);
    return () => clearInterval(id);
  }, [selectedDate]);

  // Remove next-day fallback to avoid racey overwrites; stick to selected IST date

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
    // Build cards strictly from the selected date summary
    const ds = dateSummary || {};
    const totalMs = minToMs(ds.totalWorkTime || 0);
    const breakMs = minToMs(ds.totalBreakTime || 0);
    const idleMs = minToMs(ds.totalIdleTime || 0);
    const productiveMs = minToMs(ds.totalProductiveTime || 0);
    const activity =
      (ds.totalWorkTime || 0) > 0
        ? Math.round(
            ((ds.totalProductiveTime || 0) / (ds.totalWorkTime || 0)) * 100
          )
        : 0;

    return { totalMs, productiveMs, idleMs, breakMs, activity };
  }, [dateSummary]);

  const activeBreak = useMemo(() => {
    const cur = status?.currentSession;
    if (!cur) return null;
    return (cur.breaks || []).find((b) => b && b.isActive) || null;
  }, [status]);

  // Current session activity data
  const currentActivity = useMemo(() => {
    const cur = status?.currentSession;
    if (!cur) return { keystrokes: 0, mouseClicks: 0 };
    return {
      keystrokes: cur.totalKeystrokes || 0,
      mouseClicks: cur.totalMouseClicks || 0,
    };
  }, [status?.currentSession]);

  // Build today's break list from database only (no live integration)
  const allBreaks = useMemo(() => {
    const sessions = Array.isArray(status?.workSessions)
      ? status.workSessions
      : [];
    const curBreaks = Array.isArray(status?.currentSession?.breaks)
      ? status.currentSession.breaks
      : [];
    const list = [
      ...sessions.flatMap((s) => (Array.isArray(s?.breaks) ? s.breaks : [])),
      ...curBreaks,
    ];

    return list.sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  }, [status]);

  // Calculate daily productivity trends moved to Overall Stats
  const dailyProductivityData = [];

  const dynamicHourlyHeatmap = useMemo(() => {
    // Build minutes of productive time per hour (0-23) for each weekday (0..6 => Sun..Sat)
    // Approximation: distribute each session's productiveTime across the hours overlapped by the session

    const result = Array.from({ length: 7 }, () => ({})); // each entry: { [hour]: minutes }

    const IST_OFFSET_MIN = 330; // +05:30
    const toISTDate = (date) =>
      new Date(date.getTime() + IST_OFFSET_MIN * 60 * 1000);

    const getISTDayHour = (date) => {
      const d = toISTDate(date);
      // use UTC getters on shifted date to emulate IST clock
      const day = d.getUTCDay(); // 0..6 Sun..Sat
      const hour = d.getUTCHours(); // 0..23
      return { day, hour };
    };

    const minutesBetween = (a, b) =>
      Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));

    const distributeProductiveMinutes = (
      startUtc,
      endUtc,
      productiveMinutes
    ) => {
      try {
        if (!startUtc || !endUtc) return;
        const start = new Date(startUtc);
        const end = new Date(endUtc);
        if (isNaN(start) || isNaN(end)) return;
        if (end <= start) return;
        const spanMin = minutesBetween(start, end);
        if (spanMin <= 0) return;

        // Iterate hour windows in IST
        let cursor = new Date(start);
        while (cursor < end) {
          const { day, hour } = getISTDayHour(cursor);
          // end of current IST hour window
          const istCursor = toISTDate(cursor);
          const hourEndIST = new Date(
            Date.UTC(
              istCursor.getUTCFullYear(),
              istCursor.getUTCMonth(),
              istCursor.getUTCDate(),
              istCursor.getUTCHours() + 1,
              0,
              0,
              0
            )
          );
          // convert hourEnd back to UTC baseline (reverse shift)
          const hourEndUTC = new Date(
            hourEndIST.getTime() - IST_OFFSET_MIN * 60 * 1000
          );
          const windowEnd = hourEndUTC < end ? hourEndUTC : end;
          const overlapMin = minutesBetween(cursor, windowEnd);
          if (overlapMin > 0) {
            const alloc = (productiveMinutes * overlapMin) / spanMin;
            const bucket = result[day];
            bucket[hour] = (bucket[hour] || 0) + alloc;
          }
          cursor = windowEnd;
        }
      } catch {}
    };

    // Process past sessions
    const sessions = Array.isArray(status?.workSessions)
      ? status.workSessions
      : [];
    sessions.forEach((s) => {
      try {
        const start = s?.startTime ? new Date(s.startTime) : null;
        let end = null;
        if (s?.endTime) {
          end = new Date(s.endTime);
        } else if (s?.duration) {
          end = start
            ? new Date(start.getTime() + Number(s.duration) * 60000)
            : null;
        }
        const productive = Math.max(0, Number(s?.productiveTime) || 0);
        if (start && end && productive > 0) {
          distributeProductiveMinutes(start, end, productive);
        }
      } catch {}
    });

    // Include current session (live)
    try {
      const cur = status?.currentSession;
      if (cur?.startTime) {
        const start = new Date(cur.startTime);
        const end = cur?.endTime ? new Date(cur.endTime) : new Date();
        const productive = Math.max(0, Number(cur?.productiveTime) || 0);
        if (end > start && productive > 0) {
          distributeProductiveMinutes(start, end, productive);
        }
      }
    } catch {}

    // Round values to whole minutes and clamp to [0, 60]
    for (let d = 0; d < 7; d++) {
      const row = result[d];
      Object.keys(row).forEach((h) => {
        const v = Math.round(row[h]);
        row[h] = Math.max(0, Math.min(60, v));
      });
    }

    return result;
  }, [status?.workSessions, status?.currentSession]);

  // Break pattern analysis moved to Overall Stats
  const breakPatternData = [];

  const Heatmap = ({ data }) => {
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const hours = Array.from({ length: 24 }, (_, h) => h);
    const max = 60; // minutes per hour cap
    const colorFor = (v) => {
      const x = Math.max(0, Math.min(max, v || 0)) / max;
      // interpolate from gray-100 to emerald-600
      const alpha = 0.15 + x * 0.85;
      return `rgba(16,185,129,${alpha.toFixed(2)})`;
    };
    return (
      <div className="backdrop-blur-md bg-white/40 border border-white/60 shadow-sm rounded-xl pl-3.5 pr-6 pt-3.5 pb-6">
        <div className="flex items-center gap-3 mb-3.5">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700">
            ⏳
          </span>
          <div className="text-lg font-semibold text-gray-700">
            Hourly Productive Heatmap
          </div>
        </div>
        <div className="overflow-auto">
          <div className="min-w-[720px]">
            <div className="grid grid-cols-[80px_repeat(24,1fr)] gap-1">
              <div></div>
              {hours.map((h) => (
                <div
                  key={`h-${h}`}
                  className="text-[10px] text-gray-500 text-center"
                >
                  {h}
                </div>
              ))}
              {weekdays.map((w, idx) => (
                <React.Fragment key={w}>
                  <div className="text-xs text-gray-600 flex items-center justify-end pr-2">
                    {w}
                  </div>
                  {hours.map((h) => (
                    <div
                      key={`${idx}-${h}`}
                      className="h-6 rounded"
                      style={{ background: colorFor(data[idx]?.[h]) }}
                      title={`${w} ${h}:00 — ${
                        data[idx]?.[h] || 0
                      } productive min`}
                    />
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
    console.log("BreakPatternCard received days data:", days);

    const colors = {
      manual: "#34d399", // Green
      tea_break: "#60a5fa", // Blue
      lunch_break: "#f59e0b", // Orange
      meeting_break: "#ef4444", // Red
    };
    return (
      <div className="backdrop-blur-md bg-white/50 border border-white/60 shadow-sm rounded-xl px-3.5 pt-3.5 pb-1.5 min-h-[200px]">
        <div className="flex items-center gap-3 mb-3.5">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-sky-100 text-sky-700">
            ☕
          </span>
          <div className="text-lg font-semibold text-gray-700">
            Break Pattern Analysis
          </div>
        </div>
        <div className="space-y-3">
          {days.map((d) => {
            const total =
              d.manual + d.tea_break + d.lunch_break + d.meeting_break || 1;
            return (
              <div key={d.date} className="flex items-center gap-3">
                <div className="w-20 text-xs text-gray-500">
                  {new Date(d.date).toLocaleDateString("en-US", {
                    weekday: "short",
                  })}
                </div>
                <div className="flex-1 h-3 rounded bg-gray-100 overflow-hidden flex">
                  <div
                    style={{
                      width: `${(d.manual / total) * 100}%`,
                      background: colors.manual,
                    }}
                  />
                  <div
                    style={{
                      width: `${(d.tea_break / total) * 100}%`,
                      background: colors.tea_break,
                    }}
                  />
                  <div
                    style={{
                      width: `${(d.lunch_break / total) * 100}%`,
                      background: colors.lunch_break,
                    }}
                  />
                  {d.meeting_break > 0 && (
                    <div
                      style={{
                        width: `${(d.meeting_break / total) * 100}%`,
                        background: colors.meeting_break,
                      }}
                    />
                  )}
                </div>
                <div className="w-20 text-right text-xs text-gray-600">
                  {total}m
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded"
              style={{ background: colors.manual }}
            ></span>
            Manual
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded"
              style={{ background: colors.tea_break }}
            ></span>
            Tea Break
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded"
              style={{ background: colors.lunch_break }}
            ></span>
            Lunch Break
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded"
              style={{ background: colors.meeting_break }}
            ></span>
            Meeting Break
          </div>
        </div>
      </div>
    );
  };

  // ===== Idle Visualizations (dynamic) =====
  const idleTrendData = useMemo(() => {
    if (!status?.workSessions || !Array.isArray(status.workSessions)) {
      return [];
    }

    // Last 7 days (IST) ending at selectedDate
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

    // Aggregate idle minutes per day
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

      // Include current session if it belongs to this day
      try {
        const cur = status.currentSession;
        if (cur && cur.startTime) {
          const curDate = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Kolkata",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(new Date(cur.startTime));
          if (curDate === date) {
            sessionsForDay.push(cur);
          }
        }
      } catch {}

      const idleMin = sessionsForDay.reduce(
        (sum, s) => sum + (Number(s.idleTime) || 0),
        0
      );
      return { date, idleMin: Math.max(0, Math.round(idleMin)) };
    });
  }, [status?.workSessions, status?.currentSession, selectedDate]);

  // Idle Trend component moved to Overall Stats

  // Input Intensity Data (dynamic from work sessions)
  const inputIntensityData = useMemo(() => {
    if (!status?.workSessions || !Array.isArray(status.workSessions)) {
      return [];
    }

    // Compute strictly for the selected date (IST)
    const target = selectedDate
      ? selectedDate
      : new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Kolkata",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date());

    // Find sessions for the selected IST date
    const daySessions = status.workSessions.filter((session) => {
      const sessionDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(session.startTime));

      return sessionDate === target;
    });

    // Include the current active session if it belongs to the selected day (for live refresh)
    try {
      if (status.currentSession && status.currentSession.startTime) {
        const curDate = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Kolkata",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date(status.currentSession.startTime));
        if (curDate === target) {
          daySessions.push(status.currentSession);
        }
      }
    } catch {}

    // Calculate totals for the selected day
    let totalKeystrokes = 0;
    let totalMouseClicks = 0;
    let totalActiveMin = 0;

    daySessions.forEach((session) => {
      totalKeystrokes += session.totalKeystrokes || 0;
      totalMouseClicks += session.totalMouseClicks || 0;
      totalActiveMin += session.productiveTime || 0; // minutes
    });

    return [
      {
        date: target,
        keystrokes: totalKeystrokes,
        clicks: totalMouseClicks,
        activeMin: totalActiveMin,
      },
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

    const totalInputs = (totals.keystrokes || 0) + (totals.clicks || 0);
    const kPct = totalInputs
      ? Math.round((totals.keystrokes / totalInputs) * 100)
      : 0;
    const mPct = totalInputs ? 100 - kPct : 0;
    const kpm = totals.activeMin ? totals.keystrokes / totals.activeMin : 0;
    const cpm = totals.activeMin ? totals.clicks / totals.activeMin : 0;
    const peak = days

      .map((d) => ({
        date: d.date,
        kpm: d.activeMin ? d.keystrokes / d.activeMin : 0,
        cpm: d.activeMin ? d.clicks / d.activeMin : 0,
      }))

      .reduce(
        (best, cur) => (cur.kpm + cur.cpm > best.kpm + best.cpm ? cur : best),
        { date: days[0]?.date, kpm: 0, cpm: 0 }
      );

    // Compute approximate peak hour window for selected day using lastActivity/startTime
    const findPeakHourLabel = () => {
      try {
        const dayStr = selectedDate || new Date().toISOString().slice(0, 10);
        const sessions = Array.isArray(status?.workSessions)
          ? status.workSessions
          : [];
        const inDay = sessions.filter((s) => {
          const d = new Date(s.startTime);
          const ist = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Kolkata",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(d);
          return ist === dayStr;
        });
        // include current session if on selected day
        if (status?.currentSession?.startTime) {
          const curIst = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Kolkata",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(new Date(status.currentSession.startTime));
          if (curIst === dayStr) inDay.push(status.currentSession);
        }
        const counts = new Map();
        inDay.forEach((s) => {
          const stamp = s.lastActivity || s.endTime || new Date();
          const dt = new Date(stamp);
          const hour = dt.getHours();
          counts.set(hour, (counts.get(hour) || 0) + 1);
        });
        if (counts.size === 0) return null;
        let bestHour = 0;
        let bestCount = -1;
        counts.forEach((v, k) => {
          if (v > bestCount) {
            bestCount = v;
            bestHour = k;
          }
        });
        const pad = (n) => String(n).padStart(2, "0");
        const next = (bestHour + 1) % 24;
        return `${pad(bestHour)}:00–${pad(next)}:00`;
      } catch {
        return null;
      }
    };

    const peakHourLabel = findPeakHourLabel();

    return (
      <div className="backdrop-blur-md bg-white/50 border border-white/60 shadow-sm rounded-xl px-3.5 pt-3.5 pb-1.5 min-h-[200px]">
        <div className="flex items-center gap-3 mb-3.5">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-fuchsia-100 text-fuchsia-700">
            ⌨️
          </span>
          <div className="text-lg font-semibold text-gray-700">
            Input Intensity
          </div>
          
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="rounded-xl bg-gradient-to-br from-violet-50 to-violet-100 p-4 border border-white/60">
            <div className="text-base font-medium text-gray-600 mb-1">
              Keystrokes
            </div>
            <div className="text-4xl font-bold text-violet-700 tabular-nums">
              {totals.keystrokes.toLocaleString()}
            </div>

            {/* removed per-minute display as requested */}
          </div>

          <div className="rounded-xl bg-gradient-to-br from-cyan-50 to-cyan-100 p-4 border border-white/60">
            <div className="text-base font-medium text-gray-600 mb-1">
              Mouse Clicks
            </div>

            <div className="text-4xl font-bold text-cyan-700 tabular-nums">
              {totals.clicks.toLocaleString()}
            </div>

            {/* removed per-minute display as requested */}
          </div>
        </div>

        {/* keyboard vs mouse ratio chips + most active in unified style */}
        <div className="mt-3.5 text-sm text-gray-600 flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-200 shadow-sm">
            Keyboard: {kPct}%
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200 shadow-sm">
            Mouse: {mPct}%
          </span>
          {peakHourLabel && (
            <span
              className="inline-flex items-center px-3 py-1 rounded-full bg-gray-50 text-gray-700 border border-gray-200 shadow-sm"
              title={`Most active: ${peakHourLabel}`}
            >
              Most active: {peakHourLabel}
            </span>
          )}
        </div>
        {/* removed stats chips below the card as requested */}
      </div>
    );
  };

  const TimeDistributionCard = () => {
    const totalMs = (cards.productiveMs || 0) + (cards.idleMs || 0) + (cards.breakMs || 0);
    const productivePct = totalMs > 0 ? Math.round((cards.productiveMs / totalMs) * 100) : 0;
    return (
      <div className="backdrop-blur-md bg-white/50 border border-white/60 shadow-sm rounded-xl px-3.5 pt-3.5 pb-1.5 h-full min-h-[200px]">
        <div className="flex items-center gap-3 mb-3.5">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700">🕒</span>
          <div className="text-lg font-semibold text-gray-700">Time Distribution</div>
          <span className="ml-auto text-xs text-gray-500">Today</span>
        </div>
        <div className="flex items-center justify-center gap-8 mx-auto">
          <div className="relative w-40 h-40 shrink-0">
            <Donut
              size="w-40 h-40"
              data={{
                productive: cards.productiveMs,
                idle: cards.idleMs,
                breaks: cards.breakMs,
              }}
            />
          </div>
          <div className="pl-2">
            <div className="grid grid-cols-[150px_1fr] items-center gap-x-4 gap-y-4">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#22c55e" }}></span>
                <span className="text-gray-700 font-medium">Productive</span>
              </div>
              <div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 tabular-nums font-semibold text-sm shadow-sm border border-emerald-100">
                  {fmt(cards.productiveMs)}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#f59e0b" }}></span>
                <span className="text-gray-700 font-medium">Idle</span>
              </div>
              <div>
                <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 tabular-nums font-semibold text-sm shadow-sm border border-amber-100">
                  {fmt(cards.idleMs)}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#3b82f6" }}></span>
                <span className="text-gray-700 font-medium">Breaks</span>
              </div>
              <div>
                <span className="px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 tabular-nums font-semibold text-sm shadow-sm border border-sky-100">
                  {fmt(cards.breakMs)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const Donut = ({ data, size = "w-44 h-44" }) => {
    const total = Object.values(data).reduce((a, b) => a + b, 0) || 1;
    const colors = ["#22c55e", "#f59e0b", "#3b82f6"];
    const keys = Object.keys(data);
    let acc = 0;

    return (
      <svg viewBox="0 0 42 42" className={size}>
        <circle
          cx="21"
          cy="21"
          r="15.9155"
          fill="#fff"
          stroke="#E5E7EB"
          strokeWidth="6"
        />

        {keys.map((k, i) => {
          const val = data[k];
          const frac = val / total;
          const dash = `${(frac * 100).toFixed(2)} ${((1 - frac) * 100).toFixed(
            2
          )}`;
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

  // Daily Productivity Trends Chart Component
  const ProductivityTrends = ({ data }) => {
    if (!data || data.length === 0) {
      return (
        <div className="backdrop-blur-md bg-white/40 border border-white/60 shadow-sm rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700">
              📈
            </span>

            <div className="text-lg font-semibold text-gray-700">
              Daily Productivity Trends
            </div>
          </div>

          <div className="text-center py-8 text-gray-500">
            <div className="text-lg font-medium mb-2">No data available</div>

            <div className="text-sm">
              Start tracking to see your productivity trends
            </div>
          </div>
        </div>
      );
    }

    const maxProductivity = Math.max(...data.map((d) => d.productivity));
    const minProductivity = Math.min(...data.map((d) => d.productivity));
    const avgProductivity =
      data.reduce((sum, d) => sum + d.productivity, 0) / data.length;

    // Calculate trend

    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    const firstAvg =
      firstHalf.reduce((sum, d) => sum + d.productivity, 0) / firstHalf.length;

    const secondAvg =
      secondHalf.reduce((sum, d) => sum + d.productivity, 0) /
      secondHalf.length;
    const trend = secondAvg - firstAvg;

    const trendText =
      trend > 2
        ? `Trending up ${Math.round(trend)}%`
        : trend < -2
        ? `Trending down ${Math.round(Math.abs(trend))}%`
        : "Stable";

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

    const pathData = points
      .map((point, i) => `${i === 0 ? "M" : "L"} ${point.x} ${point.y}`)
      .join(" ");

    const areaData = `${pathData} L ${points[points.length - 1].x} ${
      padding + innerHeight
    } L ${padding} ${padding + innerHeight} Z`;

    return (
      <div className="backdrop-blur-md bg-white/40 border border-white/60 shadow-sm rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700">
            📈
          </span>

          <div className="text-lg font-semibold text-gray-700">
            Daily Productivity Trends
          </div>

          <div className="ml-auto text-sm text-gray-500">
            Last {data.length} days
          </div>
        </div>

        <div className="relative">
          <svg
            width="100%"
            height={chartHeight}
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="overflow-visible"
          >
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map((value) => {
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
                    {new Date(point.data.date).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                    {"\n"}Productivity: {point.data.productivity}%{"\n"}
                    Productive Time: {point.data.productiveTimeFormatted}
                    {"\n"}Total Time: {point.data.totalTimeFormatted}
                  </title>
                </circle>

                <text
                  x={point.x}
                  y={padding + innerHeight + 20}
                  textAnchor="middle"
                  className="text-xs fill-gray-500"
                >
                  {new Date(point.data.date).toLocaleDateString("en-US", {
                    weekday: "short",
                  })}
                </text>
              </g>
            ))}

            {/* Gradient definition */}

            <defs>
              <linearGradient
                id="productivityGradient"
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />

                <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Stats */}

        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-emerald-600">
              {Math.round(avgProductivity)}%
            </div>

            <div className="text-xs text-gray-500">Average</div>
          </div>

          <div>
            <div className="text-2xl font-bold text-blue-600">
              {Math.round(maxProductivity)}%
            </div>

            <div className="text-xs text-gray-500">Best Day</div>
          </div>

          <div>
            <div
              className={`text-2xl font-bold ${
                trend > 2
                  ? "text-green-600"
                  : trend < -2
                  ? "text-red-600"
                  : "text-gray-600"
              }`}
            >
              {trend > 0 ? "+" : ""}
              {Math.round(trend)}%
            </div>

            <div className="text-xs text-gray-500">Trend</div>
          </div>
        </div>
      </div>
    );
  };

  function LiveElapsed({ start }) {
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
      const id = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(id);
    }, []);
    if (!start)
      return (
        <div className="flex justify-between items-center bg-emerald-50 text-emerald-800 px-3 py-2 rounded-md">
          <span className="font-medium">Elapsed</span>
          <span className="tabular-nums">—</span>
        </div>
      );
    const ms = Math.max(0, now - new Date(start).getTime());
    const s = Math.floor(ms / 1000);
    const h = String(Math.floor(s / 3600)).padStart(2, "0");
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const sec = String(s % 60).padStart(2, "0");
    return (
      <div className="flex justify-between items-center bg-emerald-50 text-emerald-800 px-3 py-2 rounded-md">
        <span className="font-medium">Elapsed</span>
        <span className="tabular-nums">
          {h}:{m}:{sec}
        </span>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 m-auto p-6 min-h-screen">
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
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700">
                  ⟳
                </span>

                <span className="font-semibold">
                  Dashboard data auto-refreshes every 5 minutes
                </span>
              </div>

              <div className="relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
                <div className="relative bg-white/80 backdrop-blur-sm rounded-xl border border-white/60 shadow-lg hover:shadow-xl transition-all duration-200">
                  <input
                    type="date"
                    className="w-full px-4 py-3 text-sm font-medium text-gray-700 bg-transparent border-0 rounded-xl focus:outline-none focus:ring-0 cursor-pointer"
                    value={selectedDate}
                    onChange={(e) => {
                      const d = e.target.value;

                      setSelectedDate(d);

                      fetchDailySummary(d);

                      fetchBreaks(d);
                    }}
                  />

                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <svg
                      className="w-4 h-4 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
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
            const todayStr = new Date().toISOString().slice(0, 10);
            const isFuture = selectedDate && selectedDate > todayStr;
            if (isFuture) {
              return (
                <div className="rounded-xl border bg-white p-6 shadow-sm text-sm text-gray-500">
                  No data available yet for this future date.
                </div>
              );
            }

            if (!dateSummary) {
              return (
                <div className="rounded-xl border bg-white p-6 shadow-sm text-sm text-gray-500">
                  No data available for this date.
                </div>
              );
            }

            return (
              <>
                {/* Summary Cards */}
                <div className="flex flex-wrap xl:gap-6 gap-6 2xl:justify-between justify-start mb-8">
                  <div className="flex border rounded bg-gradient-to-br from-blue-50 to-blue-100 py-4 px-4 w-full sm:w-[48%] md:w-[31%] xl:w-[18%] shadow-sm hover:shadow-lg transition-all duration-300 backdrop-blur-sm bg-white/60 border-white/60">
                    <div className="w-full">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-700">
                          ⏱️
                        </span>

                        <p className="font-semibold text-gray-700">
                          Total Time
                        </p>
                      </div>

                      <p className="text-2xl font-bold text-gray-800 tabular-nums">
                        {fmt(cards.totalMs)}
                      </p>
                    </div>
                  </div>

                  <div className="flex border rounded bg-gradient-to-br from-green-50 to-green-100 py-4 px-4 w-full sm:w-[48%] md:w-[31%] xl:w-[18%] shadow-sm hover:shadow-lg transition-all duration-300 backdrop-blur-sm bg-white/60 border-white/60">
                    <div className="w-full">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 text-green-700">
                          ✅
                        </span>

                        <p className="font-semibold text-gray-700">
                          Productive
                        </p>
                      </div>

                      <p className="text-2xl font-bold text-gray-800 tabular-nums">
                        {fmt(cards.productiveMs)}
                      </p>
                    </div>
                  </div>

                  <div className="flex border rounded bg-gradient-to-br from-amber-50 to-amber-100 py-4 px-4 w-full sm:w-[48%] md:w-[31%] xl:w-[18%] shadow-sm hover:shadow-lg transition-all duration-300 backdrop-blur-sm bg-white/60 border-white/60">
                    <div className="w-full">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 text-amber-700">
                          🛌
                        </span>

                        <p className="font-semibold text-gray-700">Idle Time</p>
                      </div>

                      <p className="text-2xl font-bold text-gray-800 tabular-nums">
                        {fmt(cards.idleMs)}
                      </p>
                    </div>
                  </div>

                  <div className="flex border rounded bg-gradient-to-br from-sky-50 to-sky-100 py-4 px-4 w-full sm:w-[48%] md:w-[31%] xl:w-[18%] shadow-sm hover:shadow-lg transition-all duration-300 backdrop-blur-sm bg-white/60 border-white/60">
                    <div className="w-full">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-sky-100 text-sky-700">
                          ☕
                        </span>

                        <p className="font-semibold text-gray-700">Breaks</p>
                      </div>

                      <p className="text-2xl font-bold text-gray-800 tabular-nums">
                        {fmt(cards.breakMs)}
                      </p>
                    </div>
                  </div>

                  <div className="flex border rounded bg-gradient-to-br from-indigo-50 to-indigo-100 py-4 px-4 w-full sm:w-[48%] md:w-[31%] xl:w-[18%] shadow-sm hover:shadow-lg transition-all duration-300 backdrop-blur-sm bg-white/60 border-white/60">
                    <div className="w-full">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700">
                          📈
                        </span>

                        <p className="font-semibold text-gray-700">
                          Productivity
                        </p>
                      </div>

                      <p className="text-2xl font-bold text-gray-800">
                        {cards.activity}%
                      </p>
                    </div>
                  </div>

                  {/* Removed Keystrokes and Mouse Clicks summary cards as requested */}
                </div>
              </>
            );
          })()}

          {/* Session and Punch Details (moved above and styled like cards) */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
            {/* Current Session */}
            <div className="backdrop-blur-md bg-white/50 border border-white/60 shadow-sm rounded-xl px-3.5 pt-3.5 pb-1.5 h-[220px] overflow-hidden">
              <div className="flex items-center gap-3 mb-3.5">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700">
                  ⏰
                </span>
                <div className="text-lg text-gray-700 font-semibold">
                  Current Session
                </div>
              </div>
              {status?.currentSession?.isActive ? (
                <div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-base font-medium text-emerald-700">
                      Active Session
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between items-center bg-emerald-50 text-emerald-800 px-3 py-2 rounded-md">
                      <span className="font-medium">Started</span>
                      <span className="tabular-nums">
                        {status?.currentSession?.startTimeIST ||
                          formatISTDate(status?.currentSession?.startTime) ||
                          "—"}
                      </span>
                    </div>
                    <LiveElapsed start={status?.currentSession?.startTime} />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                  <span className="text-base text-gray-500">No Active Session</span>
                </div>
              )}
            </div>

            {/* Punch Details */}
            <div className="backdrop-blur-md bg-white/50 border border-white/60 shadow-sm rounded-xl px-3.5 pt-3.5 pb-1.5 h-[220px] overflow-hidden">
              <div className="flex items-center gap-3 mb-3.5">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-purple-100 text-purple-700">
                  📋
                </span>
                <div className="text-lg text-gray-700 font-semibold">Punch Details</div>
                </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 font-medium">First Punch In</span>
                  <span className="text-sm font-semibold text-gray-900 tabular-nums">
                    {dateSummary?.firstPunchInIST ||
                      formatISTDate(dateSummary?.firstPunchIn) ||
                      "—"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 font-medium">Last Punch Out</span>
                  <span className="text-sm font-semibold text-gray-900 tabular-nums">
                    {status?.currentSession?.isActive
                      ? "—"
                      : dateSummary?.lastPunchOutIST ||
                        formatISTDate(dateSummary?.lastPunchOut) ||
                        "—"}
                  </span>
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

          {/* Dynamic Analytics Cards moved to Overall Stats */}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
            <TimeDistributionCard />
            <InputIntensityCard days={inputIntensityData} />
          </div>

          {/* Hourly Productive Heatmap (Dynamic) */}

          <div className="mb-8">
            <Heatmap data={dynamicHourlyHeatmap} />
          </div>
          {/* Analytics and Session Panels (moved cards above) */}

          {/* Breaks Table */}

          <div className="backdrop-blur-md bg-white/50 border border-white/60 shadow-sm rounded-xl px-3.5 pt-3.5 pb-1.5">
            <div className="flex items-center gap-3 mb-3.5">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-sky-100 text-sky-700">
                ☕
              </span>

              <div className="text-lg font-semibold text-gray-700">
                Break History
              </div>

              <div className="text-sm text-gray-500 ml-auto">
                Date:{" "}
                {breaksData.date ||
                  status?.todaySummary?.date ||
                  new Date().toISOString().slice(0, 10)}
              </div>
            </div>

            {breaksData.breaks.length ? (
              <div className="overflow-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-gray-600 border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold">
                        Type
                      </th>
                      <th className="text-left py-3 px-4 font-semibold">
                        Reason
                      </th>
                      <th className="text-left py-3 px-4 font-semibold">
                        Start Time
                      </th>
                      <th className="text-left py-3 px-4 font-semibold">
                        End Time
                      </th>
                      <th className="text-left py-3 px-4 font-semibold">
                        Duration
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {breaksData.breaks.map((b, idx) => (
                      <tr
                        key={b.breakId || idx}
                        className="border-b border-gray-100 hover:bg-white/30 transition-colors"
                      >
                        <td className="py-4 px-4">
                          <span className="px-3 py-1 rounded-full text-sm bg-sky-50 text-sky-700 border border-sky-100 font-medium capitalize">
                            {b.breakType?.replace("_", " ") || "—"}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-gray-700 font-medium">
                          {b.reason || "—"}
                        </td>
                        <td className="py-4 px-4 tabular-nums text-gray-600 font-medium">
                          {b.startTime || "—"}
                        </td>
                        <td className="py-4 px-4 tabular-nums text-gray-600 font-medium">
                          {b.endTime || (b.isActive ? "Ongoing" : "—")}
                        </td>
                        <td className="py-4 px-4 tabular-nums font-semibold text-gray-800">
                          {b.durationHMS || fmt(minToMs(b.duration || 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-500 text-lg font-medium">
                  No breaks found for this date
                </div>
                <div className="text-gray-400 text-sm mt-2">
                  Take a break to see your break history here
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
