import React, { useEffect, useMemo, useState } from "react";
import { api_url } from "@/api/Api";
import { apiHandler } from "@/api/ApiHandler";

const columns = [
  { key: "personId", label: "Person ID" },
  { key: "name", label: "Name" },
  { key: "department", label: "Department" },
  { key: "date", label: "Date" },
  { key: "breakStart", label: "Break Start" },
  { key: "breakEnd", label: "Break End" },
  { key: "breakReason", label: "Break Reason" },
  { key: "attendanceType", label: "Attendance Type" },
  { key: "checkIn", label: "Check-In" },
  { key: "checkOut", label: "Check-out" },
  // counts removed per request
  { key: "workedMinutes", label: "Worked" },
];

function HRManagement() {
  const [date, setDate] = useState(() =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
      new Date()
    )
  );
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");

  const fetchAttendance = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const url = `${api_url.hrAttendance}?date=${encodeURIComponent(date)}`;
      const res = await apiHandler.GetApi(url, token);
      if (res?.success) {
        setRows(Array.isArray(res.rows) ? res.rows : []);
      } else {
        setRows([]);
      }
    } catch (_) {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const renderCell = (r, key) => {
    if (key === "attendanceType") {
      const present = (r[key] || "").toLowerCase() === "present";
      const cls = present
        ? "bg-emerald-100 text-emerald-700"
        : "bg-rose-100 text-rose-700";
      const label = present ? "Present" : r[key] || "Absent";
      return (
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}
        >
          {label}
        </span>
      );
    }
    if (key === "attended" || key === "absent") {
      const val = Number(r[key] || 0);
      const chip =
        key === "attended"
          ? "bg-emerald-50 text-emerald-700"
          : "bg-rose-50 text-rose-700";
      return (
        <span
          className={`inline-flex min-w-[28px] justify-center px-2 py-0.5 rounded-md text-xs font-semibold ${
            val ? chip : "bg-slate-100 text-slate-600"
          }`}
        >
          {val}
        </span>
      );
    }
    if (key === "workedMinutes") {
      const m = Math.max(0, Math.round(r[key] || 0));
      const h = Math.floor(m / 60);
      const mm = m % 60;
      return (
        <span className="tabular-nums text-slate-800">{`${h}h ${mm}m`}</span>
      );
    }
    if (key === "checkIn" || key === "checkOut") {
      return (
        <span className="tabular-nums text-slate-700">{r[key] ?? "—"}</span>
      );
    }
    return r[key] ?? "—";
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            HR Management
          </h1>
          <p className="text-slate-500">Attendance overview by date</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-md text-sm bg-white"
          />
          <button
            onClick={fetchAttendance}
            disabled={loading}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm disabled:opacity-60"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="overflow-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-[1000px] w-full text-slate-800">
          <thead>
            <tr className="bg-slate-50">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wide text-slate-600 border-b border-slate-200 whitespace-nowrap"
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-center py-10 text-slate-500"
                >
                  Loading attendance...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-center py-10 text-slate-500"
                >
                  No data
                </td>
              </tr>
            ) : (
              rows.map((r, idx) => (
                <tr
                  key={idx}
                  className={`border-b border-slate-100 hover:bg-blue-50/40 ${
                    idx % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                  } divide-x divide-slate-100`}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className="px-4 py-3 text-sm whitespace-nowrap"
                    >
                      {renderCell(r, c.key)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default HRManagement;
