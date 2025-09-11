import React from "react";

function Stat({ label, value, hint }) {
  return (
    <div className="p-4 rounded-lg bg-neutral-900/60 border border-neutral-800 shadow-sm">
      <div className="text-sm text-neutral-400">{label}</div>
      <div className="mt-1 text-2xl font-bold text-white">{value}</div>
      {hint && <div className="text-xs text-neutral-400 mt-1">{hint}</div>}
    </div>
  );
}

function Section_c() {
  return (
    <section
      id="leaderboard"
      className=" bg-[url('./background_section_home_c.png')] bg-obtain font-roboto py-[80px]"
    >
      <div className="max-w-[1200px] mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-white mb-6">
          Motivate with Leaderboards
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Stat label="Top Productivity" value="Elite" hint="90%+" />
          <Stat
            label="Active Users"
            value="Company-wide"
            hint="All roles supported"
          />
          <Stat
            label="Attendance"
            value="IST Accurate"
            hint="Daily register & HR pages"
          />
        </div>
        <div className="mt-6 rounded-xl bg-neutral-900/60 border border-neutral-800 shadow-sm p-6">
          <div className="text-sm text-neutral-300 mb-2">Snapshot</div>
          <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-blue-500 to-violet-500"
              style={{ width: "72%" }}
            />
          </div>
          <div className="text-xs text-neutral-400 mt-2">
            Illustrative productivity bar
          </div>
        </div>
      </div>
    </section>
  );
}

export default Section_c;
