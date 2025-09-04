import React, { useEffect, useRef, useState } from 'react';

const toMs = (min) => (Math.max(0, Number(min) || 0) * 60 * 1000);
const fmtDur = (ms) => {
  const safe = Math.max(0, Number(ms) || 0);
  const s = Math.floor(safe / 1000) % 60;
  const m = Math.floor(safe / (1000 * 60)) % 60;
  const h = Math.floor(safe / (1000 * 60 * 60));
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};
const fmtIST = (dateLike) => {
  if (!dateLike) return '—';
  if (typeof dateLike === 'string') {
    const m = dateLike.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})/);
    if (m) {
      const hh = Number(m[2]);
      const mm = Number(m[3]);
      const ss = Number(m[4]);
      const pad = (n) => String(n).padStart(2, '0');
      const hr12 = ((hh + 11) % 12) + 1;
      const ampm = hh < 12 ? 'am' : 'pm';
      return `${pad(hr12)}:${pad(mm)}:${pad(ss)} ${ampm}`;
    }
  }
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: true, timeZone: 'Asia/Kolkata'
  }).format(date);
};

// Convert potential IST-as-UTC strings to correct epoch ms
const toEpochMs = (dateLike) => {
  if (!dateLike) return NaN;
  if (typeof dateLike === 'string') {
    const m = dateLike.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})/);
    if (m) {
      // Treat the string as IST wall-clock and convert to UTC epoch by subtracting 5.5h
      const parsed = new Date(dateLike).getTime();
      if (!Number.isNaN(parsed)) return parsed - (5.5 * 60 * 60 * 1000);
    }
  }
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
  return d.getTime();
};

