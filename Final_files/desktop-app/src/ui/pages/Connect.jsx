import React, { useRef, useState } from 'react';

export default function Connect({ onDone }) {
  const emailRef = useRef(null);
  const otpRef = useRef(null);
  const [msg, setMsg] = useState('');

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
      onDone(email, info);
    } catch (err) {
      setMsg(err.message);
    }
  };

  return (
    <div className="p-10 bg-white">
      <h2 className="text-xl font-semibold mb-3 text-gray-900">Connect to your dashboard</h2>
      <form onSubmit={submit} className="space-y-3 max-w-sm">
        <div>
          <label className="text-xs text-gray-500">Email</label>
          <input ref={emailRef} type="email" className="w-full mt-1 rounded-md bg-white border border-gray-300 px-3 py-2 outline-none" required />
        </div>
        <div>
          <label className="text-xs text-gray-500">OTP</label>
          <input ref={otpRef} maxLength={6} className="w-full mt-1 rounded-md bg-white border border-gray-300 px-3 py-2 outline-none" required />
        </div>
        <button type="submit" className="rounded-md bg-sky-600 hover:bg-sky-700 text-white px-4 py-2">Connect</button>
      </form>
      <div className="text-xs text-red-600 mt-2 min-h-[18px]">{msg}</div>
    </div>
  );
}


