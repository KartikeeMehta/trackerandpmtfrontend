import React, { useEffect, useMemo, useRef, useState } from 'react';

const BASE_URL = 'http://localhost:8000/api';

function Badge({ state, text }) {
  const cls = state === 'connected'
    ? 'badge bg-emerald-900/30 text-emerald-300 border-emerald-700'
    : state === 'pending'
    ? 'badge bg-amber-900/30 text-amber-300 border-amber-700'
    : 'badge bg-slate-800 text-slate-300 border-slate-700';
  return <span className={cls}>{text}</span>;
}

function format(ms) {
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / (1000 * 60)) % 60;
  const h = Math.floor(ms / (1000 * 60 * 60));
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export default function App() {
  const [status, setStatus] = useState('disconnected');
  const [message, setMessage] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [startTs, setStartTs] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [screen, setScreen] = useState('welcome'); // welcome | connect | track

  const emailRef = useRef(null);
  const otpRef = useRef(null);

  // ticker
  useEffect(() => {
    if (!startTs) return;
    const t = setInterval(() => setElapsed(Date.now() - startTs), 1000);
    return () => clearInterval(t);
  }, [startTs]);

  const connect = async (e) => {
    e.preventDefault();
    setMessage('Connecting...');
    try {
      const res = await fetch(`${BASE_URL}/pairing/verify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailRef.current.value.trim(), pairingOTP: otpRef.current.value.trim() })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to connect');
      setStatus('connected');
      setMessage('Connected');
      setScreen('track');
      try { window.trackerAPI?.setUserEmail(emailRef.current.value.trim()); } catch {}
      try { localStorage.setItem('pf_tracker_email', emailRef.current.value.trim()); } catch {}
    } catch (e) {
      setMessage(e.message);
    }
  };

  const start = async () => {
    setMessage('Starting...');
    const res = await fetch(`${BASE_URL}/tracker/start`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailRef.current.value.trim() })
    });
    const data = await res.json();
    if (!data.success) return setMessage(data.message || 'Failed');
    setSessionId(data.sessionId);
    setStartTs(Date.now());
    setMessage('Tracking');
  };

  const stop = async () => {
    if (!sessionId) return;
    setMessage('Stopping...');
    await fetch(`${BASE_URL}/tracker/stop`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, graceMs: 7 * 60 * 1000 })
    });
    setSessionId(null);
    setStartTs(null);
    setElapsed(0);
    setMessage('Ended');
  };

  const pushBreak = async (type, minutes) => {
    if (!sessionId) return;
    const now = new Date();
    await fetch(`${BASE_URL}/tracker/break`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, type, startedAt: now, endedAt: new Date(now.getTime() + minutes * 60 * 1000) })
    });
    setMessage(`Break recorded: ${type}`);
  };

  // idle detection (31s rule)
  useEffect(() => {
    let idleSince = Date.now();
    let idleTimer = null;
    const onAct = () => {
      if (!sessionId) return;
      if (idleSince && Date.now() - idleSince > 31000) {
        fetch(`${BASE_URL}/tracker/idle`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, startedAt: new Date(idleSince + 31000), endedAt: new Date() })
        });
      }
      idleSince = Date.now();
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {}, 30000);
    };
    ['mousemove','keydown','mousedown','wheel'].forEach(evt => window.addEventListener(evt, onAct, { passive: true }));
    return () => ['mousemove','keydown','mousedown','wheel'].forEach(evt => window.removeEventListener(evt, onAct));
  }, [sessionId]);

  // Tray menu handlers
  useEffect(() => {
    const onStart = () => start();
    const onStop = () => stop();
    try {
      window.trackerAPI?.onStart(onStart);
      window.trackerAPI?.onStop(onStop);
    } catch {}
    return () => {
      // no-op cleanup
    };
  }, [startTs, sessionId]);

  const Welcome = () => (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-2">Welcome to ProjectFlow Tracker</h1>
      <p className="text-slate-400 mb-4">Track working hours, breaks, and idle time for accurate reports.</p>
      <ul className="list-disc ml-6 text-slate-400 space-y-1">
        <li>Automatic idle detection after 30 seconds (counted from 31s)</li>
        <li>Quick break buttons for tea, lunch, and meetings</li>
        <li>Grace period of 7 minutes after stopping a session</li>
      </ul>
      <div className="mt-6">
        <button onClick={() => setScreen('connect')} className="px-4 py-2 rounded-md bg-sky-600 hover:bg-sky-700">Connect to Dashboard</button>
      </div>
    </div>
  );

  const Connect = () => (
    <div className="p-8">
      <h2 className="text-xl font-semibold mb-2">Connect to your dashboard</h2>
      <form onSubmit={connect} className="space-y-3 max-w-sm">
        <div>
          <label className="text-xs text-slate-400">Email</label>
          <input ref={emailRef} type="email" className="w-full mt-1 rounded-md bg-slate-800 border border-slate-700 px-3 py-2 outline-none" required />
        </div>
        <div>
          <label className="text-xs text-slate-400">OTP</label>
          <input ref={otpRef} maxLength={6} className="w-full mt-1 rounded-md bg-slate-800 border border-slate-700 px-3 py-2 outline-none" required />
        </div>
        <button className="rounded-md bg-sky-600 hover:bg-sky-700 px-4 py-2">Connect</button>
      </form>
      <div className="text-xs text-slate-400 mt-2 min-h-[18px]">{message}</div>
    </div>
  );

  const Track = () => (
    <div className="p-8">
      <div className="text-4xl font-bold tabular-nums tracking-wide">{format(elapsed)}</div>
      <div className="flex gap-2 mt-3">
        <button onClick={start} className="px-3 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700">Start</button>
        <button onClick={stop} className="px-3 py-2 rounded-md bg-rose-600 hover:bg-rose-700">Stop</button>
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        <button onClick={() => pushBreak('tea15', 15)} className="px-3 py-2 rounded-md bg-slate-800 border border-slate-700">Tea 15m</button>
        <button onClick={() => pushBreak('full45', 45)} className="px-3 py-2 rounded-md bg-slate-800 border border-slate-700">Lunch 45m</button>
        <button onClick={() => pushBreak('meeting15', 15)} className="px-3 py-2 rounded-md bg-slate-800 border border-slate-700">Meeting 15m</button>
        <button onClick={() => pushBreak('meeting15_2', 15)} className="px-3 py-2 rounded-md bg-slate-800 border border-slate-700">Meeting 15m</button>
        <button onClick={() => { const v = Number(prompt('Custom break minutes?', '10')) || 0; if (v > 0) pushBreak('custom', v); }} className="px-3 py-2 rounded-md bg-slate-800 border border-slate-700">Custom</button>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex items-center justify-center">
      <div className="w-[900px] rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded bg-sky-600" />
            <div className="font-semibold">ProjectFlow Tracker</div>
          </div>
          <Badge state={status === 'connected' ? 'connected' : 'disconnected'} text={status === 'connected' ? 'Connected' : 'Not Connected'} />
        </div>
        {screen === 'welcome' && <Welcome />}
        {screen === 'connect' && <Connect />}
        {screen === 'track' && <Track />}
      </div>
    </div>
  );
}