export default function Track({ onStatus }) {
  const [sessionId, setSessionId] = useState(null);
  const [message, setMessage] = useState('');
  const [punchInAt, setPunchInAt] = useState(null);
  const [punchOutAt, setPunchOutAt] = useState(null);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [breakStartAt, setBreakStartAt] = useState(null);
  const [breakEndAt, setBreakEndAt] = useState(null);
  const [allBreaks, setAllBreaks] = useState([]);
  const [baseTotals, setBaseTotals] = useState({ total: 0, productive: 0, idle: 0, breaks: 0 });
  const [breakCount, setBreakCount] = useState(0);
  const [totalWorkTime, setTotalWorkTime] = useState(0);
  const [totalProductiveTime, setTotalProductiveTime] = useState(0);
  const startRef = useRef(null);
  const tickRef = useRef(null);
  const optimisticActiveRef = useRef(false);
  const productiveFrozenRef = useRef(null);
  const idleRef = useRef({ isIdle: false, lastActivityAt: Date.now(), timer: null, idleStartedAt: null });

  // Break UI state
  const [breakMode, setBreakMode] = useState(''); // '' (select) | manual | auto | lunch | meeting
  const [manualReason, setManualReason] = useState('');
  const [manualReady, setManualReady] = useState(false); // set true after submitting reason

  const elapsedNow = () => (startRef.current ? Date.now() - startRef.current : 0);

  useEffect(() => () => { if (tickRef.current) clearInterval(tickRef.current); }, []);

  // Idle detection (30s)
  useEffect(() => {
    const thresholdMs = 30000;
    const markActivity = async () => {
      idleRef.current.lastActivityAt = Date.now();
      if (idleRef.current.isIdle) {
        // Exit idle immediately on activity
        try {
          const res = await window.trackerAPI?.idleEnd?.({ endedAt: new Date().toISOString() });
          if (res?.success) {
            // Don't update local state here - let syncStatus handle it from server
            // This prevents race conditions with server data
            // Force immediate sync to get updated idle time from server
            setTimeout(() => syncStatus(), 100);
          }
        } catch (error) {
          console.error('Failed to end idle:', error);
        }
        idleRef.current.isIdle = false;
        idleRef.current.idleStartedAt = null;
        setMessage('Idle ended');
        // Resume productive display
        productiveFrozenRef.current = null;
      }
    };
    const checkIdle = async () => {
      if (!sessionId) return;
      if (isOnBreak) return; // break supersedes idle
      const now = Date.now();
      if (!idleRef.current.isIdle && now - idleRef.current.lastActivityAt >= thresholdMs) {
        idleRef.current.isIdle = true;
        idleRef.current.idleStartedAt = now;
        setMessage('Idle started');
        try {
          const res = await window.trackerAPI?.idleStart?.({ 
            idleType: 'auto', 
            startedAt: new Date().toISOString() 
          });
          if (res?.success) {
            // Freeze productive when idle starts
            productiveFrozenRef.current = baseTotals.productive + elapsedNow();
          }
        } catch (error) {
          console.error('Failed to start idle:', error);
          // Revert idle state if API call failed
          idleRef.current.isIdle = false;
          idleRef.current.idleStartedAt = null;
        }
      }
    };
    const events = ['mousemove','mousedown','keydown','wheel','touchstart'];
    events.forEach(ev => window.addEventListener(ev, markActivity, { passive: true }));
    const t = setInterval(checkIdle, 1000);
    return () => {
      events.forEach(ev => window.removeEventListener(ev, markActivity));
      clearInterval(t);
    };
  }, [sessionId, isOnBreak]);

  const ensureTicker = () => {
    if (tickRef.current) return;
    tickRef.current = setInterval(() => {
      // trigger re-render
      setBaseTotals((t) => ({ ...t }));
    }, 1000);
  };

  const syncStatus = async () => {
    try {
      const res = await window.trackerAPI?.getStatus();
      if (!res || res.success === false) return;
      onStatus?.(res.employeeInfo || null);
      const st = res.status || {};
      const cur = st.currentSession || null;
      if (cur && cur.isActive) {
        optimisticActiveRef.current = false;
        setSessionId((s) => s || cur.sessionId || true);
        const start = cur.startTime ? new Date(cur.startTime).getTime() : Date.now();
        if (!startRef.current) startRef.current = start;
        // Keep server-provided timestamp as raw string to avoid double IST shift
        setPunchInAt((p) => p || (cur.startTime ? cur.startTime : new Date()));
        setPunchOutAt(null);
        ensureTicker();
        // Derive status
        try {
          const activeBreak = cur.breaks && cur.breaks.find(b => b && b.isActive);
          if (activeBreak) setMessage('On break'); else setMessage('Tracking');
        } catch {}
      } else {
        // Only clear local session state if we're not in an optimistic start
        if (!optimisticActiveRef.current) {
          setSessionId(null);
          if (st?.todaySummary?.lastPunchOut) setPunchOutAt(st.todaySummary.lastPunchOut);
          startRef.current = null;
          setMessage('Ended');
        }
      }
      
      const day = st.todaySummary || {};
      const curDur = toMs(cur?.duration || 0);
      const curProd = toMs(cur?.productiveTime || 0);
      const curBreak = toMs(cur?.breakTime || 0);
      
      setBaseTotals({
        total: Math.max(0, toMs(day.totalWorkTime || 0) - curDur),
        productive: Math.max(0, toMs(day.totalProductiveTime || 0) - curProd),
        idle: toMs(day.totalIdleTime || 0),
        breaks: Math.max(0, toMs(day.totalBreakTime || 0) - curBreak)
      });
      
      // Handle breaks properly
      if (cur && Array.isArray(cur.breaks)) {
        const completedBreaks = cur.breaks.filter(b => b && !b.isActive);
        const activeBreak = cur.breaks.find(b => b && b.isActive);
        
        setAllBreaks(completedBreaks);
        setBreakCount(completedBreaks.length);
        
        if (activeBreak && activeBreak.startTime) {
          setIsOnBreak(true);
          // Keep as raw string
          setBreakStartAt(activeBreak.startTime);
          setBreakEndAt(null);
        } else {
          setIsOnBreak(false);
          setBreakStartAt(null);
          if (completedBreaks.length > 0) {
            // Keep as raw string
            setBreakEndAt(completedBreaks[completedBreaks.length - 1].endTime);
          }
        }
      } else {
        setAllBreaks([]);
        setBreakCount(0);
        setIsOnBreak(false);
        setBreakStartAt(null);
        setBreakEndAt(null);
      }
      
      // Calculate total work time and productive time
      const totalWork = toMs(day.totalWorkTime || 0) + elapsedNow();
      const totalBreak = toMs(day.totalBreakTime || 0);
      const totalIdle = toMs(day.totalIdleTime || 0);
      
      setTotalWorkTime(totalWork);
      setTotalProductiveTime(Math.max(0, totalWork - totalBreak - totalIdle));
      
    } catch {}
  };

  useEffect(() => {
    let t; let i = 0;
    const run = async () => { await syncStatus(); };
    run();
    t = setInterval(async () => {
      await run();
      i += 1;
      if (i >= 5) { clearInterval(t); t = setInterval(run, 15000); }
    }, 2000);
    return () => { if (t) clearInterval(t); };
  }, []);

  const punchIn = async () => {
    setMessage('Starting...');
    if (!startRef.current) startRef.current = Date.now();
    // Optimistically mark as in-session and force a rerender so timer starts immediately
    optimisticActiveRef.current = true;
    setSessionId((s) => s || true);
    setBaseTotals((t) => ({ ...t }));
    ensureTicker();
    try {
      const res = await window.trackerAPI?.punchIn();
      if (res?.session?.startTime) setPunchInAt(res.session.startTime);
      setSessionId((s) => s || res?.session?.sessionId || true);
      setMessage('Tracking');
      // Reset break UI on new session
      setBreakMode('');
      setManualReason('');
      setManualReady(false);
      await syncStatus();
    } catch { setMessage('Failed to punch in'); startRef.current = null; }
  };

  const punchOut = async () => {
    setMessage('Stopping...');
    try {
      // If idle, close idle span before punch out
      if (idleRef.current.isIdle) {
        try { 
          const idleRes = await window.trackerAPI?.idleEnd?.({ endedAt: new Date().toISOString() });
          if (idleRes?.success) {
            // Don't update local state here - let syncStatus handle it from server
            // This prevents race conditions with server data
            // Force immediate sync to get updated idle time from server
            setTimeout(() => syncStatus(), 100);
          }
        } catch (error) {
          console.error('Failed to end idle before punch out:', error);
        }
        idleRef.current.isIdle = false;
        idleRef.current.idleStartedAt = null;
        productiveFrozenRef.current = null;
      }
      const res = await window.trackerAPI?.punchOut();
      if (res?.endedSession?.endTime) {
        // Keep as raw string
        setPunchOutAt(res.endedSession.endTime);
      }
      startRef.current = null;
      setSessionId(null);
      await syncStatus();
      setMessage('Ended');
      // Reset break UI on end
      setManualReason('');
      setManualReady(false);
      setBreakMode('');
    } catch { setMessage('Failed to punch out'); }
  };

  const startBreak = async () => {
    setMessage('Starting break...');
    try {
      // If currently idle, end idle first
      if (idleRef.current.isIdle) {
        try { 
          const idleRes = await window.trackerAPI?.idleEnd?.({ endedAt: new Date().toISOString() });
          if (idleRes?.success) {
            // Don't update local state here - let syncStatus handle it from server
            // This prevents race conditions with server data
            // Force immediate sync to get updated idle time from server
            setTimeout(() => syncStatus(), 100);
          }
        } catch (error) {
          console.error('Failed to end idle before break:', error);
        }
        idleRef.current.isIdle = false;
        idleRef.current.idleStartedAt = null;
      }
      const res = await window.trackerAPI?.startBreak({
        breakType: breakMode,
        reason: breakMode === 'manual' ? manualReason.trim() : '',
      });
      if (res?.success) {
        setIsOnBreak(true);
        // Use server response time if available, otherwise use current time
        setBreakStartAt(res.break?.startTime || new Date());
        setMessage('On break');
        // Freeze productive display at break start to avoid drift from server rounding
        productiveFrozenRef.current = baseTotals.productive + elapsedNow();
      }
      await syncStatus();
    } catch { setMessage('Failed to start break'); }
  };

  const endBreak = async () => {
    setMessage('Ending break...');
    try {
      const res = await window.trackerAPI?.endBreak({
        breakType: breakMode,
        reason: breakMode === 'manual' ? manualReason.trim() : '',
      });
      if (res?.success) {
        setIsOnBreak(false);
        setBreakEndAt(new Date());
        setMessage('Break ended');
        // Require selecting/saving break type again before next break
        setManualReady(false);
        setBreakMode('');
        productiveFrozenRef.current = null;
      }
      await syncStatus();
    } catch { setMessage('Failed to end break'); }
  };

  const elapsed = elapsedNow();
  const dynamicBreakMs = isOnBreak && breakStartAt ? Math.max(0, Date.now() - toEpochMs(breakStartAt)) : 0;

  return (
    <div className="p-8 bg-white">
      <div className="rounded-xl border border-gray-200 shadow-sm bg-white/90">
        <div className="px-6 py-6">
          <div className="flex items-end flex-wrap gap-4">
            <div>
              <div className="text-5xl font-semibold tabular-nums tracking-tight text-gray-900">{fmtDur(elapsed)}</div>
              <div className="text-xs text-gray-500 mt-1 min-h-[18px]">{message || (sessionId ? 'Tracking' : 'Ended')}</div>
            </div>
            <div className="flex gap-3 mt-1 flex-wrap items-center">
              <button type="button" onClick={punchIn} className="px-3 py-2 rounded-md bg-emerald-600 text-white border border-emerald-700 hover:bg-emerald-700 shadow-sm disabled:opacity-50" disabled={!!sessionId}>Punch In</button>
              <button type="button" onClick={punchOut} className="px-3 py-2 rounded-md bg-rose-600 text-white border border-rose-700 hover:bg-rose-700 shadow-sm disabled:opacity-50" disabled={!sessionId}>Punch Out</button>
              {sessionId && (
                <div className="flex items-center gap-2">
                  <select
                    className="border border-gray-300 rounded-md px-2 py-2 bg-white text-sm text-gray-900"
                    value={breakMode}
                    onChange={(e) => {
                      const v = e.target.value;
                      setBreakMode(v);
                      if (v === 'manual') { setManualReady(false); }
                      else if (v) { setManualReady(true); setManualReason(''); }
                    }}
                  >
                    <option value="">Select Break</option>
                    <option value="manual">Break: Manual</option>
                    <option value="auto">Break: Auto</option>
                    <option value="lunch">Break: Lunch</option>
                    <option value="meeting">Break: Meeting</option>
                  </select>

                  {!isOnBreak && (!manualReady && breakMode === 'manual') && (
                    <div className="flex items-center gap-2">
                      <input
                        className="border border-gray-300 rounded-md px-2 py-2 text-sm w-48 placeholder-gray-500 text-gray-900"
                        placeholder="Reason"
                        value={manualReason}
                        onChange={(e) => setManualReason(e.target.value)}
                      />
                      <button
                        type="button"
                        className="px-3 py-2 rounded-md bg-gray-900 text-white shadow-sm disabled:opacity-50"
                        onClick={() => setManualReady(!!manualReason.trim())}
                        disabled={!manualReason.trim()}
                      >
                        Save
                      </button>
                    </div>
                  )}

                  {/* Start/End Break visibility rules */}
                  {breakMode && (manualReady || breakMode !== 'manual') && (
                    <button
                      type="button"
                      onClick={startBreak}
                      className="px-3 py-2 rounded-md bg-amber-500 text-white border border-amber-600 hover:bg-amber-600 shadow-sm disabled:opacity-50"
                      disabled={isOnBreak}
                    >
                      Start Break
                    </button>
                  )}
                  {isOnBreak && (
                    <button type="button" onClick={endBreak} className="px-3 py-2 rounded-md bg-blue-500 text-white border border-blue-600 hover:bg-blue-600 shadow-sm">End Break</button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="text-sm font-medium text-gray-800 mb-3">Punch & Break</div>
              <div className="space-y-1 text-gray-900 text-sm">
                <div className="flex justify-between"><span>Punch In</span><span className="tabular-nums">{fmtIST(punchInAt)}</span></div>
                <div className="flex justify-between"><span>Punch Out</span><span className="tabular-nums">{fmtIST(punchOutAt)}</span></div>
                <div className="flex justify-between"><span>Break Start</span><span className="tabular-nums">{fmtIST(breakStartAt)}</span></div>
                <div className="flex justify-between"><span>Break End</span><span className="tabular-nums">{isOnBreak ? 'Ongoing' : fmtIST(breakEndAt)}</span></div>
                <div className="flex justify-between"><span>Break Elapsed</span><span className="tabular-nums text-blue-600">{fmtDur(isOnBreak ? dynamicBreakMs : 0)}</span></div>
                <div className="flex justify-between"><span>Idle Elapsed</span><span className="tabular-nums text-purple-600">{fmtDur(idleRef.current.isIdle && idleRef.current.idleStartedAt ? (Date.now() - idleRef.current.idleStartedAt) : 0)}</span></div>
                <div className="flex justify-between border-t border-gray-200 pt-1 mt-2"><span>Elapsed</span><span className="tabular-nums text-emerald-600">{fmtDur(elapsed)}</span></div>
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="text-sm font-medium text-gray-800 mb-3">Today's Stats</div>
              <div className="space-y-1 text-gray-900 text-sm">
                <div className="flex justify-between"><span>Total Work Time</span><span className="tabular-nums text-gray-900">{fmtDur(baseTotals.total + elapsed)}</span></div>
                <div className="flex justify-between"><span>Total Productive</span><span className="tabular-nums text-gray-900">{fmtDur(
                  ( (isOnBreak || idleRef.current.isIdle) && productiveFrozenRef.current != null )
                    ? productiveFrozenRef.current
                    : Math.max(0, baseTotals.productive + elapsed - (idleRef.current.isIdle && idleRef.current.idleStartedAt ? (Date.now() - idleRef.current.idleStartedAt) : 0))
                )}</span></div>
                <div className="flex justify-between"><span>Idle</span><span className="tabular-nums text-gray-900">{fmtDur(baseTotals.idle + (idleRef.current.isIdle && idleRef.current.idleStartedAt ? (Date.now() - idleRef.current.idleStartedAt) : 0))}</span></div>
                <div className="flex justify-between"><span>Breaks</span><span className="tabular-nums text-gray-900">{fmtDur(baseTotals.breaks + dynamicBreakMs)}</span></div>
                <div className="flex justify-between border-t border-gray-200 pt-1 mt-2"><span>Break Count</span><span className="tabular-nums text-blue-600">{breakCount}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}