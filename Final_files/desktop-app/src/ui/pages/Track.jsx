import React, { useEffect, useRef, useState } from 'react';

const toMs = (min) => (Math.max(0, Math.round(Number(min) || 0)) * 60 * 1000);
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

  const elapsedNow = () => (startRef.current ? Date.now() - startRef.current : 0);

  useEffect(() => () => { if (tickRef.current) clearInterval(tickRef.current); }, []);

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
        setSessionId((s) => s || cur.sessionId || true);
        const start = cur.startTime ? new Date(cur.startTime).getTime() : Date.now();
        if (!startRef.current) startRef.current = start;
        setPunchInAt((p) => p || (cur.startTime ? new Date(cur.startTime) : new Date()));
        setPunchOutAt(null);
        ensureTicker();
      } else {
        setSessionId(null);
        if (st?.todaySummary?.lastPunchOut) setPunchOutAt(new Date(st.todaySummary.lastPunchOut));
        startRef.current = null;
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
          setBreakStartAt(new Date(activeBreak.startTime));
          setBreakEndAt(null);
        } else {
          setIsOnBreak(false);
          setBreakStartAt(null);
          if (completedBreaks.length > 0) {
            setBreakEndAt(new Date(completedBreaks[completedBreaks.length - 1].endTime));
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
    ensureTicker();
    try {
      const res = await window.trackerAPI?.punchIn();
      if (res?.session?.startTime) setPunchInAt(new Date(res.session.startTime));
      setSessionId((s) => s || res?.session?.sessionId || true);
      setMessage('Tracking');
      await syncStatus();
    } catch { setMessage('Failed to punch in'); startRef.current = null; }
  };

  const punchOut = async () => {
    setMessage('Stopping...');
    try {
      const res = await window.trackerAPI?.punchOut();
      if (res?.endedSession?.endTime) {
        // endTime returned from server is already IST-stored; format via IST
        setPunchOutAt(new Date(res.endedSession.endTime));
      }
      startRef.current = null;
      setSessionId(null);
      await syncStatus();
      setMessage('Ended');
    } catch { setMessage('Failed to punch out'); }
  };

  const startBreak = async () => {
    setMessage('Starting break...');
    try {
      const res = await window.trackerAPI?.startBreak();
      if (res?.success) {
        setIsOnBreak(true);
        setBreakStartAt(new Date());
        setMessage('On break');
      }
      await syncStatus();
    } catch { setMessage('Failed to start break'); }
  };

  const endBreak = async () => {
    setMessage('Ending break...');
    try {
      const res = await window.trackerAPI?.endBreak();
      if (res?.success) {
        setIsOnBreak(false);
        setBreakEndAt(new Date());
        setMessage('Break ended');
      }
      await syncStatus();
    } catch { setMessage('Failed to end break'); }
  };

  const elapsed = elapsedNow();

  return (
    <div className="p-8 bg-white">
      <div className="text-4xl font-bold tabular-nums tracking-wide text-gray-900">{fmtDur(elapsed)}</div>
      <div className="text-xs text-gray-500 mt-1 min-h-[18px]">{message}</div>
      <div className="flex flex-wrap gap-2 mt-3">
        <button type="button" onClick={punchIn} className="px-3 py-2 rounded-md bg-emerald-600 text-white border border-emerald-700 hover:bg-emerald-700" disabled={!!sessionId}>Punch In</button>
        <button type="button" onClick={punchOut} className="px-3 py-2 rounded-md bg-rose-600 text-white border border-rose-700 hover:bg-rose-700" disabled={!sessionId}>Punch Out</button>
      </div>
      
      {sessionId && (
        <div className="flex flex-wrap gap-2 mt-2">
          <button 
            type="button" 
            onClick={startBreak} 
            className="px-3 py-2 rounded-md bg-amber-500 text-white border border-amber-600 hover:bg-amber-600" 
            disabled={isOnBreak}
          >
            Start Break
          </button>
          <button 
            type="button" 
            onClick={endBreak} 
            className="px-3 py-2 rounded-md bg-blue-500 text-white border border-blue-600 hover:bg-blue-600" 
            disabled={!isOnBreak}
          >
            End Break
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-sm text-gray-500 mb-2">Punch & Break</div>
          <div className="space-y-1 text-gray-900 text-sm">
            <div className="flex justify-between"><span>Punch In</span><span className="tabular-nums">{fmtIST(punchInAt)}</span></div>
            <div className="flex justify-between"><span>Punch Out</span><span className="tabular-nums">{fmtIST(punchOutAt)}</span></div>
            <div className="flex justify-between"><span>Break Start</span><span className="tabular-nums">{fmtIST(breakStartAt)}</span></div>
            <div className="flex justify-between"><span>Break End</span><span className="tabular-nums">{isOnBreak ? 'Ongoing' : fmtIST(breakEndAt)}</span></div>
            <div className="flex justify-between border-t border-gray-200 pt-1 mt-2"><span>Elapsed</span><span className="tabular-nums text-emerald-600">{fmtDur(elapsed)}</span></div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-sm text-gray-500 mb-2">Today's Stats</div>
          <div className="space-y-1 text-gray-900 text-sm">
            <div className="flex justify-between"><span>Total</span><span className="tabular-nums">{fmtDur(baseTotals.total + elapsed)}</span></div>
            <div className="flex justify-between"><span>Active</span><span className="tabular-nums">{fmtDur(baseTotals.productive + elapsed)}</span></div>
            <div className="flex justify-between"><span>Idle</span><span className="tabular-nums">{fmtDur(baseTotals.idle)}</span></div>
            <div className="flex justify-between"><span>Breaks</span><span className="tabular-nums">{fmtDur(baseTotals.breaks)}</span></div>
            <div className="flex justify-between border-t border-gray-200 pt-1 mt-2"><span>Break Count</span><span className="tabular-nums text-blue-600">{breakCount}</span></div>
            <div className="flex justify-between"><span>Total Work Time</span><span className="tabular-nums text-emerald-600">{fmtDur(totalWorkTime)}</span></div>
            <div className="flex justify-between"><span>Total Productive</span><span className="tabular-nums text-purple-600">{fmtDur(totalProductiveTime)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}


