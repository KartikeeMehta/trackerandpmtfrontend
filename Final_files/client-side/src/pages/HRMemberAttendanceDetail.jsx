import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiHandler } from "@/api/ApiHandler";
import { api_url } from "@/api/Api";

function HRMemberAttendanceDetail() {
  const { teamMemberId } = useParams();
  const navigate = useNavigate();
  const [month, setMonth] = useState(() =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" })
      .format(new Date())
      .slice(0, 7)
  );
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem("token");

  const fetchSummary = async () => {
    if (!token || !teamMemberId) return;
    setLoading(true);
    try {
      const res = await apiHandler.GetApi(
        `${api_url.employeeTrackerMonthlySummary}?month=${encodeURIComponent(
          month
        )}&teamMemberId=${encodeURIComponent(teamMemberId)}`,
        token
      );
      if (res?.success) setSummary(res.summary || null);
      else setSummary(null);
    } catch (_) {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, teamMemberId]);

  const rows = useMemo(() => {
    if (!summary) return [];
    return [
      { label: "Month", value: summary.month },
      { label: "Sessions", value: summary.sessionsCount || 0 },
      {
        label: "Worked",
        value: `${Math.floor((summary.totalWorkTime || 0) / 60)}h ${
          Math.round(summary.totalWorkTime || 0) % 60
        }m`,
      },
      {
        label: "Breaks",
        value: `${Math.floor((summary.totalBreakTime || 0) / 60)}h ${
          Math.round(summary.totalBreakTime || 0) % 60
        }m`,
      },
      {
        label: "Idle",
        value: `${Math.floor((summary.totalIdleTime || 0) / 60)}h ${
          Math.round(summary.totalIdleTime || 0) % 60
        }m`,
      },
      {
        label: "Activity %",
        value: (summary.averageActivityPercentage || 0).toFixed(1) + "%",
      },
    ];
  }, [summary]);

  const kpis = useMemo(() => {
    if (!summary) return [];
    const toHm = (min) =>
      `${Math.floor((min || 0) / 60)}h ${Math.round(min || 0) % 60}m`;
    return [
      {
        title: "Worked",
        value: toHm(summary.totalWorkTime),
        accent: "text-emerald-600",
      },
      {
        title: "Breaks",
        value: toHm(summary.totalBreakTime),
        accent: "text-blue-600",
      },
      {
        title: "Idle",
        value: toHm(summary.totalIdleTime),
        accent: "text-orange-600",
      },
      {
        title: "Sessions",
        value: summary.sessionsCount || 0,
        accent: "text-indigo-600",
      },
      {
        title: "Activity %",
        value: (summary.averageActivityPercentage || 0).toFixed(1) + "%",
        accent: "text-violet-600",
      },
    ];
  }, [summary]);

  const calendar = useMemo(() => {
    if (!summary) return { headers: [], cells: [] };
    const headers = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    // Build a map of YYYY-MM-DD -> day summary
    const dayMap = new Map((summary.days || []).map((d) => [d.date, d]));
    const firstOfMonth = new Date(`${summary.month}-01T00:00:00`);
    const year = firstOfMonth.getFullYear();
    const monthIdx = firstOfMonth.getMonth();
    const nextMonth = new Date(year, monthIdx + 1, 1);
    const daysInMonth = Math.ceil(
      (nextMonth - firstOfMonth) / (1000 * 60 * 60 * 24)
    );
    const startWeekday = firstOfMonth.getDay();

    const cells = [];
    for (let i = 0; i < startWeekday; i++)
      cells.push({ blank: true, key: `blank-${i}` });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${summary.month}-${String(d).padStart(2, "0")}`;
      const item = dayMap.get(dateStr);
      const worked = item?.workedMinutes || 0;
      const idle = item?.idleMinutes || 0;
      const breaks = item?.breakMinutes || 0;
      const present = item?.attended === 1;
      const activity = item?.activityPercentage || 0;
      cells.push({
        key: dateStr,
        day: d,
        present,
        worked,
        idle,
        breaks,
        activity,
        firstPunchIn: item?.firstPunchIn || "—",
        lastPunchOut: item?.lastPunchOut || "—",
      });
    }
    return { headers, cells };
  }, [summary]);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/hr-attendance")}
            className="px-3 py-2 border border-slate-300 text-slate-700 rounded-md text-sm hover:bg-slate-50"
          >
            ← Back
          </button>
          <h1 className="text-xl font-semibold text-slate-900">
            Member Attendance
          </h1>
          <p className="text-slate-500">Team Member ID: {teamMemberId}</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-md text-sm bg-white"
          />
          <button
            onClick={fetchSummary}
            disabled={loading}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm disabled:opacity-60"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm py-10 text-center text-slate-500">
          Loading...
        </div>
      ) : !summary ? (
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm py-10 text-center text-slate-500">
          No data
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
            {kpis.map((k) => (
              <div
                key={k.title}
                className="rounded-lg border border-slate-200 bg-white shadow-sm p-4"
              >
                <div className="text-sm text-slate-500">{k.title}</div>
                <div className={`mt-1 text-xl font-semibold ${k.accent}`}>
                  {k.value}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-3">
            <div className="grid grid-cols-7 text-xs font-medium text-slate-500 px-1">
              {calendar.headers.map((h) => (
                <div key={h} className="py-2 text-center">
                  {h}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {calendar.cells.map((c) => (
                <div
                  key={c.key}
                  className={`min-h-[88px] rounded-md border ${
                    c.blank
                      ? "border-transparent"
                      : c.present
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-slate-200 bg-white"
                  } p-2`}
                >
                  {c.blank ? null : (
                    <>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{c.day}</span>
                        <span
                          className={`${
                            c.present ? "text-emerald-600" : "text-slate-400"
                          }`}
                        >
                          {c.present ? "Present" : "—"}
                        </span>
                      </div>
                      {c.present && (
                        <div className="mt-1 space-y-0.5 text-[11px] leading-4 text-slate-600">
                          <div>
                            Worked: {Math.floor(c.worked / 60)}h{" "}
                            {Math.round(c.worked) % 60}m
                          </div>
                          <div>
                            Breaks: {Math.floor(c.breaks / 60)}h{" "}
                            {Math.round(c.breaks) % 60}m
                          </div>
                          <div>Act: {c.activity.toFixed(0)}%</div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white shadow-sm mt-4">
            <table className="w-full">
              <tbody>
                {rows.map((r) => (
                  <tr key={r.label} className="border-b border-slate-100">
                    <td className="px-4 py-3 text-sm font-medium text-slate-600 w-48">
                      {r.label}
                    </td>
                    <td className="px-4 py-3 text-sm">{r.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default HRMemberAttendanceDetail;
