import React from "react";

function CTA() {
  return (
    <section
      id="hr"
      className="bg-neutral-950 font-roboto py-[80px] text-center"
    >
      <div className="max-w-[1200px] mx-auto px-4 py-12 rounded-2xl backdrop-blur border border-neutral-800 text-white p-10 shadow-lg">
        <h2 className="text-3xl font-extrabold tracking-tight">
          Get started with WorkOrbit
        </h2>
        <p className="mt-2 text-neutral-300 max-w-2xl m-auto">
          Boost productivity with accurate tracking, transparent leaderboards,
          and HR attendance in one place.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          <a
            href="/Register"
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-md font-semibold shadow"
          >
            Create account
          </a>
          <a
            href="/Login"
            className="bg-transparent border border-white/30 px-6 py-3 rounded-md font-semibold hover:bg-white/10"
          >
            Sign in
          </a>
        </div>
      </div>
    </section>
  );
}

export default CTA;
