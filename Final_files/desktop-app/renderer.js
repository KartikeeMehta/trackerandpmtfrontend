const form = document.getElementById('pairForm');
const statusEl = document.getElementById('status');
const badgeEl = document.getElementById('statusBadge');
const timerEl = document.getElementById('timer');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const teaBtn = document.getElementById('teaBreak');
const fullBtn = document.getElementById('fullBreak');
const meet1Btn = document.getElementById('meet1');
const meet2Btn = document.getElementById('meet2');
const customBtn = document.getElementById('customBreak');
const punchInEl = document.getElementById('punchInTime');
const punchOutEl = document.getElementById('punchOutTime');
const breakStartEl = document.getElementById('breakStartTime');
const breakEndEl = document.getElementById('breakEndTime');
const statActiveEl = document.getElementById('statActive');
const statTotalEl = document.getElementById('statTotal');
const statIdleEl = document.getElementById('statIdle');
const statBreaksEl = document.getElementById('statBreaks');

// Adjust base URL to your running backend. In prod, consider env/config file.
const BASE_URL = 'http://localhost:8000/api';

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? '#f87171' : '#34d399';
}

function setBadge(text, color) {
  badgeEl.textContent = text;
  if (color === 'green') {
    badgeEl.style.background = '#0d2b1d';
    badgeEl.style.color = '#34d399';
    badgeEl.style.borderColor = '#14532d';
  } else if (color === 'yellow') {
    badgeEl.style.background = '#2d2610';
    badgeEl.style.color = '#fbbf24';
    badgeEl.style.borderColor = '#92400e';
  } else {
    badgeEl.style.background = '#0e1b35';
    badgeEl.style.color = '#9ec5ff';
    badgeEl.style.borderColor = '#1f3b77';
  }
}

let sessionId = null;
let startTs = null;
let ticker = null;
let idleSince = null;
let poller = null;

function pad2(n) { return String(n).padStart(2, '0'); }
function formatTime(dt) {
  if (!dt) return '—';
  const d = new Date(dt);
  if (isNaN(d.getTime())) return '—';
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}
function formatMs(ms) {
  if (!ms || ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}`;
}

async function fetchStats(email) {
  try {
    const res = await fetch(`${BASE_URL}/tracker/stats/today?email=${encodeURIComponent(email)}`);
    const data = await res.json();
    if (data && data.success) {
      statActiveEl.textContent = formatMs(data.activeTimeMs);
      statTotalEl.textContent = formatMs(data.totalTimeMs);
      statIdleEl.textContent = formatMs(data.idleTimeMs);
      statBreaksEl.textContent = formatMs(data.breaksTimeMs);
    }
  } catch (_) { /* silent */ }
}

async function fetchSessions(email) {
  try {
    const res = await fetch(`${BASE_URL}/tracker/sessions/today?email=${encodeURIComponent(email)}`);
    const data = await res.json();
    if (!data || !data.success) return;
    const sessions = Array.isArray(data.sessions) ? data.sessions : [];
    if (sessions.length === 0) {
      punchInEl.textContent = '—';
      punchOutEl.textContent = '—';
      breakStartEl.textContent = '—';
      breakEndEl.textContent = '—';
      return;
    }
    const latest = sessions[0];
    punchInEl.textContent = formatTime(latest.startedAt);
    punchOutEl.textContent = latest.endedAt ? formatTime(latest.endedAt) : '—';

    // Find latest break start and end across today
    let lastBreakStart = null;
    let lastBreakEnd = null;
    for (const s of sessions) {
      if (Array.isArray(s.breaks)) {
        for (const b of s.breaks) {
          if (b.startedAt && (!lastBreakStart || new Date(b.startedAt) > new Date(lastBreakStart))) {
            lastBreakStart = b.startedAt;
          }
          if (b.endedAt && (!lastBreakEnd || new Date(b.endedAt) > new Date(lastBreakEnd))) {
            lastBreakEnd = b.endedAt;
          }
        }
      }
    }
    breakStartEl.textContent = formatTime(lastBreakStart);
    breakEndEl.textContent = formatTime(lastBreakEnd);
  } catch (_) { /* silent */ }
}

function startPolling(email) {
  if (poller) clearInterval(poller);
  const run = () => {
    fetchStats(email);
    fetchSessions(email);
  };
  run();
  poller = setInterval(run, 30000);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const otp = document.getElementById('otp').value.trim();

  if (!email || !otp) {
    setStatus('Please enter email and OTP', true);
    return;
  }

  try {
    setStatus('Connecting...');
    const res = await fetch(`${BASE_URL}/pairing/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, pairingOTP: otp })
    });
    const data = await res.json();
    if (!res.ok || data.success === false) {
      setStatus(data.message || 'Failed to verify OTP', true);
      return;
    }

    setStatus('Connected successfully!');
    setBadge('Connected', 'green');
    startPolling(email);
  } catch (err) {
    setStatus('Network error. Please try again.', true);
  }
});

