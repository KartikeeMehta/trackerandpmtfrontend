const EmployeeTracker = require("../models/EmployeeTracker");
const Employee = require("../models/Employee");
const User = require("../models/User");

// Break duration limits in minutes
const BREAK_DURATION_LIMITS = {
  tea_break: 15,
  meeting_break: 10, // 10 minutes
  lunch_break: 45, // 45 minutes
  manual: 60, // 60 minutes (no auto-end for manual breaks)
};

// Store active break timers
const activeBreakTimers = new Map();

// Function to automatically end breaks based on duration limits
function scheduleAutoBreakEnd(tracker, breakType) {
  const durationLimit = BREAK_DURATION_LIMITS[breakType];
  if (!durationLimit) return; // No auto-end for this break type

  const timerId = `${tracker.employeeId}_${breakType}_${Date.now()}`;

  // Clear any existing timer for this employee
  if (activeBreakTimers.has(tracker.employeeId)) {
    clearTimeout(activeBreakTimers.get(tracker.employeeId));
  }

  // Set new timer
  const timer = setTimeout(async () => {
    try {
      console.log(
        `Auto-ending ${breakType} break for employee ${tracker.employeeId} after ${durationLimit} minutes`
      );

      // Find the tracker and check if break is still active
      const currentTracker = await EmployeeTracker.findOne({
        employeeId: tracker.employeeId,
      });
      if (
        !currentTracker ||
        !currentTracker.currentSession ||
        !currentTracker.currentSession.isActive
      ) {
        console.log("No active session found, skipping auto break end");
        return;
      }

      // Find active break of this type
      const activeBreak = currentTracker.currentSession.breaks.find(
        (b) => b.isActive && b.breakType === breakType
      );

      if (activeBreak) {
        // End the break
        activeBreak.endTime = new Date();
        activeBreak.endTimeIST = currentTracker.getISTTimeString();
        activeBreak.isActive = false;
        activeBreak.duration = currentTracker.msToMinutes(
          activeBreak.endTime.getTime() - activeBreak.startTime.getTime()
        );

        // Recalculate session times
        currentTracker.recalculateBreakTime();
        currentTracker.recalculateCurrentSessionTimes();
        currentTracker.updateDailySummary();

        await currentTracker.save();
        console.log(
          `Successfully auto-ended ${breakType} break for employee ${tracker.employeeId}`
        );
      } else {
        console.log(
          `No active ${breakType} break found for employee ${tracker.employeeId}`
        );
      }
    } catch (error) {
      console.error("Error auto-ending break:", error);
    } finally {
      // Remove timer from map
      activeBreakTimers.delete(tracker.employeeId);
    }
  }, durationLimit * 60 * 1000); // Convert minutes to milliseconds

  activeBreakTimers.set(tracker.employeeId, timer);
  console.log(
    `Scheduled auto-end for ${breakType} break in ${durationLimit} minutes`
  );
}

// Function to check and auto-end overdue breaks
async function checkAndAutoEndBreaks(tracker) {
  if (!tracker.currentSession || !tracker.currentSession.isActive) return;

  const now = new Date();
  let hasChanges = false;

  // Check each active break
  for (const breakItem of tracker.currentSession.breaks) {
    if (breakItem.isActive) {
      const durationLimit = BREAK_DURATION_LIMITS[breakItem.breakType];
      if (durationLimit) {
        const breakDuration = tracker.msToMinutes(
          now.getTime() - breakItem.startTime.getTime()
        );

        if (breakDuration >= durationLimit) {
          console.log(
            `Auto-ending overdue ${
              breakItem.breakType
            } break (${breakDuration.toFixed(
              2
            )} min >= ${durationLimit} min limit)`
          );

          // End the break
          breakItem.endTime = now;
          breakItem.endTimeIST = tracker.getISTTimeString();
          breakItem.isActive = false;
          breakItem.duration = breakDuration;

          hasChanges = true;
        }
      }
    }
  }

  if (hasChanges) {
    // Recalculate session times
    tracker.recalculateBreakTime();
    tracker.recalculateCurrentSessionTimes();
    tracker.updateDailySummary();
    await tracker.save();
    console.log("Auto-ended overdue breaks and updated session");
  }
}

