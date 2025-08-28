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
  const [email, setEmail] = useState('');

  // punch/break info + stats
  const [punchInAt, setPunchInAt] = useState(null);
  const [punchOutAt, setPunchOutAt] = useState(null);
  const [breakStartAt, setBreakStartAt] = useState(null);
  const [breakEndAt, setBreakEndAt] = useState(null);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [todayStats, setTodayStats] = useState({ totalTimeMs: 0, activeTimeMs: 0, idleTimeMs: 0, breaksTimeMs: 0, graceTimeMs: 0 });
  // live tracking
  const [localIdleMs, setLocalIdleMs] = useState(0);
  const [localBreakMs, setLocalBreakMs] = useState(0);
  const liveActiveMs = Math.max(0, Math.max(0, elapsed) - localIdleMs - localBreakMs);

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
      const em = emailRef.current.value.trim();
      setEmail(em);
      try { window.trackerAPI?.setUserEmail(em); } catch {}
      try { localStorage.setItem('pf_tracker_email', em); } catch {}
    } catch (e) {
      setMessage(e.message);
    }
  };

  const start = async () => {
    setMessage('Starting...');
    const userEmail = (emailRef.current?.value || email || '').trim();
    if (!userEmail) { setMessage('Email not set. Please connect first.'); return; }
    try {
      const res = await fetch(`${BASE_URL}/tracker/start`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail })
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setMessage(data.message || 'Failed to start'); return; }
      setSessionId(data.sessionId);
      setStartTs(Date.now());
      setLocalIdleMs(0);
      setLocalBreakMs(0);
      setMessage('Tracking');
      try { await refreshTodayData(userEmail); } catch {}
    } catch (err) {
      setMessage('Network error while starting');
    }
    setPunchInAt(new Date());
    setPunchOutAt(null);
  };

  const stop = async () => {
    if (!sessionId) return;
    setMessage('Stopping...');
    try {
      const res = await fetch(`${BASE_URL}/tracker/stop`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, graceMs: 7 * 60 * 1000 })
      });
      try {
        const data = await res.json();
        if (data && data.success) {
          // reflect totals from server response immediately
          setTodayStats((prev) => ({ ...prev, totalTimeMs: data.totalTimeMs || prev.totalTimeMs, activeTimeMs: data.activeTimeMs || prev.activeTimeMs }));
        }
      } catch {}
    } catch {}
    setSessionId(null);
    setStartTs(null);
    setElapsed(0);
    setMessage('Ended');
    setPunchOutAt(new Date());
    try { await refreshTodayData(); } catch {}
  };

  const pushBreak = async (type, minutes) => {
    if (!sessionId) return;
    const now = new Date();
    // Use start/end endpoints to match server API
    try {
      await fetch(`${BASE_URL}/tracker/break/start`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, type, startedAt: now })
      });
    } catch {}
    setBreakStartAt(now);
    setIsOnBreak(true);
    // Auto end after minutes
    const endAt = new Date(now.getTime() + minutes * 60 * 1000);
    try {
      await fetch(`${BASE_URL}/tracker/break/end`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, endedAt: endAt })
      });
      setBreakEndAt(endAt);
      setLocalBreakMs((ms) => ms + Math.max(0, endAt - now));
    } finally {
      setIsOnBreak(false);
      setMessage(`Break recorded: ${type}`);
      try { await refreshTodayData(); } catch {}
    }
  };

  // Manual Break controls (no preset duration)
  const breakStart = async () => {
    if (!sessionId) return;
    const now = new Date();
    await fetch(`${BASE_URL}/tracker/break/start`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, type: 'manual', startedAt: now })
    });
    setBreakStartAt(now);
    setIsOnBreak(true);
    setMessage('Break started');
  };

  const breakEnd = async () => {
    if (!sessionId || !isOnBreak) return;
    const endAt = new Date();
    await fetch(`${BASE_URL}/tracker/break/end`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, endedAt: endAt })
    });
    setBreakEndAt(endAt);
    if (breakStartAt) setLocalBreakMs((ms) => ms + Math.max(0, endAt - new Date(breakStartAt)));
    setIsOnBreak(false);
    setMessage('Break ended');
  };

  // idle detection (31s rule)
  useEffect(() => {
    let lastActivityTs = Date.now();
    let idleTimer = null;

    const pushIdleIfNeeded = () => {
      if (!sessionId) return;
      const now = Date.now();
      if (now - lastActivityTs > 31000) {
        const started = new Date(lastActivityTs + 31000);
        const ended = new Date();
        fetch(`${BASE_URL}/tracker/idle`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, startedAt: started, endedAt: ended })
        }).catch(() => {});
        setLocalIdleMs((ms) => ms + Math.max(0, ended - started));
        lastActivityTs = now;
      }
    };

    const setIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(pushIdleIfNeeded, 31000);
    };

    const isModifierKey = (e) => {
      const k = e.key;
      return k === 'Shift' || k === 'Control' || k === 'Alt' || k === 'Meta' || k === 'CapsLock';
    };

    const onKeyDown = (e) => {
      if (!sessionId) return;
      if (isModifierKey(e)) return; // ignore modifier-only presses
      lastActivityTs = Date.now();
      setIdleTimer();
    };

    const onMouseDown = () => {
      if (!sessionId) return;
      lastActivityTs = Date.now();
      setIdleTimer();
    };

    window.addEventListener('keydown', onKeyDown, { passive: true });
    window.addEventListener('mousedown', onMouseDown, { passive: true });
    setIdleTimer();

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('mousedown', onMouseDown);
      if (idleTimer) clearTimeout(idleTimer);
    };
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

  // Load saved email on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pf_tracker_email');
      if (saved) setEmail(saved);
    } catch {}
  }, []);

  // Fetch today's stats and latest session/break info
  const refreshTodayData = async (eml) => {
    const emailQ = (eml || email || '').trim();
    if (!emailQ) return;
    try {
      const [statsRes, listRes] = await Promise.all([
        fetch(`${BASE_URL}/tracker/stats/today?email=${encodeURIComponent(emailQ)}`),
        fetch(`${BASE_URL}/tracker/sessions/today?email=${encodeURIComponent(emailQ)}`)
      ]);
      const stats = await statsRes.json();
      const list = await listRes.json();
      if (stats?.success) setTodayStats(stats);
      if (list?.success && Array.isArray(list.sessions) && list.sessions.length) {
        const latest = list.sessions[0];
        setPunchInAt(latest.startedAt ? new Date(latest.startedAt) : null);
        setPunchOutAt(latest.endedAt ? new Date(latest.endedAt) : null);
        // Break info
        const breaks = Array.isArray(latest.breaks) ? latest.breaks : [];
        if (breaks.length) {
          const lastBr = breaks.reduce((a, b) => (new Date(a.startedAt) > new Date(b.startedAt) ? a : b));
          setBreakStartAt(lastBr.startedAt ? new Date(lastBr.startedAt) : null);
          setBreakEndAt(lastBr.endedAt ? new Date(lastBr.endedAt) : null);
          setIsOnBreak(Boolean(lastBr.isOngoing));
        } else {
          setBreakStartAt(null);
          setBreakEndAt(null);
          setIsOnBreak(false);
        }
        // If the latest session is running, adopt its id for live ops
        if (latest.status === 'running') setSessionId(latest._id);
      }
    } catch {}
  };

  useEffect(() => {
    if (screen !== 'track') return;
    refreshTodayData();
    const t = setInterval(() => refreshTodayData(), 30000);
    return () => clearInterval(t);
  }, [screen, email]);

  const fmt = (d) => (d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—');
  const fmtDur = (ms) => (ms ? format(ms) : '00:00:00');

  const Welcome = () => (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-2">Welcome to ProjectFlow Tracker </h1>
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
      <div className="flex flex-wrap gap-2 mt-3">
        <button onClick={start} className="px-3 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700">Start</button>
        <button onClick={stop} className="px-3 py-2 rounded-md bg-rose-600 hover:bg-rose-700">Stop</button>
        <button onClick={start} className="px-3 py-2 rounded-md bg-emerald-700/40 border border-emerald-800">Punch In</button>
        <button onClick={stop} className="px-3 py-2 rounded-md bg-rose-700/40 border border-rose-800">Punch Out</button>
        <button onClick={breakStart} disabled={!sessionId || isOnBreak} className="px-3 py-2 rounded-md bg-slate-800 border border-slate-700 disabled:opacity-50">Break Start</button>
        <button onClick={breakEnd} disabled={!sessionId || !isOnBreak} className="px-3 py-2 rounded-md bg-slate-800 border border-slate-700 disabled:opacity-50">Break End</button>
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        <button onClick={() => pushBreak('tea15', 15)} className="px-3 py-2 rounded-md bg-slate-800 border border-slate-700">Tea 15m</button>
        <button onClick={() => pushBreak('full45', 45)} className="px-3 py-2 rounded-md bg-slate-800 border border-slate-700">Lunch 45m</button>
        <button onClick={() => pushBreak('meeting15', 15)} className="px-3 py-2 rounded-md bg-slate-800 border border-slate-700">Meeting 15m</button>
        <button onClick={() => pushBreak('meeting15_2', 15)} className="px-3 py-2 rounded-md bg-slate-800 border border-slate-700">Meeting 15m</button>
        <button onClick={() => { const v = Number(prompt('Custom break minutes?', '10')) || 0; if (v > 0) pushBreak('custom', v); }} className="px-3 py-2 rounded-md bg-slate-800 border border-slate-700">Custom</button>
      </div>
      {/* Read-only info panels */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
          <div className="text-sm text-slate-400 mb-2">Punch & Break</div>
          <div className="space-y-1 text-slate-200 text-sm">
            <div className="flex justify-between"><span>Punch In</span><span className="tabular-nums">{fmt(punchInAt)}</span></div>
            <div className="flex justify-between"><span>Punch Out</span><span className="tabular-nums">{fmt(punchOutAt)}</span></div>
            <div className="flex justify-between"><span>Break Start</span><span className="tabular-nums">{fmt(breakStartAt)}</span></div>
            <div className="flex justify-between"><span>Break End</span><span className="tabular-nums">{isOnBreak ? 'Ongoing' : fmt(breakEndAt)}</span></div>
          </div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
          <div className="text-sm text-slate-400 mb-2">Today's Stats</div>
          <div className="space-y-1 text-slate-200 text-sm">
            <div className="flex justify-between"><span>Total</span><span className="tabular-nums">{fmtDur(todayStats.totalTimeMs)}</span></div>
            <div className="flex justify-between"><span>Active</span><span className="tabular-nums">{sessionId ? fmtDur(liveActiveMs) : fmtDur(todayStats.activeTimeMs)}</span></div>
            <div className="flex justify-between"><span>Idle</span><span className="tabular-nums">{sessionId ? fmtDur(localIdleMs) : fmtDur(todayStats.idleTimeMs)}</span></div>
            <div className="flex justify-between"><span>Breaks</span><span className="tabular-nums">{fmtDur(todayStats.breaksTimeMs)}</span></div>
            <div className="flex justify-between"><span>Grace</span><span className="tabular-nums">{fmtDur(todayStats.graceTimeMs)}</span></div>
          </div>
        </div>
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


