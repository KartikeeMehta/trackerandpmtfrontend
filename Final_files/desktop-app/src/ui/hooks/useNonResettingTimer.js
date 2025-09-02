import { useEffect, useRef, useState } from 'react';

// Non-resetting elapsed timer based on a fixed start timestamp
export default function useNonResettingTimer(initialStartTs = null) {
  const [startTs, setStartTs] = useState(initialStartTs);
  const [elapsed, setElapsed] = useState(0);
  const tickRef = useRef(null);

  const start = (ts) => {
    if (!ts) ts = Date.now();
    if (!startTs) setStartTs(ts);
  };
  const stop = () => {
    setStartTs(null);
    setElapsed(0);
  };

  useEffect(() => {
    if (!startTs) { if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; } return; }
    if (!tickRef.current) {
      tickRef.current = setInterval(() => setElapsed(Date.now() - startTs), 1000);
    }
    return () => { if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; } };
  }, [startTs]);

  return { startTs, elapsed, start, stop, setStartTs };
}


