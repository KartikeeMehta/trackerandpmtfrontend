import React, { useRef, useState } from 'react';

export default function Connect({ onDone }) {
  const emailRef = useRef(null);
  const otpRef = useRef(null);
  const [msg, setMsg] = useState('');
  const [connected, setConnected] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const email = emailRef.current?.value?.trim();
    const otp = otpRef.current?.value?.trim();
    if (!email || !otp) { setMsg('Email and OTP are required'); return; }
    setMsg('Connecting...');
    try {
      const res = await fetch('http://localhost:8000/api/pairing/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ email, pairingOTP: otp })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to connect');
      try {
        if (data.token && window.trackerAPI?.setAuthToken) window.trackerAPI.setAuthToken(data.token);
        window.trackerAPI?.setBaseUrl?.('http://localhost:8000/api/employee-tracker');
        window.trackerAPI?.setUserEmail?.(email);
        localStorage.setItem('pf_tracker_email', email);
      } catch {}

      // Get employee info from status
      let info = { name: '', teamMember_Id: '' };
      try {
        const s = await window.trackerAPI?.getStatus();
        if (s && s.employeeInfo) info = { name: s.employeeInfo.name || '', teamMember_Id: s.employeeInfo.teamMember_Id || '' };
      } catch {}
      setConnected(true);
      setMsg('Connected');
      setTimeout(() => onDone(email, info), 900);
    } catch (err) {
      setMsg(err.message);
    }
  };

  return (
    <div className="p-10 bg-white">
      <div className="rounded-xl border border-gray-200 shadow-sm bg-white/90 max-w-xl relative overflow-hidden">
        <div className="px-6 py-6">
          <h2 className="text-2xl font-semibold mb-1 text-gray-900 tracking-tight">Connect to your dashboard</h2>
          <p className="text-sm text-gray-600 mb-6">Enter your email and the 6-digit OTP you received.</p>
          <form onSubmit={submit} className="space-y-4 max-w-sm">
            <div>
              <label className="text-xs text-gray-500">Email</label>
              <input ref={emailRef} type="email" placeholder="name@company.com" className="w-full mt-1 rounded-md bg-white border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-500 placeholder-gray-900 text-gray-900" required />
            </div>
            <div>
              <label className="text-xs text-gray-500">OTP</label>
              <input ref={otpRef} inputMode="numeric" maxLength={6} placeholder="123456" className="w-full mt-1 rounded-md bg-white border border-gray-300 px-3 py-2 outline-none tracking-widest tabular-nums focus:ring-2 focus:ring-sky-500 placeholder-gray-900 text-gray-900" required />
            </div>
            <button type="submit" className="rounded-md bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 shadow-sm">Connect</button>
          </form>
          <div className={`text-xs mt-3 min-h-[18px] ${msg && msg !== 'Connecting...' && !connected ? 'text-red-600' : 'text-gray-500'}`}>{msg}</div>

          {connected && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center animate-fade-in">
              <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center animate-scale-in">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-8 w-8 text-emerald-600">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


