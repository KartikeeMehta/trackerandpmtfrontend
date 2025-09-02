// Time utilities for consistent IST rendering and durations

export function formatDuration(ms) {
  const safe = Math.max(0, Number(ms) || 0);
  const s = Math.floor(safe / 1000) % 60;
  const m = Math.floor(safe / (1000 * 60)) % 60;
  const h = Math.floor(safe / (1000 * 60 * 60));
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function formatIST(dateLike) {
  if (!dateLike) return '—';
  // If backend provides an ISO string (often with +00:00) that represents
  // IST wall-clock, render the wall-clock time directly to avoid TZ shifts.
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
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
    timeZone: 'Asia/Kolkata'
  }).format(d);
}


