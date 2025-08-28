const TrackerSession = require("../models/TrackerSession");
const User = require("../models/User");

exports.startSession = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email is required" });
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // End any existing running session for safety
    await TrackerSession.updateMany(
      { userId: user._id, status: "running" },
      { $set: { status: "ended", endedAt: new Date() } }
    );

    const session = await TrackerSession.create({
      userId: user._id,
      email: user.email,
      companyId: user.companyID,
      companyName: user.companyName,
      startedAt: new Date(),
      status: "running",
    });
    res.json({ success: true, sessionId: session._id });
  } catch (e) {
    res.status(500).json({ success: false, message: "Failed to start session" });
  }
};

exports.stopSession = async (req, res) => {
  try {
    const { sessionId, graceMs = 0 } = req.body;
    const session = await TrackerSession.findById(sessionId);
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });
    if (session.status === "ended") return res.json({ success: true });
    session.endedAt = new Date();
    session.status = "ended";
    session.graceTimeMs += Number(graceMs) || 0;
    // total time calculated here
    if (session.startedAt) {
      session.totalTimeMs = Math.max(0, session.endedAt - session.startedAt);
    }
    // active time = total - idle - breaks (not below zero) + grace
    const grossActive = session.totalTimeMs - (session.idleTimeMs || 0) - (session.breaksTimeMs || 0);
    session.activeTimeMs = Math.max(0, grossActive) + (session.graceTimeMs || 0);
    await session.save();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: "Failed to stop session" });
  }
};

exports.pushIdle = async (req, res) => {
  try {
    const { sessionId, startedAt, endedAt } = req.body;
    if (!sessionId || !startedAt || !endedAt)
      return res.status(400).json({ success: false, message: "Missing fields" });
    const session = await TrackerSession.findById(sessionId);
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });
    const s = new Date(startedAt);
    const e = new Date(endedAt);
    session.idlePeriods.push({ startedAt: s, endedAt: e, durationMs: e - s });
    session.idleTimeMs += Math.max(0, e - s);
    await session.save();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: "Failed to record idle" });
  }
};

exports.pushBreak = async (req, res) => {
  try {
    const { sessionId, type, startedAt, endedAt, meta } = req.body;
    if (!sessionId || !type || !startedAt || !endedAt)
      return res.status(400).json({ success: false, message: "Missing fields" });
    const session = await TrackerSession.findById(sessionId);
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });
    const s = new Date(startedAt);
    const e = new Date(endedAt);
    const dur = Math.max(0, e - s);
    session.breaks.push({ type, startedAt: s, endedAt: e, durationMs: dur, meta });
    session.breaksTimeMs += dur;
    await session.save();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: "Failed to record break" });
  }
};

exports.statsToday = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ success: false, message: "Email required" });
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const sessions = await TrackerSession.find({ email, createdAt: { $gte: start } });
    const sum = (k) => sessions.reduce((a, s) => a + (s[k] || 0), 0);
    res.json({
      success: true,
      totalTimeMs: sum("totalTimeMs"),
      activeTimeMs: sum("activeTimeMs"),
      idleTimeMs: sum("idleTimeMs"),
      breaksTimeMs: sum("breaksTimeMs"),
      graceTimeMs: sum("graceTimeMs"),
    });
  } catch (e) {
    res.status(500).json({ success: false, message: "Failed to get stats" });
  }
};

exports.listToday = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ success: false, message: "Email required" });
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const sessions = await TrackerSession.find({ email, createdAt: { $gte: start } })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, sessions });
  } catch (e) {
    res.status(500).json({ success: false, message: "Failed to list sessions" });
  }
};