function updateTimer() {
  const now = Date.now();
  const ms = Math.max(0, now - startTs);
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / (1000 * 60)) % 60;
  const h = Math.floor(ms / (1000 * 60 * 60));
  const pad = (n) => String(n).padStart(2, '0');
  timerEl.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
}

async function startSession() {
  setStatus('Starting session...');
  const email = document.getElementById('email').value.trim();
  const res = await fetch(`${BASE_URL}/tracker/start`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  const data = await res.json();
  if (!data.success) return setStatus(data.message || 'Failed to start', true);
  sessionId = data.sessionId;
  startTs = Date.now();
  ticker = setInterval(updateTimer, 1000);
  setStatus('Tracking…');
  punchInEl.textContent = formatTime(new Date());
  fetchStats(email);
}

async function stopSession(withGrace = true) {
  if (!sessionId) return;
  setStatus('Stopping session...');
  const graceMs = withGrace ? 7 * 60 * 1000 : 0;
  await fetch(`${BASE_URL}/tracker/stop`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, graceMs })
  });
  clearInterval(ticker);
  ticker = null;
  sessionId = null;
  setStatus('Session ended');
  punchOutEl.textContent = formatTime(new Date());
  const email = document.getElementById('email').value.trim();
  if (email) {
    fetchStats(email);
    fetchSessions(email);
  }
}

async function pushIdle(start, end) {
  if (!sessionId) return;
  await fetch(`${BASE_URL}/tracker/idle`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, startedAt: start, endedAt: end })
  });
}

async function pushBreak(type, minutes) {
  if (!sessionId) return;
  const now = new Date();
  const end = new Date(now.getTime() + minutes * 60 * 1000);
  // Start break
  await fetch(`${BASE_URL}/tracker/break/start`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, type, startedAt: now })
  });
  // Immediately end scheduled break
  await fetch(`${BASE_URL}/tracker/break/end`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, endedAt: end })
  });
  breakStartEl.textContent = formatTime(now);
  breakEndEl.textContent = formatTime(end);
  const email = document.getElementById('email').value.trim();
  if (email) fetchStats(email);
}

// Idle detection: if no mouse/keyboard for 30s, mark idle from 31s onwards
let idleTimer = null;
function userActivity() {
  if (idleSince && Date.now() - idleSince > 31000) {
    pushIdle(new Date(idleSince + 31000), new Date());
  }
  idleSince = Date.now();
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    // goes idle after 30s; actual counted idle starts at 31s (handled above)
  }, 30000);
}

['mousemove','keydown','mousedown','wheel'].forEach(evt => window.addEventListener(evt, userActivity, { passive: true }));
userActivity();

startBtn.addEventListener('click', () => startSession());
stopBtn.addEventListener('click', () => stopSession(true));
teaBtn.addEventListener('click', () => pushBreak('tea15', 15));
fullBtn.addEventListener('click', () => pushBreak('full45', 45));
meet1Btn.addEventListener('click', () => pushBreak('meeting15', 15));
meet2Btn.addEventListener('click', () => pushBreak('meeting15_2', 15));
customBtn.addEventListener('click', async () => {
  const mins = Number(prompt('Custom break minutes?', '10')) || 0;
  if (mins > 0) pushBreak('custom', mins);
});


