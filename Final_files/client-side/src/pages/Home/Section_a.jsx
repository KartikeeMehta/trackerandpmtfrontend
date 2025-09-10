import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
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
  const sectionRef = useRef(null);
  const heroCardRef = useRef(null);
  const logoRef = useRef(null);
  const ctaButtonsRef = useRef(null);
  const featuresWrapRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: "power3.out", duration: 0.9 },
      });
      tl.from(logoRef.current, { y: -20, opacity: 0 })
        .from(heroCardRef.current, { y: 20, opacity: 0, scale: 0.98 }, "-=0.4")
        .from(
          ctaButtonsRef.current?.children || [],
          { y: 16, opacity: 0, stagger: 0.08 },
          "-=0.5"
        )
        .from(
          featuresWrapRef.current?.children || [],
          { y: 22, opacity: 0, stagger: 0.08 },
          "-=0.4"
        );

      // Subtle floating sparkles on hero card
      gsap.to(heroCardRef.current, {
        y: 2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        duration: 3.2,
      });

      // Parallax on mouse move (very light)
      const sectionEl = sectionRef.current;
      const onMove = (e) => {
        const rect = sectionEl.getBoundingClientRect();
        const relX = (e.clientX - rect.left) / rect.width - 0.5;
        const relY = (e.clientY - rect.top) / rect.height - 0.5;
        gsap.to(heroCardRef.current, {
          x: relX * 4,
          y: relY * 4,
          duration: 0.4,
          ease: "power2.out",
        });
      };
      sectionEl?.addEventListener("mousemove", onMove);
      return () => sectionEl?.removeEventListener("mousemove", onMove);
    }, sectionRef);
    return () => ctx.revert();
  }, []);
  return (
    <section
      ref={sectionRef}
      className="bg-[url('./hero_section.png')] bg-cover relative flex flex-col items-center justify-center min-h-screen px-4 py-10 overflow-hidden bg-neutral-950 text-neutral-100 font-sans"
    >
      {/* Logo */}
      <div ref={logoRef} className="flex items-center gap-3 mt-8 mb-2 z-10">
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
        <span className="text-2xl font-bold text-white tracking-tight">
          WorkOrbit
        </span>
      </div>
      {/* Hero Section */}
      <div className="relative z-10 w-full max-w-[1200px] mt-8 mb-12">
        <div
          ref={heroCardRef}
          className="bg-[#ffffff12] backdrop-blur rounded-2xl shadow-xl px-8 py-10 flex flex-col items-center border border-[#ffffff40]"
        >
          <Sparkles className="h-10 w-10 text-indigo-400 mb-2 animate-pulse" />
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 tracking-tight leading-tight">
            WorkOrbit:{" "}
            <span className="text-indigo-400">Project Management Tool</span>
          </h1>
          <p className="text-lg text-neutral-300 mb-8 font-medium text-center">
            The all-in-one project management tool for IT companies. Plan,
            track, and deliver projects efficiently with seamless collaboration
            and clear analytics.
          </p>
          <button
            onClick={() => navigate("/Register")}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-lg text-lg font-semibold shadow-md transition-transform transform hover:scale-105"
          >
            Get Started Free
          </button>
        </div>
      </div>

      {/* Navigation Buttons (Top) */}
      <div
        ref={ctaButtonsRef}
        className="flex flex-col sm:flex-row gap-4 mt-6 z-10 mb-10"
      >
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
      <div
        ref={featuresWrapRef}
        className="flex flex-wrap justify-center gap-8 mb-16 z-10"
      >
        {features.map((feature, idx) => (
          <div
            key={idx}
            className="bg-[#ffffff12] backdrop-blur border border-[#ffffff40] rounded-xl shadow p-6 w-72 flex flex-col items-center hover:shadow-lg transition-shadow duration-200"
          >
            {feature.icon}
            <h3 className="mt-4 text-xl font-bold text-white">
              {feature.title}
            </h3>
            <p className="mt-2 text-neutral-300 text-center">{feature.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Section_a;
