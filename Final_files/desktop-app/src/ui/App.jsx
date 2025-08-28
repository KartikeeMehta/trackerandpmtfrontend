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
    console.log('Timer effect triggered - startTs:', startTs);
    if (!startTs) {
      console.log('No startTs, timer not starting');
      return;
    }
    console.log('Starting timer interval');
    const t = setInterval(() => {
      const newElapsed = Date.now() - startTs;
      setElapsed(newElapsed);
      console.log('Timer tick - elapsed:', newElapsed);
    }, 1000);
    return () => {
      console.log('Clearing timer interval');
      clearInterval(t);
    };
  }, [startTs]);

  const connect = async (e) => {
    e.preventDefault();
    const emailValue = emailRef.current?.value?.trim();
    const otpValue = otpRef.current?.value?.trim();
    
    console.log('Connecting...', emailValue, otpValue);
    console.log('Email ref current:', emailRef.current);
    console.log('Email ref value:', emailRef.current?.value);
    
    if (!emailValue || !otpValue) {
      console.log('Missing email or OTP');
      setMessage('Email and OTP are required');
      return;
    }
    
    setMessage('Connecting...');
    try {
      const res = await fetch(`http://localhost:8000/api/pairing/verify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailValue, pairingOTP: otpValue })
      });
      const data = await res.json();
      console.log('Connect response:', data);
      if (!data.success) throw new Error(data.message || 'Failed to connect');
      
      setStatus('connected');
      setMessage('Connected');
      setScreen('track');
      
      // Set email in state
      setEmail(emailValue);
      console.log('Email set to state:', emailValue);
      
      try { 
        window.trackerAPI?.setUserEmail(emailValue); 
        console.log('Email set to tracker API');
      } catch (err) {
        console.log('Failed to set email in tracker API:', err);
      }
      
      try { 
        localStorage.setItem('pf_tracker_email', emailValue); 
        console.log('Email saved to localStorage');
      } catch (err) {
        console.log('Failed to save email to localStorage:', err);
      }
      
    } catch (e) {
      console.error('Connect error:', e);
      setMessage(e.message);
    }
  };

  const start = async () => {
    console.log('=== PUNCH IN BUTTON CLICKED ===');
    console.log('Punch In clicked!');
    setMessage('Starting...');
    
    // Use the stored email from state, not from input field
    const userEmail = email.trim();
    console.log('User email from state:', userEmail);
    
    if (!userEmail) { 
      console.log('No email found in state');
      setMessage('Email not set. Please connect first.'); 
      return; 
    }

    // Start timer immediately for better UX
    const now = Date.now();
    console.log('Starting timer at:', now);
    setStartTs(now);
    setElapsed(0);
    setPunchInAt(new Date());
    setPunchOutAt(null);
    setLocalIdleMs(0);
    setLocalBreakMs(0);
    setMessage('Tracking...');

    try {
      console.log("Making API call to:", `http://localhost:8000/api/tracker/start`);
      console.log("With email:", userEmail);
      
      const res = await fetch(`http://localhost:8000/api/tracker/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail })
      });
      
      console.log("Response status:", res.status);
      console.log("Response ok:", res.ok);
      
      const data = await res.json();
      console.log("API Response:", data);
      
      if (!res.ok || !data.success) { 
        console.log("API failed:", data.message);
        setMessage(data.message || 'Failed to start'); 
        // Reset timer if API fails
        setStartTs(null);
        setElapsed(0);
        setPunchInAt(null);
        return; 
      }

      setSessionId(data.sessionId);
      setMessage('Tracking');

      try { 
        await refreshTodayData(userEmail); 
      } catch {}
      
    } catch (err) {
      console.log("Network error:", err);
      setMessage('Network error while starting');
      // Reset timer if network error
      setStartTs(null);
      setElapsed(0);
      setPunchInAt(null);
    }
  };

  const stop = async () => {
    console.log('=== PUNCH OUT BUTTON CLICKED ===');
    console.log('Punch Out clicked!');
    if (!sessionId) {
      console.log('No session ID found');
      return;
    }
    setMessage('Stopping...');
    const stopTime = new Date();
    setPunchOutAt(stopTime);
    
    try {
      const res = await fetch(`http://localhost:8000/api/tracker/stop`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, graceMs: 7 * 60 * 1000 })
      });
      try {
        const data = await res.json();
        console.log('Stop response:', data);
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
    try { await refreshTodayData(); } catch {}
  };

  const pushBreak = async (type, minutes) => {
    console.log('Push break clicked:', type, minutes);
    if (!sessionId) return;
    const now = new Date();
    setBreakStartAt(now);
    setIsOnBreak(true);
    setMessage(`Break started: ${type}`);
    
    // Use start/end endpoints to match server API
    try {
      await fetch(`http://localhost:8000/api/tracker/break/start`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, type, startedAt: now })
      });
    } catch {}
    
    // Auto end after minutes
    const endAt = new Date(now.getTime() + minutes * 60 * 1000);
    try {
      await fetch(`http://localhost:8000/api/tracker/break/end`, {
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
    console.log('=== BREAK START BUTTON CLICKED ===');
    console.log('Break Start clicked!');
    if (!sessionId) return;
    const now = new Date();
    setBreakStartAt(now);
    setIsOnBreak(true);
    setMessage('Break started');
    
    await fetch(`http://localhost:8000/api/tracker/break/start`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, type: 'manual', startedAt: now })
    });
  };

  const breakEnd = async () => {
    console.log('=== BREAK END BUTTON CLICKED ===');
    console.log('Break End clicked!');
    if (!sessionId || !isOnBreak) return;
    const endAt = new Date();
    setBreakEndAt(endAt);
    setMessage('Break ended');
    
    await fetch(`http://localhost:8000/api/tracker/break/end`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, endedAt: endAt })
    });
    
    if (breakStartAt) setLocalBreakMs((ms) => ms + Math.max(0, endAt - new Date(breakStartAt)));
    setIsOnBreak(false);
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
        fetch(`http://localhost:8000/api/tracker/idle`, {
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
      if (saved) {
        setEmail(saved);
        console.log('Loaded saved email:', saved);
      }
    } catch {}
  }, []);

  // Debug email state when screen changes
  useEffect(() => {
    console.log('Screen changed to:', screen);
    console.log('Current email state:', email);
    console.log('Current status:', status);
  }, [screen, email, status]);

  // Fetch today's stats and latest session/break info
  const refreshTodayData = async (eml) => {
    const emailQ = (eml || email || '').trim();
    if (!emailQ) return;
    try {
      const [statsRes, listRes] = await Promise.all([
        fetch(`http://localhost:8000/api/tracker/stats/today?email=${encodeURIComponent(emailQ)}`),
        fetch(`http://localhost:8000/api/tracker/sessions/today?email=${encodeURIComponent(emailQ)}`)
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
      <h1 className="text-2xl font-semibold mb-2">Welcome to ProjectFlow Tracker hello developer </h1>
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
        <button type="submit" className="rounded-md bg-sky-600 hover:bg-sky-700 px-4 py-2">Connect</button>
      </form>
      <div className="text-xs text-slate-400 mt-2 min-h-[18px]">{message}</div>
    </div>
  );

  const Track = () => (
    <div className="p-8">
      <div className="text-4xl font-bold tabular-nums tracking-wide">{format(elapsed)}</div>
      <div className="flex flex-wrap gap-2 mt-3">
        <button 
          onClick={start} 
          className="px-3 py-2 rounded-md bg-emerald-700/40 border border-emerald-800 hover:bg-emerald-600/40"
          disabled={!!sessionId}
        >
          Punch In
        </button>
        <button 
          onClick={stop} 
          className="px-3 py-2 rounded-md bg-rose-700/40 border border-rose-800 hover:bg-rose-600/40"
          disabled={!sessionId}
        >
          Punch Out
        </button>
        <button 
          onClick={breakStart} 
          disabled={!sessionId || isOnBreak} 
          className="px-3 py-2 rounded-md bg-slate-800 border border-slate-700 disabled:opacity-50 hover:bg-slate-700"
        >
          Break Start
        </button>
        <button 
          onClick={breakEnd} 
          disabled={!sessionId || !isOnBreak} 
          className="px-3 py-2 rounded-md bg-slate-800 border border-slate-700 disabled:opacity-50 hover:bg-slate-700"
        >
          Break End
        </button>
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        <button onClick={() => pushBreak('tea15', 15)} className="px-3 py-2 rounded-md bg-slate-800 border border-slate-700 hover:bg-slate-700">Tea 15m</button>
        <button onClick={() => pushBreak('full45', 45)} className="px-3 py-2 rounded-md bg-slate-800 border border-slate-700 hover:bg-slate-700">Lunch 45m</button>
        <button onClick={() => pushBreak('meeting15', 15)} className="px-3 py-2 rounded-md bg-slate-800 border border-slate-700 hover:bg-slate-700">Meeting 15m</button>
        <button onClick={() => pushBreak('meeting15_2', 15)} className="px-3 py-2 rounded-md bg-slate-800 border border-slate-700 hover:bg-slate-700">Meeting 15m</button>
        <button onClick={() => { const v = Number(prompt('Custom break minutes?', '10')) || 0; if (v > 0) pushBreak('custom', v); }} className="px-3 py-2 rounded-md bg-slate-800 border border-slate-700 hover:bg-slate-700">Custom</button>
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
            <div className="flex justify-between border-t border-slate-700 pt-1 mt-2"><span>Elapsed</span><span className="tabular-nums text-emerald-400">{format(elapsed)}</span></div>
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
            <div className="font-semibold">ProjectFlow Trackeraaa</div>
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


