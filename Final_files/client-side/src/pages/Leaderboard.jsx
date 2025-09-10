import React, { useEffect, useMemo, useState } from "react";
import { apiHandler } from "@/api/ApiHandler";
import { api_url } from "@/api/Api";
import { Crown, Medal, Trophy } from "lucide-react";

function Leaderboard() {
  const [month, setMonth] = useState(() =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" })
      .format(new Date())
      .slice(0, 7)
  );
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const token = localStorage.getItem("token");

  // Identify current viewer to highlight their row
  const me = useMemo(() => {
    try {
      const emp = JSON.parse(localStorage.getItem("employee") || "null");
      if (emp?.teamMemberId) return { teamMemberId: emp.teamMemberId };
      const user = JSON.parse(localStorage.getItem("user") || "null");
      if (user?.teamMemberId) return { teamMemberId: user.teamMemberId };
    } catch {}
    return { teamMemberId: null };
  }, []);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await apiHandler.GetApi(
        `${api_url.employeeTrackerLeaderboard}?month=${encodeURIComponent(
          month
        )}`,
        token
      );
      if (res?.success) setRows(res.rows || []);
      else setRows([]);
    } catch (_) {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const myRow = useMemo(() => {
    if (!me.teamMemberId) return null;
    return rows.find((r) => r.teamMemberId === me.teamMemberId) || null;
  }, [rows, me]);

  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter(
      (r) =>
        r.name?.toLowerCase().includes(q) ||
        r.teamMemberId?.toLowerCase().includes(q)
    );
  }, [rows, query]);

  const tierOf = (p) => {
    if (p >= 90)
      return { label: "Elite", color: "bg-emerald-100 text-emerald-700" };
    if (p >= 75) return { label: "Pro", color: "bg-blue-100 text-blue-700" };
    if (p >= 60)
      return { label: "Skilled", color: "bg-amber-100 text-amber-700" };
    if (p >= 40)
      return { label: "Improving", color: "bg-rose-100 text-rose-700" };
    return { label: "Starter", color: "bg-slate-100 text-slate-600" };
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-slate-900">Leaderboard</h1>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search member or ID"
            className="px-3 py-2 border border-slate-300 rounded-md text-sm bg-white w-48"
          />
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-md text-sm bg-white"
          />
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm disabled:opacity-60"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Podium for top 3 */}
      {!loading && rows.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {[rows[1], rows[0], rows[2]].map((r, idx) => {
            if (!r) return <div key={`podium-${idx}`} />;
            const palette = [
              {
                bg: "bg-slate-50",
                ring: "ring-slate-200",
                text: "text-slate-800",
                icon: <Medal className="text-slate-500" size={18} />,
              },
              {
                bg: "bg-amber-50",
                ring: "ring-amber-200",
                text: "text-amber-900",
                icon: <Crown className="text-amber-500" size={18} />,
              },
              {
                bg: "bg-teal-50",
                ring: "ring-teal-200",
                text: "text-teal-800",
                icon: <Medal className="text-teal-500" size={18} />,
              },
            ];
            const p = palette[idx];
            const workedH = `${Math.floor((r.workedMinutes || 0) / 60)}h ${
              Math.round(r.workedMinutes || 0) % 60
            }m`;
            return (
              <div
                key={r.teamMemberId}
                className={`rounded-xl ${p.bg} ring-1 ${p.ring} p-4 shadow-sm`}
              >
                <div className="flex items-center justify-between">
                  <div className={`inline-flex items-center gap-2 ${p.text}`}>
                    {idx === 1 ? (
                      <Trophy className="text-amber-600" size={18} />
                    ) : (
                      p.icon
                    )}
                    <span className="text-sm font-semibold">#{r.rank}</span>
                  </div>
                  <div className="text-xs text-slate-500">Worked {workedH}</div>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-white/70 ring-1 ring-white flex items-center justify-center text-slate-700 text-sm font-semibold">
                    {r.name?.slice(0, 1) || "?"}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900 truncate">
                      {r.name}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {r.teamMemberId}
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-blue-500"
                      style={{ width: `${Math.round(r.productivity)}%` }}
                    />
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    Productivity {Math.round(r.productivity)}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Your Rank card */}
      {!loading && myRow && (
        <div className="mb-4 rounded-xl bg-blue-50 ring-1 ring-blue-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-white ring-1 ring-white flex items-center justify-center text-blue-700 text-lg font-bold">
              #{myRow.rank}
            </div>
            <div>
              <div className="font-semibold text-slate-900">Your Position</div>
              <div className="text-xs text-slate-600">
                {myRow.name} · {myRow.teamMemberId}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div>
              <div className="text-slate-500">Worked</div>
              <div className="font-medium">
                {Math.floor((myRow.workedMinutes || 0) / 60)}h{" "}
                {Math.round(myRow.workedMinutes || 0) % 60}m
              </div>
            </div>
            <div>
              <div className="text-slate-500">Idle</div>
              <div className="font-medium">
                {Math.floor((myRow.idleMinutes || 0) / 60)}h{" "}
                {Math.round(myRow.idleMinutes || 0) % 60}m
              </div>
            </div>
            <div>
              <div className="text-slate-500">Productivity</div>
              <div className="font-medium">
                {Math.round(myRow.productivity)}%
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs uppercase text-slate-500 sticky top-0 bg-white">
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Worked</th>
              <th className="px-4 py-3">Idle</th>
              <th className="px-4 py-3">Productivity</th>
              <th className="px-4 py-3">Tier</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-slate-500"
                >
                  Loading...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-6 text-center text-slate-500"
                >
                  No data
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const isMe =
                  me.teamMemberId && r.teamMemberId === me.teamMemberId;
                const tier = tierOf(Math.round(r.productivity));
                return (
                  <tr
                    key={r.teamMemberId}
                    className={`border-t border-slate-100 ${
                      isMe ? "bg-blue-50/50" : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                      #{r.rank}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 text-sm font-semibold">
                          {r.name?.slice(0, 1) || "?"}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-slate-900 truncate">
                            {r.name}
                          </div>
                          <div className="text-slate-500 text-xs truncate">
                            {r.teamMemberId}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {Math.floor((r.workedMinutes || 0) / 60)}h{" "}
                      {Math.round(r.workedMinutes || 0) % 60}m
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {Math.floor((r.idleMinutes || 0) / 60)}h{" "}
                      {Math.round(r.idleMinutes || 0) % 60}m
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-40 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className={`h-full ${
                              r.productivity >= 80
                                ? "bg-emerald-500"
                                : r.productivity >= 60
                                ? "bg-blue-500"
                                : r.productivity >= 40
                                ? "bg-amber-500"
                                : "bg-rose-500"
                            }`}
                            style={{ width: `${Math.round(r.productivity)}%` }}
                          />
                        </div>
                        <span className="tabular-nums">
                          {Math.round(r.productivity)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${tier.color}`}
                      >
                        {tier.label}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-3 text-xs text-slate-500 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-2 rounded bg-emerald-500" />{" "}
          80-100%
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-2 rounded bg-blue-500" /> 60-79%
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-2 rounded bg-amber-500" /> 40-59%
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-2 rounded bg-rose-500" /> 0-39%
        </div>
      </div>
    </div>
  );
}

export default Leaderboard;
