import React from "react";
import { Link, useNavigate } from "react-router-dom";

function Header() {
  const navigate = useNavigate();
  const isAuthed = !!localStorage.getItem("token");
  return (
    <header className="sticky top-0 z-20 bg-neutral-950/70 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/60 border-b border-neutral-800">
      <div className="max-w-[1200px] mx-auto px-4 py-3 flex items-center justify-between text-neutral-200">
        <Link to="/" className="flex items-center gap-2">
          <img
            src="./final_orbit_logo.png"
            alt="WorkOrbit"
            className="h-8 w-auto"
          />
        </Link>
        <nav className="hidden sm:flex items-center gap-6 text-sm">
          <a href="#features" className="text-neutral-300 hover:text-white">
            Features
          </a>
          <a href="#tracking" className="text-neutral-300 hover:text-white">
            Time Tracking
          </a>
          <a href="#leaderboard" className="text-neutral-300 hover:text-white">
            Leaderboard
          </a>
          <a href="#hr" className="text-neutral-300 hover:text-white">
            HR Suite
          </a>
        </nav>
        <div className="flex items-center gap-2">
          {isAuthed ? (
            <button
              onClick={() => navigate("/DashBoard")}
              className="bg-white/10 hover:bg-white/15 text-white px-4 py-2 rounded-md text-sm border border-white/20"
            >
              Open App
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate("/Login")}
                className="px-4 py-2 rounded-md text-sm border border-white/20 text-neutral-200 hover:bg-white/10"
              >
                Login
              </button>
              <button
                onClick={() => navigate("/Register")}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-md text-sm"
              >
                Get Started
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
