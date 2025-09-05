import React, { useState } from "react";

export default function Connect({ onDone, onBack }) {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const verify = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/pairing/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, pairingOTP: otp }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Failed to verify OTP");
      }
      // Save token for subsequent API calls
      try {
        localStorage.setItem("pf_auth_token", data.token);
        localStorage.setItem("pf_user_email", email);
        if (data?.companyName)
          localStorage.setItem("pf_company", data.companyName);
      } catch {}
      onDone?.();
    } catch (e) {
      setError(e.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-10 animate-fade-in">
      <div className="max-w-md mx-auto">
        <button
          onClick={onBack}
          className="text-sm text-gray-500 hover:text-gray-700 transition"
        >
          ← Back
        </button>

        <h2 className="mt-3 text-2xl font-semibold text-gray-900">
          Connect to Dashboard
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Enter your account email and the 6-digit OTP you generated from the
          web dashboard (Profile → Pair Tracker).
        </p>

        <form onSubmit={verify} className="mt-6 grid gap-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="you@company.com"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">OTP</label>
            <input
              type="text"
              required
              inputMode="numeric"
              pattern="^[0-9]{6}$"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\s+/g, ""))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 tracking-widest text-center text-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="000000"
            />
          </div>
          {error ? <div className="text-sm text-rose-600">{error}</div> : null}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 px-5 py-2.5 rounded-xl bg-gray-900 text-white hover:bg-black disabled:opacity-50 transition-transform active:scale-[0.98]"
          >
            {loading ? "Connecting..." : "Connect"}
          </button>
        </form>
      </div>
    </div>
  );
}
