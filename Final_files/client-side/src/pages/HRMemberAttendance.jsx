import React, { useEffect, useState } from "react";
import { apiHandler } from "@/api/ApiHandler";
import { api_url } from "@/api/Api";
import { Link } from "react-router-dom";

function HRMemberAttendance() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      setLoading(true);
      try {
        // reuse attendance endpoint to get the list of employees for today
        const today = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Kolkata",
        }).format(new Date());
        const res = await apiHandler.GetApi(
          `${api_url.hrAttendance}?date=${today}`,
          token
        );
        if (res?.success && Array.isArray(res.rows)) {
          // map minimal info for list
          const list = res.rows.map((r) => ({
            teamMemberId: r.personId,
            name: r.name,
            department: r.department,
          }));
          setMembers(list);
        } else {
          setMembers([]);
        }
      } catch (_) {
        setMembers([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            HR Management
          </h1>
          <p className="text-slate-500">Member Attendance</p>
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-[700px] w-full text-slate-800">
          <thead>
            <tr className="bg-slate-50">
              <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wide text-slate-600 border-b border-slate-200">
                Person ID
              </th>
              <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wide text-slate-600 border-b border-slate-200">
                Name
              </th>
              <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wide text-slate-600 border-b border-slate-200">
                Department
              </th>
              <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wide text-slate-600 border-b border-slate-200">
                View
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="text-center py-10 text-slate-500">
                  Loading...
                </td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-10 text-slate-500">
                  No members
                </td>
              </tr>
            ) : (
              members.map((m) => (
                <tr key={m.teamMemberId} className="border-b border-slate-100">
                  <td className="px-4 py-3 text-sm">{m.teamMemberId}</td>
                  <td className="px-4 py-3 text-sm">{m.name}</td>
                  <td className="px-4 py-3 text-sm">{m.department || "—"}</td>
                  <td className="px-4 py-3 text-sm">
                    <Link
                      to={`/hr-attendance/${encodeURIComponent(
                        m.teamMemberId
                      )}`}
                      className="text-blue-600 hover:text-blue-700 underline"
                    >
                      View attendance
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default HRMemberAttendance;
