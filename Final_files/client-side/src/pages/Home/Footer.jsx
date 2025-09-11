import React from "react";

function Footer() {
  return (
    <footer className="pt-16 border-t border-neutral-950 bg-[url('background_section_home_c.png')] bg-cover text-neutral-300 font-roboto">
      <div className="max-w-[1200px] mx-auto px-4 py-8 grid grid-cols-1 sm:grid-cols-3 gap-8 text-sm">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <img
              src="./final_orbit_logo.png"
              alt="WorkOrbit"
              className="h-6 w-auto"
            />
            <span className="font-semibold text-blue-700">WorkOrbit</span>
          </div>
          <p className="text-neutral-400">
            Time tracking, project management, and HR insights—unified.
          </p>
        </div>
        <div>
          <div className="font-semibold text-white mb-2">Product</div>
          <ul className="space-y-1 text-neutral-400">
            <li>
              <a href="#features" className="hover:text-blue-700">
                Features
              </a>
            </li>
            <li>
              <a href="#tracking" className="hover:text-blue-700">
                Time Tracking
              </a>
            </li>
            <li>
              <a href="#leaderboard" className="hover:text-blue-700">
                Leaderboard
              </a>
            </li>
            <li>
              <a href="#hr" className="hover:text-blue-700">
                HR Suite
              </a>
            </li>
          </ul>
        </div>
        <div>
          <div className="font-semibold text-white mb-2">Resources</div>
          <ul className="space-y-1 text-neutral-400">
            <li>
              <a
                href="/WINDOWS_NOTIFICATIONS_README.md"
                className="hover:text-blue-700"
              >
                Windows Notifications
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-blue-700">
                Docs
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-neutral-800 py-4 text-center text-xs text-neutral-500">
        © {new Date().getFullYear()} WorkOrbit
      </div>
    </footer>
  );
}

export default Footer;
