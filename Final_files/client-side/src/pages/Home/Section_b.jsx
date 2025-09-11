import React from "react";
import {
  CalendarClock,
  ShieldCheck,
  Sparkles,
  Trophy,
  BarChart2,
} from "lucide-react";

const bullets = [
  {
    icon: <CalendarClock className="h-5 w-5 text-blue-600" />,
    title: "Accurate Time Tracking",
    desc: "Desktop tracker with auto idle detection and break types (tea, lunch, meeting).",
  },
  {
    icon: <ShieldCheck className="h-5 w-5 text-blue-600" />,
    title: "Role-based Access",
    desc: "Owner/Admin/Manager controls across projects, phases, and HR views.",
  },
  {
    icon: <Trophy className="h-5 w-5 text-blue-600" />,
    title: "Leaderboard",
    desc: "Motivational rankings with productivity tiers for the whole company.",
  },
  {
    icon: <BarChart2 className="h-5 w-5 text-blue-600" />,
    title: "Insights",
    desc: "Workforce analytics, daily summaries, and attendance register.",
  },
  {
    icon: <Sparkles className="h-5 w-5 text-blue-600" />,
    title: "Project Summary Editor",
    desc: "Rich-text editor with activity history and last-edited metadata.",
  },
];

function Section_b() {
  return (
    <section id="features" className="bg-neutral-950 font-roboto">
      <div className="max-w-[1200px] mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
        <div>
          <h2 className="text-2xl font-bold text-white mb-3">
            Everything you need to run your team
          </h2>
          <p className="text-neutral-300 mb-6">
            From daily punch-ins to HR attendance and project insights—WorkOrbit
            keeps everything connected and consistent in IST timezone.
          </p>
          <ul className="space-y-3">
            {bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="mt-1">{b.icon}</div>
                <div>
                  <div className="font-semibold text-white">{b.title}</div>
                  <div className="text-neutral-300 text-sm">{b.desc}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div
          className="bg-neutral-900/60 backdrop-blur rounded-xl border border-neutral-800 shadow-sm p-6"
          id="tracking"
        >
          <h3 className="text-lg font-semibold text-white mb-2">
            Time Tracking Highlights
          </h3>
          <ul className="text-sm text-neutral-300 list-disc pl-5 space-y-1">
            <li>Punch-in/out with sleep/lock guard and startup on boot</li>
            <li>Break guard: prevents auto punch-out during active breaks</li>
            <li>Tea break duration 15m; meeting & lunch presets</li>
            <li>Spam keystroke threshold tuned to 15</li>
          </ul>
          <div className="mt-4 p-3 rounded-md bg-neutral-800 border border-neutral-700 text-neutral-200 text-sm">
            Productivity formula: (Worked − Idle) / Worked × 100
          </div>
        </div>
      </div>
    </section>
  );
}

export default Section_b;
