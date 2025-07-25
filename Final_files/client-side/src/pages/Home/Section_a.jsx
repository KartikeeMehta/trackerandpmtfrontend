import React from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, Users, BarChart2, Sparkles } from "lucide-react";

const features = [
  {
    icon: <Briefcase className="h-8 w-8 text-blue-500" />,
    title: "Project Tracking",
    desc: "Easily create, assign, and track projects from start to finish.",
  },
  {
    icon: <Users className="h-8 w-8 text-blue-500" />,
    title: "Team Collaboration",
    desc: "Collaborate with your team, assign roles, and manage members.",
  },
  {
    icon: <BarChart2 className="h-8 w-8 text-blue-500" />,
    title: "Analytics & Insights",
    desc: "Visualize progress and performance with real-time analytics.",
  },
];

const Section_a = () => {
  const navigate = useNavigate();
  return (
    <section className="relative flex flex-col items-center justify-center min-h-screen px-4 py-10 overflow-hidden bg-[#dbeafe] font-sans">
      {/* Decorative SVG Accent */}
      <div className="absolute top-0 left-0 w-full flex justify-center pointer-events-none select-none z-0">
        <svg
          width="100%"
          height="120"
          viewBox="0 0 1440 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill="#e0e7ef"
            fillOpacity="0.7"
            d="M0,64L48,74.7C96,85,192,107,288,117.3C384,128,480,128,576,117.3C672,107,768,85,864,80C960,75,1056,85,1152,90.7C1248,96,1344,96,1392,96L1440,96L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"
          />
        </svg>
      </div>
      {/* Logo */}
      <div className="flex items-center gap-3 mt-8 mb-2 z-10">
        <svg
          width="44"
          height="44"
          viewBox="0 0 44 44"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="44" height="44" rx="12" fill="#2563eb" />
          <path
            d="M13 29L22 15L31 29"
            stroke="#fff"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-2xl font-bold text-blue-700 tracking-tight">
          ProjectFlow
        </span>
      </div>
      {/* Hero Section */}
      <div className="relative z-10 w-full max-w-[1200px] mt-8 mb-12">
        <div className="bg-white/90 rounded-2xl shadow-xl px-8 py-10 flex flex-col items-center border border-blue-100">
          <Sparkles className="h-10 w-10 text-blue-400 mb-2 animate-pulse" />
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight leading-tight">
            ProjectFlow:{" "}
            <span className="text-blue-600">Project Management Tool</span>
          </h1>
          <p className="text-lg text-gray-700 mb-8 font-medium text-center">
            The all-in-one project management tool for IT companies. Plan,
            track, and deliver projects efficiently with seamless collaboration
            and clear analytics.
          </p>
          <button
            onClick={() => navigate("/Register")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-semibold shadow-md transition-transform transform hover:scale-105"
          >
            Get Started Free
          </button>
        </div>
      </div>

      {/* Navigation Buttons (Top) */}
      <div className="flex flex-col sm:flex-row gap-4 mt-6 z-10 mb-10">
        <button
          onClick={() => navigate("/Login")}
          type="button"
          className="w-48 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md font-semibold shadow-sm border border-blue-500 transition"
        >
          Login
        </button>
        <button
          onClick={() => navigate("/Register")}
          type="button"
          className="w-48 bg-white hover:bg-blue-50 text-blue-700 py-2 rounded-md font-semibold shadow-sm border border-blue-400 transition"
        >
          Register
        </button>
      </div>

      {/* Features Section */}
      <div className="flex flex-wrap justify-center gap-8 mb-16 z-10">
        {features.map((feature, idx) => (
          <div
            key={idx}
            className="bg-white border border-blue-100 rounded-xl shadow p-6 w-72 flex flex-col items-center hover:shadow-lg transition-shadow duration-200"
          >
            {feature.icon}
            <h3 className="mt-4 text-xl font-bold text-gray-800">
              {feature.title}
            </h3>
            <p className="mt-2 text-gray-500 text-center">{feature.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Section_a;