// Helper: get or create tracker doc for current authenticated principal (User or Employee)
async function getOrCreateTrackerForReq(req) {
  // Determine identity: prefer Employee, else fallback to User treated as company owner
  // req.user is set by authMiddleware
  const requesterId = req.user._id;

  // Resolve employee/company context
  let employeeId = null;
  let companyId = null;
  let employeeInfo = null;

  // Try as Employee first
  const employee = await Employee.findById(requesterId).select(
    "name email teamMemberId companyName"
  );
  if (employee) {
    employeeId = employee._id;
    // find owner user for same companyName to map companyId
    const owner = await User.findOne({
      companyName: employee.companyName,
    }).select("_id");
    companyId = owner?._id || requesterId; // fallback
    employeeInfo = {
      name: employee.name,
      email: employee.email,
      teamMember_Id: employee.teamMemberId,
    };
  } else {
    // Treat as company owner/admin tracking themselves
    const user = await User.findById(requesterId).select(
      "_id firstName lastName email"
    );
    if (!user) throw new Error("Requester not found");
    employeeId = user._id; // owner self-track
    companyId = user._id;
    employeeInfo = {
      name:
        `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
      email: user.email,
      teamMember_Id: "owner",
    };
  }

  // Upsert to guarantee single document per employeeId (prevents duplicates in races)
  const tracker = await EmployeeTracker.findOneAndUpdate(
    { employeeId },
    {
      $setOnInsert: {
        employeeId,
        companyId,
        employeeInfo,
      },
    },
    { new: true, upsert: true }
  );
  return tracker;
}

exports.punchIn = async (req, res) => {
  try {
    const tracker = await getOrCreateTrackerForReq(req);
    // Guard: prevent starting when an active session exists
    if (tracker.currentSession && tracker.currentSession.isActive) {
      return res
        .status(400)
        .json({ success: false, message: "Already punched in" });
    }
    // Idempotency: if client passes a sessionId that already exists and is active, reuse it
    const clientSessionId = (req.body?.sessionId || "").toString();
    if (clientSessionId) {
      const existing =
        tracker.currentSession?.sessionId === clientSessionId
          ? tracker.currentSession
          : tracker.workSessions.find(
              (s) => s.sessionId === clientSessionId && s.isActive
            );
      if (existing) {
        return res.json({
          success: true,
          message: "Already punched in",
          session: existing,
        });
      }
    }

    tracker.startWorkSession();
    await tracker.save();
    return res.json({
      success: true,
      message: "Punched in",
      session: tracker.currentSession,
    });
  } catch (e) {
    return res
      .status(500)
      .json({ success: false, message: e.message || "Punch in failed" });
  }
};

exports.punchOut = async (req, res) => {
  try {
    const tracker = await getOrCreateTrackerForReq(req);
    if (!tracker.currentSession || !tracker.currentSession.isActive) {
      return res
        .status(400)
        .json({ success: false, message: "Not punched in" });
    }
    // Update-in-place by sessionId to avoid duplicate entries
    const ended = tracker.endWorkSession();
    await tracker.save();
    return res.json({ success: true, message: "Punched out", session: ended });
  } catch (e) {
    return res
      .status(500)
      .json({ success: false, message: e.message || "Punch out failed" });
  }
};

exports.idleStart = async (req, res) => {
  try {
    const tracker = await getOrCreateTrackerForReq(req);
    const { idleType, startedAt } = req.body;
    console.log(
      "🟡 Server: Idle start request for employee:",
      tracker.employeeId,
      "idleType:",
      idleType,
      "startedAt:",
      startedAt
    );

    if (!tracker.currentSession || !tracker.currentSession.isActive) {
      console.log("❌ Server: No active session for idle start");
      return res
        .status(400)
        .json({ success: false, message: "No active session" });
    }
    // If a break is active, ignore idle start
    const activeBreak = tracker.currentSession?.breaks?.find?.(
      (b) => b.isActive
    );
    if (activeBreak) {
      console.log(
        "⏸️ Server: Ignoring idle start - break active:",
        activeBreak.breakType
      );
      return res.json({ success: true, ignored: true, reason: "break_active" });
    }
    // Mark start; store a transient start time on the doc for accumulation
    tracker._lastIdleStart = new Date();
    await tracker.save();
    console.log("✅ Server: Idle time started at:", tracker._lastIdleStart);
    return res.json({
      success: true,
      isIdle: true,
      idleSince: tracker._lastIdleStart,
    });
  } catch (e) {
    console.error("❌ Server: Idle start error:", e);
    return res
      .status(500)
      .json({ success: false, message: e.message || "Idle start failed" });
  }
};

exports.idleEnd = async (req, res) => {
  try {
    const tracker = await getOrCreateTrackerForReq(req);
    const { endedAt } = req.body;
    console.log(
      "🟢 Server: Idle end request for employee:",
      tracker.employeeId,
      "endedAt:",
      endedAt
    );
    console.log("🟢 Server: Current session status:", {
      hasCurrentSession: !!tracker.currentSession,
      isActive: tracker.currentSession?.isActive,
      lastIdleStart: tracker._lastIdleStart,
    });

    if (!tracker.currentSession || !tracker.currentSession.isActive) {
      console.log(
        "⚠️ Server: No active session for idle end - session may have ended"
      );
      // Don't return error, just return success since idle time might have been calculated
      return res.json({
        success: true,
        message: "No active session - idle end ignored",
        ignored: true,
      });
    }
    // If a break is active, ignore idle end (we didn't count idle during break)
    const activeBreak = tracker.currentSession?.breaks?.find?.(
      (b) => b.isActive
    );
    if (activeBreak) {
      console.log(
        "⏸️ Server: Ignoring idle end - break active:",
        activeBreak.breakType
      );
      tracker._lastIdleStart = null;
      await tracker.save();
      return res.json({ success: true, ignored: true, reason: "break_active" });
    }
    if (tracker._lastIdleStart) {
      const delta = Date.now() - new Date(tracker._lastIdleStart).getTime();
      // Convert milliseconds to minutes before storing (no rounding)
      const deltaMinutes = delta / (60 * 1000);
      console.log(
        "✅ Server: Adding idle time:",
        deltaMinutes.toFixed(2),
        "minutes (delta:",
        delta,
        "ms)"
      );
      console.log(
        "✅ Server: Before adding idle time - current idle time:",
        tracker.currentSession.idleTime
      );
      tracker.addIdleTime(deltaMinutes);
      console.log(
        "✅ Server: After adding idle time - new idle time:",
        tracker.currentSession.idleTime
      );
      tracker._lastIdleStart = null;
    } else {
      console.log("⚠️ Server: No idle start time found for idle end");
    }
    tracker.recalculateCurrentSessionTimes();
    await tracker.save();
    console.log("✅ Server: Idle time ended and session recalculated");
    return res.json({ success: true, isIdle: false });
  } catch (e) {
    console.error("❌ Server: Idle end error:", e);
    return res
      .status(500)
      .json({ success: false, message: e.message || "Idle end failed" });
  }
};

// Activity tracking
exports.updateActivity = async (req, res) => {
  try {
    const tracker = await getOrCreateTrackerForReq(req);
    const { keystrokes = 0, mouseClicks = 0, spamKeystrokes = 0 } = req.body;

    console.log("📊 Server: Activity update request:", {
      employeeId: tracker.employeeId,
      keystrokes,
      mouseClicks,
      spamKeystrokes,
    });

    if (!tracker.currentSession || !tracker.currentSession.isActive) {
      console.log("⚠️ Server: No active session for activity update");
      return res.json({
        success: true,
        message: "No active session - activity update ignored",
        ignored: true,
      });
    }

    // Update activity counts
    tracker.updateActivity(keystrokes, mouseClicks);

    // Update last activity time
    const istTime = tracker.getISTTime();
    tracker.lastActivity = istTime;

    await tracker.save();

    console.log("✅ Server: Activity updated successfully:", {
      totalKeystrokes: tracker.currentSession.totalKeystrokes,
      totalMouseClicks: tracker.currentSession.totalMouseClicks,
    });

    return res.json({
      success: true,
      message: "Activity updated",
      activity: {
        totalKeystrokes: tracker.currentSession.totalKeystrokes,
        totalMouseClicks: tracker.currentSession.totalMouseClicks,
      },
    });
  } catch (e) {
    console.error("❌ Server: Activity update error:", e);
    return res
      .status(500)
      .json({ success: false, message: e.message || "Activity update failed" });
  }
};

// Break management
exports.breakStart = async (req, res) => {
  try {
    const { breakType = "manual", reason = "" } = req.body || {};
    const tracker = await getOrCreateTrackerForReq(req);
    if (!tracker.currentSession || !tracker.currentSession.isActive) {
      return res
        .status(400)
        .json({ success: false, message: "No active session" });
    }
    // If there is a pending idle segment, close and discard it (no idle during breaks)
    tracker._lastIdleStart = null;
    const started = tracker.startBreak(breakType, reason);
    await tracker.save();

    // Set up automatic break ending based on break type
    scheduleAutoBreakEnd(tracker, breakType);

    return res.json({ success: true, break: started });
  } catch (e) {
    return res
      .status(500)
      .json({ success: false, message: e.message || "Break start failed" });
  }
};

exports.breakEnd = async (req, res) => {
  try {
    const tracker = await getOrCreateTrackerForReq(req);
    if (!tracker.currentSession || !tracker.currentSession.isActive) {
      return res
        .status(400)
        .json({ success: false, message: "No active session" });
    }

    // Check if there's an active break to end
    const activeBreak = tracker.currentSession.breaks.find((b) => b.isActive);
    if (!activeBreak) {
      console.log("No active break found to end - break may already be ended");
      return res.json({
        success: true,
        message: "No active break to end",
        alreadyEnded: true,
      });
    }

    // Clear any active break timer for this employee
    if (activeBreakTimers.has(tracker.employeeId)) {
      clearTimeout(activeBreakTimers.get(tracker.employeeId));
      activeBreakTimers.delete(tracker.employeeId);
      console.log(`Cleared auto-end timer for employee ${tracker.employeeId}`);
    }

    const ended = tracker.endBreak();
    tracker.recalculateCurrentSessionTimes();
    await tracker.save();
    console.log(`Successfully ended break for employee ${tracker.employeeId}`);
    return res.json({ success: true, break: ended });
  } catch (e) {
    console.error("Break end error:", e);
    return res
      .status(500)
      .json({ success: false, message: e.message || "Break end failed" });
  }
};

exports.getCurrentStatus = async (req, res) => {
  try {
    const tracker = await getOrCreateTrackerForReq(req);

    // Check for overdue breaks and auto-end them
    await checkAndAutoEndBreaks(tracker);

    // If session active, recalc live durations (avoid heavy summary updates here)
    try {
      tracker.recalculateCurrentSessionTimes();
    } catch (err) {
      console.error("recalculateCurrentSessionTimes error:", err);
    }
    // Heartbeat and stale-session auto-end
    const now = new Date();
    try {
      tracker.lastHeartbeatAt = now;
      // If an active session exists but heartbeat is too old, auto end it
      if (
        tracker.currentSession &&
        tracker.currentSession.isActive &&
        tracker.lastHeartbeatAt &&
        tracker.currentSession.lastActivity &&
        now.getTime() - tracker.currentSession.lastActivity.getTime() >
          3 * 60 * 1000 // 3 minutes
      ) {
        console.log(
          "⛔ Auto-ending stale session due to heartbeat timeout for employee:",
          tracker.employeeId
        );
        tracker.endWorkSession();
        await tracker.save();
      } else {
        await tracker.save();
      }
    } catch (err) {
      console.error("Heartbeat persist/auto-end error:", err);
    }

    // Avoid persisting on every response beyond the above
    const payload = tracker.getCurrentStatus();
    payload.paired = true;
    payload.lastHeartbeatAt = now;
    payload.isIdle = !!tracker._lastIdleStart;
    payload.idleSince = tracker._lastIdleStart || null;
    return res.json({ success: true, status: payload });
  } catch (e) {
    console.error("getCurrentStatus error:", e);
    return res
      .status(500)
      .json({ success: false, message: e.message || "Failed to get status" });
  }
};

// Aggregate a user's work for a specific date (defaults to today) into daily summary
exports.getDailySummary = async (req, res) => {
  try {
    let tracker = null;
    const { teamMemberId } = req.query || {};

    if (teamMemberId) {
      const role = (req.user?.role || "").toLowerCase();
      if (!["owner", "admin", "manager"].includes(role)) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to view other members",
        });
      }
      const Employee = require("../models/Employee");
      const member = await Employee.findOne({ teamMemberId });
      if (!member) {
        return res
          .status(404)
          .json({ success: false, message: "Employee not found" });
      }
      const EmployeeTracker = require("../models/EmployeeTracker");
      tracker = await EmployeeTracker.findOne({ employeeId: member._id });
      if (!tracker) {
        return res.json({
          success: true,
          summary: null,
          empty: true,
          date: req.query?.date || "",
        });
      }
    } else {
      tracker = await getOrCreateTrackerForReq(req);
    }

    // Get IST date string for target date
    const dateParam = (req.query?.date || "").toString(); // YYYY-MM-DD or empty
    const targetDate = dateParam || toISTDateString(new Date());

    // Ensure current session metrics are up to date if session is from target day
    if (tracker.currentSession && tracker.currentSession.isActive) {
      const currentSessionDate = toISTDateString(
        tracker.currentSession.startTime
      );
      if (currentSessionDate === targetDate) {
        try {
          tracker.recalculateCurrentSessionTimes();
        } catch (_) {}
      }
    }

    // Select sessions for the target IST date (closed + possibly current)
    const sessions = [];
    const isOnTarget = (d) => toISTDateString(d) === targetDate;

    for (const s of tracker.workSessions) {
      if (isOnTarget(s.startTime)) sessions.push(s);
    }
    if (tracker.currentSession && tracker.currentSession.isActive) {
      if (isOnTarget(tracker.currentSession.startTime)) {
        sessions.push(tracker.currentSession);
      }
    }

    // Build daily summary in memory following the model's shape (minutes units)
    const summary = {
      date: targetDate,
      totalWorkTime: 0,
      totalBreakTime: 0,
      totalIdleTime: 0,
      totalProductiveTime: 0,
      totalKeystrokes: 0,
      totalMouseClicks: 0,
      totalScreenshots: 0,
      sessionsCount: 0,
      breaksCount: 0,
      averageActivityPercentage: 0,
      firstPunchIn: null,
      lastPunchOut: null,
      firstPunchInIST: null,
      lastPunchOutIST: null,
      isActiveToday: false,
      currentStartTimeIST: null,
    };

    if (sessions.length > 0) {
      summary.sessionsCount = sessions.length;
      summary.totalWorkTime = sessions.reduce(
        (t, s) => t + (s.duration || 0),
        0
      );
      summary.totalBreakTime = sessions.reduce(
        (t, s) => t + (s.totalBreakTime || 0),
        0
      );
      summary.totalIdleTime = sessions.reduce(
        (t, s) => t + (s.idleTime || 0),
        0
      );
      summary.totalProductiveTime = sessions.reduce((t, s) => {
        const duration = s.duration || 0;
        const breaks = s.totalBreakTime || 0;
        const idle = s.idleTime || 0;
        const productive = Math.max(0, duration - breaks - idle);
        return t + productive;
      }, 0);
      summary.totalKeystrokes = sessions.reduce(
        (t, s) => t + (s.totalKeystrokes || 0),
        0
      );
      summary.totalMouseClicks = sessions.reduce(
        (t, s) => t + (s.totalMouseClicks || 0),
        0
      );
      summary.totalScreenshots = sessions.reduce(
        (t, s) => t + (s.totalScreenshots || 0),
        0
      );
      summary.breaksCount = sessions.reduce((t, s) => t + s.breaks.length, 0);

      // Breaks count as productive: (Productive + Breaks) / Total × 100
      if (summary.totalWorkTime > 0) {
        summary.averageActivityPercentage =
          ((summary.totalProductiveTime + summary.totalBreakTime) /
            summary.totalWorkTime) *
          100;
      }

      // Sort sessions by start time
      const sorted = [...sessions].sort(
        (a, b) => a.startTime.getTime() - b.startTime.getTime()
      );

      // Set first punch in and last punch out in UTC
      summary.firstPunchIn = sorted[0].startTime;
      const last = sorted[sorted.length - 1];
      summary.lastPunchOut = last.endTime || null;

      // Set IST formatted times for display (use stored IST strings if available)
      summary.firstPunchInIST =
        sorted[0].startTimeIST || formatISTTime(summary.firstPunchIn);
      summary.lastPunchOutIST =
        last.endTimeIST ||
        (summary.lastPunchOut ? formatISTTime(summary.lastPunchOut) : null);
    }

    // Enrich with live state if current session belongs to target day
    if (
      tracker.currentSession &&
      tracker.currentSession.isActive &&
      isOnTarget(tracker.currentSession.startTime)
    ) {
      summary.isActiveToday = true;
      summary.currentStartTimeIST =
        tracker.currentSession.startTimeIST ||
        formatISTTime(tracker.currentSession.startTime);
    }

    // Only persist a summary if there is data for the target date
    if (summary.sessionsCount > 0 || summary.totalWorkTime > 0) {
      const existingIndex = tracker.dailySummaries.findIndex(
        (ds) => ds.date === targetDate
      );

      if (existingIndex >= 0) {
        tracker.dailySummaries[existingIndex] = summary;
      } else {
        tracker.dailySummaries.push(summary);
      }

      tracker.updateOverallStats();
      await tracker.save();
      return res.json({ success: true, summary });
    }

    // No data for this date — do not create an empty summary in DB
    return res.json({
      success: true,
      summary: null,
      empty: true,
      date: targetDate,
    });
  } catch (e) {
    console.error("getDailySummary error:", e);
    return res.status(500).json({
      success: false,
      message: e.message || "Failed to get daily summary",
    });
  }
};

// Aggregate a user's work for a specific month (YYYY-MM, IST)
exports.getMonthlySummary = async (req, res) => {
  try {
    let tracker = null;
    const { teamMemberId } = req.query || {};

    if (teamMemberId) {
      const role = (req.user?.role || "").toLowerCase();
      if (!["owner", "admin", "manager"].includes(role)) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to view other members",
        });
      }
      const Employee = require("../models/Employee");
      const member = await Employee.findOne({ teamMemberId });
      if (!member) {
        return res
          .status(404)
          .json({ success: false, message: "Employee not found" });
      }
      const EmployeeTracker = require("../models/EmployeeTracker");
      tracker = await EmployeeTracker.findOne({ employeeId: member._id });
      if (!tracker) {
        return res.json({
          success: true,
          month: req.query?.month || "",
          summary: null,
        });
      }
    } else {
      tracker = await getOrCreateTrackerForReq(req);
    }

    // Target month in format YYYY-MM (IST)
    const monthParam = (req.query?.month || "").toString();
    const nowIST = toISTDateString(new Date()); // YYYY-MM-DD
    const targetMonth =
      monthParam && monthParam.length >= 7
        ? monthParam.slice(0, 7)
        : nowIST.slice(0, 7);

    const isOnTargetMonth = (d) =>
      toISTDateString(d).slice(0, 7) === targetMonth;

    // Collect sessions for the target month (closed + maybe current)
    const sessions = [];
    for (const s of tracker.workSessions || []) {
      if (s?.startTime && isOnTargetMonth(s.startTime)) sessions.push(s);
    }
    if (tracker.currentSession && tracker.currentSession.isActive) {
      if (isOnTargetMonth(tracker.currentSession.startTime)) {
        sessions.push(tracker.currentSession);
      }
    }

    const summary = {
      month: targetMonth, // YYYY-MM
      sessionsCount: 0,
      breaksCount: 0,
      totalWorkTime: 0,
      totalBreakTime: 0,
      totalIdleTime: 0,
      totalProductiveTime: 0,
      totalKeystrokes: 0,
      totalMouseClicks: 0,
      totalScreenshots: 0,
      averageActivityPercentage: 0,
      days: [],
    };

    if (sessions.length > 0) {
      summary.sessionsCount = sessions.length;
      summary.totalWorkTime = sessions.reduce(
        (t, s) => t + (s.duration || 0),
        0
      );
      summary.totalBreakTime = sessions.reduce(
        (t, s) => t + (s.totalBreakTime || 0),
        0
      );
      summary.totalIdleTime = sessions.reduce(
        (t, s) => t + (s.idleTime || 0),
        0
      );
      summary.totalProductiveTime = sessions.reduce((t, s) => {
        const duration = s.duration || 0;
        const breaks = s.totalBreakTime || 0;
        const idle = s.idleTime || 0;
        return t + Math.max(0, duration - breaks - idle);
      }, 0);
      summary.totalKeystrokes = sessions.reduce(
        (t, s) => t + (s.totalKeystrokes || 0),
        0
      );
      summary.totalMouseClicks = sessions.reduce(
        (t, s) => t + (s.totalMouseClicks || 0),
        0
      );
      summary.totalScreenshots = sessions.reduce(
        (t, s) => t + (s.totalScreenshots || 0),
        0
      );
      summary.breaksCount = sessions.reduce(
        (t, s) => t + (s.breaks?.length || 0),
        0
      );

      if (summary.totalWorkTime > 0) {
        summary.averageActivityPercentage =
          ((summary.totalProductiveTime + summary.totalBreakTime) /
            summary.totalWorkTime) *
          100;
      }
      // Build per-day rollups (YYYY-MM-DD in IST)
      const dayMap = new Map();
      const ensure = (dateStr) => {
        if (!dayMap.has(dateStr)) {
          dayMap.set(dateStr, {
            date: dateStr,
            attended: 0,
            sessions: 0,
            workedMinutes: 0,
            breakMinutes: 0,
            idleMinutes: 0,
            firstPunchIn: null,
            lastPunchOut: null,
            activityPercentage: 0,
          });
        }
        return dayMap.get(dateStr);
      };

      const istDate = (d) => toISTDateString(d);

      // closed sessions
      for (const s of tracker.workSessions || []) {
        if (!s?.startTime) continue;
        const dstr = istDate(s.startTime);
        if (dstr.slice(0, 7) !== targetMonth) continue;
        const row = ensure(dstr);
        row.attended = 1;
        row.sessions += 1;
        row.workedMinutes += Number(s.duration || 0);
        row.breakMinutes += Number(s.totalBreakTime || 0);
        row.idleMinutes += Number(s.idleTime || 0);
        const firstIn = s.startTimeIST || formatISTTime(s.startTime);
        const lastOut = s.endTime
          ? s.endTimeIST || formatISTTime(s.endTime)
          : null;
        if (!row.firstPunchIn) row.firstPunchIn = firstIn;
        row.lastPunchOut = lastOut || row.lastPunchOut;
      }
      // current session if belongs to this month
      if (tracker.currentSession && tracker.currentSession.isActive) {
        const cs = tracker.currentSession;
        if (cs.startTime && istDate(cs.startTime).slice(0, 7) === targetMonth) {
          const dstr = istDate(cs.startTime);
          const row = ensure(dstr);
          row.attended = 1;
          row.sessions += 1;
          row.workedMinutes += Number(cs.duration || 0);
          row.breakMinutes += Number(cs.totalBreakTime || 0);
          row.idleMinutes += Number(cs.idleTime || 0);
          const firstIn = cs.startTimeIST || formatISTTime(cs.startTime);
          if (!row.firstPunchIn) row.firstPunchIn = firstIn;
          // lastPunchOut remains null for active
        }
      }

      // finalize per-day productivity percentage and push to array
      for (const row of dayMap.values()) {
        if (row.workedMinutes > 0) {
          const pct =
            (Math.max(0, row.workedMinutes - row.idleMinutes) /
              row.workedMinutes) *
            100;
          row.activityPercentage = Math.max(0, Math.min(100, pct));
        }
        summary.days.push(row);
      }
    }

    return res.json({ success: true, summary });
  } catch (e) {
    console.error("getMonthlySummary error:", e);
    return res.status(500).json({
      success: false,
      message: e.message || "Failed to get monthly summary",
    });
  }
};

// Helpers (controller-local)
function toISTDateString(dateLike) {
  if (!dateLike) return "";
  const d = new Date(dateLike);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(d)
    .toString();
}

function formatISTTime(dateLike) {
  if (!dateLike) return "—";
  const d = new Date(dateLike);
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: true,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(d);
}

function minutesToHMS(min) {
  const totalSeconds = Math.max(0, Number(min) || 0) * 60;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

// Get Breaks for a specific date (default: today IST)
exports.getBreaksForDate = async (req, res) => {
  try {
    const employeeId = req.user._id;
    const { date } = req.query; // YYYY-MM-DD (IST)
    const tracker = await EmployeeTracker.findOne({ employeeId });
    if (!tracker) {
      return res
        .status(404)
        .json({ success: false, message: "Employee tracker not found" });
    }
    const targetDate = (date || toISTDateString(new Date())).toString();
    const breaks = [];
    const pushBreak = (b) => {
      if (!b) return;
      breaks.push({
        breakId: b.breakId,
        breakType: b.breakType,
        reason: b.reason,
        startTime: b.startTimeIST || formatISTTime(b.startTime),
        endTime:
          b.endTimeIST ||
          (b.endTime ? formatISTTime(b.endTime) : b.isActive ? "Ongoing" : "—"),
        duration: b.duration, // minutes
        durationHMS: minutesToHMS(b.duration || 0),
        isActive: !!b.isActive,
      });
    };
    // From all work sessions - check each break's start date, not session start date
    (tracker.workSessions || []).forEach((s) => {
      (s?.breaks || []).forEach((b) => {
        const bDate = toISTDateString(b?.startTime);
        if (bDate === targetDate) {
          pushBreak(b);
        }
      });
    });
    // Also include current session breaks - check each break's start date
    if (tracker.currentSession) {
      (tracker.currentSession.breaks || []).forEach((b) => {
        const bDate = toISTDateString(b?.startTime);
        if (bDate === targetDate) {
          pushBreak(b);
        }
      });
    }
    // If no breaks found, also try the next day (IST conversion edge)
    if (breaks.length === 0) {
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = nextDay.toISOString().slice(0, 10);
      (tracker.workSessions || []).forEach((s) => {
        (s?.breaks || []).forEach((b) => {
          const bDate = toISTDateString(b?.startTime);
          if (bDate === nextDayStr) {
            pushBreak(b);
          }
        });
      });
      if (tracker.currentSession) {
        (tracker.currentSession.breaks || []).forEach((b) => {
          const bDate = toISTDateString(b?.startTime);
          if (bDate === nextDayStr) {
            pushBreak(b);
          }
        });
      }
    }
    // Sort by startTime
    breaks.sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
    const totals = breaks.reduce(
      (acc, b) => {
        acc.count += 1;
        acc.totalMinutes += Number(b.duration) || 0;
        return acc;
      },
      { count: 0, totalMinutes: 0 }
    );
    const totalsOut = {
      count: totals.count,
      totalMinutes: totals.totalMinutes,
      totalHMS: minutesToHMS(totals.totalMinutes),
    };
    return res.json({
      success: true,
      date: targetDate,
      breaks,
      totals: totalsOut,
    });
  } catch (error) {
    console.error("Get breaks for date error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error retrieving breaks" });
  }
};

// Attendance list for owner/admin by date (default: today IST)
exports.getAttendanceForDate = async (req, res) => {
  try {
    const role = (req.user?.role || "").toLowerCase();
    if (!["owner", "admin"].includes(role)) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    // Determine company scope from owner/admin (admin may be in Employee collection)
    let owner = await User.findById(req.user._id).select("companyName _id");
    if (!owner) {
      // If the logged-in principal is an admin stored as Employee, resolve the owner by companyName
      const adminCompanyName = req.user?.companyName;
      if (!adminCompanyName) {
        return res
          .status(404)
          .json({ success: false, message: "Company not found for admin" });
      }
      owner = await User.findOne({ companyName: adminCompanyName }).select(
        "companyName _id"
      );
      if (!owner) {
        return res
          .status(404)
          .json({ success: false, message: "Owner not found" });
      }
    }

    const targetDate = (
      req.query?.date || toISTDateString(new Date())
    ).toString();

    // Fetch all employees under this company (by name) and all trackers (by companyId)
    const [employeesRaw, trackers] = await Promise.all([
      Employee.find({ companyName: owner.companyName }).select(
        "_id name email teamMemberId designation"
      ),
      EmployeeTracker.find({ companyId: owner._id }).select(
        "employeeId workSessions currentSession"
      ),
    ]);
    // Exclude the current viewer (admin) from the listing
    const viewerEmail = (req.user?.email || "").toLowerCase();
    const viewerTeamMemberId = req.user?.teamMemberId || null;
    const employees = employeesRaw.filter((e) => {
      const emailOk = (e.email || "").toLowerCase() !== viewerEmail;
      const tmOk = viewerTeamMemberId
        ? e.teamMemberId !== viewerTeamMemberId
        : true;
      return emailOk && tmOk;
    });
    const idToTracker = new Map(
      trackers.map((t) => [t.employeeId.toString(), t])
    );

    const isOnTarget = (d) => toISTDateString(d) === targetDate;

    const rows = employees.map((emp) => {
      const tr = idToTracker.get(emp._id.toString());
      let sessions = [];
      if (tr) {
        (tr.workSessions || []).forEach((s) => {
          if (s?.startTime && isOnTarget(s.startTime)) sessions.push(s);
        });
        if (
          tr.currentSession &&
          tr.currentSession.isActive &&
          tr.currentSession.startTime &&
          isOnTarget(tr.currentSession.startTime)
        ) {
          sessions.push(tr.currentSession);
        }
      }

      // Compute metrics
      let firstPunchIn = null;
      let lastPunchOut = null;
      let totalWorkTime = 0;
      let breakStart = null;
      let breakEnd = null;
      let breakReason = null;
      let manualBreakReason = null;
      if (sessions.length > 0) {
        sessions.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
        firstPunchIn =
          sessions[0].startTimeIST || formatISTTime(sessions[0].startTime);
        const last = sessions[sessions.length - 1];
        lastPunchOut =
          last.endTimeIST || (last.endTime ? formatISTTime(last.endTime) : "—");
        totalWorkTime = sessions.reduce((t, s) => t + (s.duration || 0), 0);

        // Collect earliest break start and latest break end for the target date
        const typeLabel = (t) => {
          if (t === "tea_break") return "Tea Break";
          if (t === "lunch_break") return "Lunch/Dinner Break";
          if (t === "meeting_break") return "Meeting Break";
          if (t === "manual") return "Manual Break";
          return "Break";
        };
        for (const s of sessions) {
          for (const b of s.breaks || []) {
            if (!b?.startTime) continue;
            if (toISTDateString(b.startTime) !== targetDate) continue;
            const startLabel = b.startTimeIST || formatISTTime(b.startTime);
            const endLabel = b.endTime
              ? b.endTimeIST || formatISTTime(b.endTime)
              : "Ongoing";
            if (!breakStart) breakStart = startLabel;
            breakEnd = endLabel; // last one of the day
            // capture the first non-empty reason; otherwise keep updating to latest
            if (b.reason && b.reason.trim()) {
              breakReason = b.reason.trim();
            }
            if (b.breakType === "manual" && b.reason && b.reason.trim()) {
              manualBreakReason = b.reason.trim();
            }
            // If there is no explicit reason, use default type label
            if (!breakReason && (!b.reason || !b.reason.trim())) {
              breakReason = typeLabel(b.breakType);
            }
          }
        }
      }

      const attended = sessions.length > 0 ? 1 : 0;
      const absent = attended ? 0 : 1;

      return {
        personId: emp.teamMemberId,
        name: emp.name || emp.email,
        department: emp.designation || "",
        date: targetDate,
        breakStart: breakStart || "—",
        breakEnd: breakEnd || "—",
        breakReason: manualBreakReason || breakReason || "—",
        attendanceType: attended ? "Present" : "Absent",
        checkIn: firstPunchIn || "—",
        checkOut: lastPunchOut || "—",
        attended,
        absent,
        workedMinutes: totalWorkTime,
      };
    });

    return res.json({ success: true, date: targetDate, rows });
  } catch (error) {
    console.error("getAttendanceForDate error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to get attendance" });
  }
};

// Company-wide monthly leaderboard
exports.getLeaderboardMonthly = async (req, res) => {
  try {
    // Determine company scope from requester (owner/admin/employee)
    let companyId = null;
    let companyName = null;
    // Try Employee first
    const employee = await Employee.findById(req.user._id).select(
      "companyName teamMemberId name email"
    );
    if (employee) {
      const owner = await User.findOne({
        companyName: employee.companyName,
      }).select("_id companyName");
      companyId = owner?._id || req.user._id;
      companyName = owner?.companyName || employee.companyName;
    } else {
      // Owner/Admin
      const owner = await User.findById(req.user._id).select("_id companyName");
      companyId = owner?._id || req.user._id;
      companyName = owner?.companyName || null;
    }

    if (!companyId) {
      return res
        .status(404)
        .json({ success: false, message: "Company not found" });
    }

    // Target month
    const monthParam = (req.query?.month || "").toString();
    const nowIST = toISTDateString(new Date());
    const targetMonth =
      monthParam && monthParam.length >= 7
        ? monthParam.slice(0, 7)
        : nowIST.slice(0, 7);

    const trackers = await EmployeeTracker.find({ companyId }).select(
      "employeeId workSessions currentSession"
    );

    // Resolve employee meta: name and teamMemberId
    const employees = await Employee.find({ companyName }).select(
      "_id name email teamMemberId"
    );
    const idToMeta = new Map(
      employees.map((e) => [
        e._id.toString(),
        { name: e.name || e.email, teamMemberId: e.teamMemberId },
      ])
    );

    const isOnTargetMonth = (d) =>
      toISTDateString(d).slice(0, 7) === targetMonth;

    const rows = trackers.map((tr) => {
      let worked = 0;
      let idle = 0;
      (tr.workSessions || []).forEach((s) => {
        if (!s?.startTime) return;
        if (isOnTargetMonth(s.startTime)) {
          worked += Number(s.duration || 0);
          idle += Number(s.idleTime || 0);
        }
      });
      if (
        tr.currentSession &&
        tr.currentSession.isActive &&
        isOnTargetMonth(tr.currentSession.startTime)
      ) {
        worked += Number(tr.currentSession.duration || 0);
        idle += Number(tr.currentSession.idleTime || 0);
      }
      const productivity =
        worked > 0
          ? Math.max(
              0,
              Math.min(100, (Math.max(0, worked - idle) / worked) * 100)
            )
          : 0;
      const meta = idToMeta.get(tr.employeeId.toString()) || {
        name: "Unknown",
        teamMemberId: "",
      };
      return {
        employeeId: tr.employeeId,
        name: meta.name,
        teamMemberId: meta.teamMemberId,
        workedMinutes: worked,
        idleMinutes: idle,
        productivity,
      };
    });

    // Rank by productivity desc, then worked time desc
    rows.sort((a, b) => {
      if (b.productivity !== a.productivity)
        return b.productivity - a.productivity;
      return b.workedMinutes - a.workedMinutes;
    });

    rows.forEach((r, idx) => (r.rank = idx + 1));

    return res.json({ success: true, month: targetMonth, rows });
  } catch (error) {
    console.error("getLeaderboardMonthly error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to get leaderboard" });
  }
};
