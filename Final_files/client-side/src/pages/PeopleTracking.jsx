import React, { useEffect, useMemo, useState } from "react";
import { api_url } from "@/api/Api";
import { apiHandler } from "@/api/ApiHandler";
import CustomDropdown from "@/components/CustomDropDown";

export default function PeopleTracking() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [date, setDate] = useState(() => {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  });
  const [selectedId, setSelectedId] = useState("");
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  // Role and search filters (match AllTask/Section_a UI)
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      try {
        const response = await apiHandler.GetApi(
          api_url.getAllEmployees,
          token
        );
        if (Array.isArray(response)) {
          setMembers(response);
        } else {
          setError(response?.message || "Failed to fetch members");
        }
      } catch (e) {
        setError("Unable to fetch members");
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, []);

  // Load roles for filter dropdown (same API method used in Section_a)
  useEffect(() => {
    const fetchRoles = async () => {
      const token = localStorage.getItem("token");
      try {
        const response = await apiHandler.GetApi(api_url.getAllRoles, token);
        if (response && response.success && Array.isArray(response.roles)) {
          setRoles(response.roles);
        } else {
          setRoles([]);
        }
      } catch (err) {
        setRoles([]);
      }
    };
    fetchRoles();
  }, []);

  const selected = useMemo(
    () => members.find((m) => m.teamMemberId === selectedId) || null,
    [members, selectedId]
  );

  const fmtMin = (min) => {
    const m = Math.max(0, Math.round(Number(min) || 0));
    const h = Math.floor(m / 60)
      .toString()
      .padStart(2, "0");
    const mm = (m % 60).toString().padStart(2, "0");
    return `${h}:${mm}`;
  };

  const fetchSummary = async () => {
    if (!selectedId) return;
    setSummaryLoading(true);
    setSummary(null);
    const token = localStorage.getItem("token");
    try {
      const params = new URLSearchParams();
      if (date) params.set("date", date);
      if (selectedId) params.set("teamMemberId", selectedId);
      const qs = params.toString() ? `?${params.toString()}` : "";
      const res = await apiHandler.GetApi(
        `${api_url.employeeTrackerDailySummary}${qs}`,
        token
      );
      if (res?.success) {
        setSummary(res.summary || null);
      } else {
        setSummary(null);
      }
    } catch (_) {
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    if (selectedId) fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, date]);

  return (
    <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 m-auto p-6 min-h-screen">
      {/* Header Section to match All Subtasks */}
      <div className="relative mb-8">
        <div className="backdrop-blur-md bg-white/40 border border-white/60 shadow-sm rounded-xl px-6 py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl text-gray-800 drop-shadow-sm font-display font-bold">
                Workforce Insights
              </h1>
              <p className="text-base text-gray-700/80 mt-1">
                Live time-tracking summaries across your organization
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="relative bg-white/80 backdrop-blur-sm rounded-xl border border-white/60 shadow-lg hover:shadow-xl transition-all duration-200 px-4 py-3 text-sm font-medium text-gray-700"
              />
            </div>
          </div>
        </div>
        <div className="h-px mt-3 bg-gradient-to-r from-transparent via-indigo-300/50 to-transparent"></div>
      </div>

      {loading ? (
        <div className="text-gray-500 text-sm">Loading members…</div>
      ) : error ? (
        <div className="text-rose-600 text-sm">{error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="w-full bg-white/90 backdrop-blur-sm shadow-xl h-[72vh] overflow-y-auto border border-gray-200 rounded-2xl p-6">
            <div className="mb-2">
              <h2 className="text-2xl font-bold text-gray-900">Team Members</h2>
              <p className="text-gray-600 text-sm">
                Select a member to view their tasks
              </p>
            </div>
            {/* Role filter & search */}
            <div className="space-y-3 mb-4">
              <CustomDropdown
                title="Select Team Role"
                items={roles.map((r, idx) => ({
                  id: idx,
                  label: r.label,
                  value: r.value,
                }))}
                itemKey="id"
                itemLabel="label"
                onClick={(item) => setSelectedRole(item?.value || "")}
                className="w-full"
              />
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 bg-gray-50"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  🔍
                </span>
              </div>
            </div>
            <div className="space-y-2">
              {members
                .filter((m) => (selectedRole ? m.role === selectedRole : true))
                .filter((m) =>
                  (m.name || "")
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase())
                )
                .map((m) => (
                  <button
                    key={m._id}
                    onClick={() => setSelectedId(m.teamMemberId)}
                    className={`w-full text-left p-3 rounded-xl transition-all duration-200 flex items-center gap-3 ${
                      selectedId === m.teamMemberId
                        ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg"
                        : "bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        selectedId === m.teamMemberId
                          ? "bg-white/20 text-white"
                          : "bg-gradient-to-br from-blue-500 to-purple-600 text-white"
                      }`}
                    >
                      {(m.name || "?").charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium">{m.name}</span>
                  </button>
                ))}
            </div>
          </div>

          <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 p-4">
            {!selected ? (
              <div className="text-center py-20">
                <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-12 max-w-md mx-auto shadow-xl border border-gray-100">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-2xl">👥</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    Welcome to Workforce Insights
                  </h3>
                  <p className="text-gray-600 text-lg mb-6">
                    Select a team member from the sidebar to view their
                    time-tracking summary.
                  </p>
                  <div className="flex items-center justify-center gap-2 text-gray-500">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span className="text-sm">
                      Choose a role and member to get started
                    </span>
                  </div>
                </div>
              </div>
            ) : summaryLoading ? (
              <div className="text-gray-500">Loading summary…</div>
            ) : !summary ? (
              <div className="text-center py-12 text-gray-500">
                No data for this date.
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500">Person</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {selected?.name}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Date</div>
                    <div className="font-semibold">{date}</div>
                  </div>
                </div>

                {/* KPI cards - neutral style, ascending order: Total, Productive, Idle, Breaks */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <KPI
                    title="Total"
                    primary={fmtMin(summary.totalWorkTime)}
                    subtitle={`${Math.round(summary.totalWorkTime || 0)} min`}
                    icon="⏱️"
                  />
                  <KPI
                    title="Productive"
                    primary={fmtMin(summary.totalProductiveTime)}
                    subtitle={`${Math.round(
                      summary.totalProductiveTime || 0
                    )} min`}
                    icon="✅"
                  />
                  <KPI
                    title="Idle"
                    primary={fmtMin(summary.totalIdleTime)}
                    subtitle={`${Math.round(summary.totalIdleTime || 0)} min`}
                    icon="🛌"
                  />
                  <KPI
                    title="Breaks"
                    primary={fmtMin(summary.totalBreakTime)}
                    subtitle={`${Math.round(summary.totalBreakTime || 0)} min`}
                    icon="☕"
                  />
                </div>

                {/* Dedicated Status section */}
                <div className="rounded-2xl border border-gray-200 p-5 bg-white/60">
                  <div className="text-sm text-gray-500 mb-3">Status</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="rounded-xl border border-gray-200 p-4 bg-white/70">
                      <div className="text-xs text-gray-500 mb-1">
                        Current State
                      </div>
                      <div
                        className={`text-base font-semibold ${
                          summary.isActiveToday
                            ? "text-emerald-600"
                            : "text-rose-600"
                        }`}
                      >
                        {summary.isActiveToday
                          ? "Punched In"
                          : "Not Punched In"}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {summary.isActiveToday
                          ? `Since ${summary.currentStartTimeIST || "—"}`
                          : "—"}
                      </div>
                    </div>
                    <div className="rounded-xl border border-gray-200 p-4 bg-white/70">
                      <div className="text-xs text-gray-500 mb-1">
                        Last Punch Out
                      </div>
                      <div className="text-base font-semibold text-gray-800">
                        {summary.lastPunchOutIST ||
                          (summary.isActiveToday ? "Ongoing" : "—")}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Shown once the user punches out
                      </div>
                    </div>
                    <div className="rounded-xl border border-gray-200 p-4 bg-white/70">
                      <div className="text-xs text-gray-500 mb-1">
                        Activity Today
                      </div>
                      <div className="text-base font-semibold text-gray-800">
                        {`${Math.round(
                          ((summary.totalProductiveTime || 0) /
                            Math.max(1, summary.totalWorkTime || 0)) *
                            100
                        )}% Activity`}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {`Keys ${summary.totalKeystrokes || 0} • Clicks ${
                          summary.totalMouseClicks || 0
                        }`}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detail grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="rounded-2xl border border-gray-200 p-5 bg-white/60">
                    <div className="text-sm text-gray-500 mb-3">
                      Punch Details
                    </div>
                    <div className="space-y-2 text-sm">
                      <DetailRow
                        label="First Punch In"
                        value={summary.firstPunchInIST || "—"}
                      />
                      <DetailRow
                        label="Last Punch Out"
                        value={
                          summary.lastPunchOutIST ||
                          (summary.isActiveToday ? "Ongoing" : "—")
                        }
                      />
                      <DetailRow
                        label="Status"
                        value={
                          summary.isActiveToday
                            ? `Punched In (since ${
                                summary.currentStartTimeIST || "—"
                              })`
                            : "Not Punched In"
                        }
                      />
                      <DetailRow
                        label="Sessions"
                        value={String(summary.sessionsCount || 0)}
                      />
                      <DetailRow
                        label="Breaks"
                        value={String(summary.breaksCount || 0)}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 p-5 bg-white/60">
                    <div className="text-sm text-gray-500 mb-3">Activity</div>
                    <div className="grid grid-cols-2 gap-3">
                      <BadgeStat
                        label="Activity %"
                        value={`${Math.round(
                          ((summary.totalProductiveTime || 0) /
                            Math.max(1, summary.totalWorkTime || 0)) *
                            100
                        )}%`}
                        tone="emerald"
                      />
                      <BadgeStat
                        label="Keystrokes"
                        value={String(summary.totalKeystrokes || 0)}
                        tone="violet"
                      />
                      <BadgeStat
                        label="Mouse Clicks"
                        value={String(summary.totalMouseClicks || 0)}
                        tone="cyan"
                      />
                      <BadgeStat
                        label="Screenshots"
                        value={String(summary.totalScreenshots || 0)}
                        tone="indigo"
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 p-5 bg-white/60">
                    <div className="text-sm text-gray-500 mb-3">Highlights</div>
                    <ul className="text-sm text-gray-700 list-disc ml-5 space-y-1">
                      <li>
                        Total time: {Math.round(summary.totalWorkTime || 0)}{" "}
                        minutes
                      </li>
                      <li>
                        Productive minus breaks & idle:{" "}
                        {Math.round(summary.totalProductiveTime || 0)} minutes
                      </li>
                      <li>
                        Idle vs Productive ratio:{" "}
                        {Math.round(
                          ((summary.totalIdleTime || 0) /
                            Math.max(1, summary.totalProductiveTime || 0)) *
                            100
                        )}
                        %
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-lg font-semibold text-gray-900">{value}</div>
    </div>
  );
}

function KPI({ title, primary, subtitle, icon }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="w-8 h-8 rounded-lg text-gray-700 flex items-center justify-center bg-gray-100 border border-gray-200">
          {icon}
        </div>
        <div className="text-xs text-gray-500">{title}</div>
      </div>
      <div className="text-2xl font-bold text-gray-800">{primary}</div>
      <div className="text-xs text-gray-500 mt-0.5">{subtitle}</div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-600">{label}</span>
      <span className="font-semibold text-gray-900 tabular-nums">{value}</span>
    </div>
  );
}

function BadgeStat({ label, value, tone = "emerald" }) {
  const toneMap = {
    emerald: { bg: "bg-emerald-100", text: "text-emerald-700" },
    violet: { bg: "bg-violet-100", text: "text-violet-700" },
    cyan: { bg: "bg-cyan-100", text: "text-cyan-700" },
    indigo: { bg: "bg-indigo-100", text: "text-indigo-700" },
  };
  const t = toneMap[tone] || toneMap.emerald;
  return (
    <div className={`rounded-xl ${t.bg} ${t.text} p-3`}>
      <div className="text-xs font-medium">{label}</div>
      <div className="text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}
