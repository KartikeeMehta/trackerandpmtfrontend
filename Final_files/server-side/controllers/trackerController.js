const UserTracker = require("../models/TrackerSession");
const User = require("../models/User");
const Employee = require("../models/Employee");

// Helper function to recalculate session times
async function recalculateSessionTimes(session) {
  const now = new Date();
  
  // Calculate total idle time
  const totalIdleMs = session.idlePeriods.reduce((sum, period) => {
    if (period.endedAt) {
      return sum + period.durationMs;
    } else {
      // For ongoing idle period, calculate up to now
      return sum + (now - period.startedAt);
    }
  }, 0);

  // Calculate total break time
  const totalBreakMs = session.breaks.reduce((sum, break_) => {
    if (break_.endedAt) {
      return sum + break_.durationMs;
    } else if (break_.isOngoing) {
      // For ongoing break, calculate up to now
      return sum + (now - break_.startedAt);
    }
    return sum;
  }, 0);

  // Calculate total time (if session is running, use current time)
  const endTime = session.punchOutAt || now;
  const totalTimeMs = Math.max(0, endTime - session.punchInAt);

  // Active time = total time - idle time - break time + grace time
  session.totalTimeMs = totalTimeMs;
  session.idleTimeMs = totalIdleMs;
  session.breaksTimeMs = totalBreakMs;
  session.activeTimeMs = Math.max(0, totalTimeMs - totalIdleMs - totalBreakMs) + session.graceTimeMs;
}

// Helper function to end current session
async function endCurrentSession(userTracker, graceMs = 0) {
  const currentSession = userTracker.getCurrentSession();
  if (!currentSession) return null;

  const now = new Date();
  currentSession.punchOutAt = now;
  currentSession.status = "ended";
  currentSession.graceTimeMs += Number(graceMs) || 0;

  // Calculate final times
  currentSession.totalTimeMs = Math.max(0, now - currentSession.punchInAt);
  
  // End any ongoing idle period
  const ongoingIdle = currentSession.idlePeriods.find(period => !period.endedAt);
  if (ongoingIdle) {
    ongoingIdle.endedAt = now;
    ongoingIdle.durationMs = now - ongoingIdle.startedAt;
  }

  // Recalculate session times
  await recalculateSessionTimes(currentSession);

  // Update user tracker
  const todayData = userTracker.getTodayData();
  todayData.currentSessionId = null;
  todayData.isActive = false;
  
  userTracker.currentSession = {
    sessionId: null,
    date: null,
    punchInAt: null,
    lastActivityAt: null
  };
  userTracker.isActive = false;
  
  // Update daily totals
  userTracker.updateDailyTotals();

  await userTracker.save();

  return {
    totalTimeMs: currentSession.totalTimeMs,
    activeTimeMs: currentSession.activeTimeMs,
    idleTimeMs: currentSession.idleTimeMs,
    breaksTimeMs: currentSession.breaksTimeMs,
    graceTimeMs: currentSession.graceTimeMs
  };
}

// Punch In → start a new session
exports.punchIn = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email is required" });

    // Try to find user first, then employee
    let user = await User.findOne({ email });
    let isEmployee = false;

    if (!user) {
      user = await Employee.findOne({ email });
      if (user) {
        isEmployee = true;
      } else {
        return res.status(404).json({ success: false, message: "User not found" });
      }
    }

    // Find or create user tracker document
    let userTracker = await UserTracker.findOne({ email });
    
    if (!userTracker) {
      // Create new user tracker
      userTracker = new UserTracker({
        userId: user._id,
        email: user.email,
        companyId: isEmployee ? user.companyName : user.companyID,
        companyName: user.companyName,
        dailyData: [],
        currentSession: {
          sessionId: null,
          date: null,
          punchInAt: null,
          lastActivityAt: null
        },
        settings: {
          autoIdleDetection: true,
          idleThresholdSeconds: 31, // 31 seconds (30 + 1)
          defaultGracePeriod: 7
        },
        totalSessions: 0,
        totalActiveDays: 0,
        isActive: false
      });
    }

    // End any existing running session
    if (userTracker.isActive && userTracker.currentSession && userTracker.currentSession.sessionId) {
      await endCurrentSession(userTracker);
    }

    // Get today's data
    const todayData = userTracker.getTodayData();
    
    // Create new session
    const sessionId = userTracker.generateSessionId();
    const now = new Date();
    
    const newSession = {
      sessionId,
      punchInAt: now,
      punchOutAt: null,
      status: "running",
      totalTimeMs: 0,
      activeTimeMs: 0,
      idleTimeMs: 0,
      breaksTimeMs: 0,
      graceTimeMs: 0,
      lastActivityAt: now,
      breaks: [],
      idlePeriods: []
    };

    // Add session to today's data
    todayData.punchSessions.push(newSession);
    todayData.currentSessionId = sessionId;
    todayData.isActive = true;

    // Update user tracker
    userTracker.currentSession = {
      sessionId: sessionId,
      date: now,
      punchInAt: now,
      lastActivityAt: now
    };
    userTracker.isActive = true;
    userTracker.totalSessions += 1;
    userTracker.lastActivityDate = now;

    // Update daily totals
    userTracker.updateDailyTotals();

    await userTracker.save();

    res.json({ 
      success: true, 
      sessionId,
      message: "Punch in successful"
    });
  } catch (e) {
    console.error('Punch in error:', e);
    res.status(500).json({ success: false, message: "Failed to punch in" });
  }
};

// Punch Out → end session
exports.punchOut = async (req, res) => {
  try {
    const { sessionId, graceMs = 0 } = req.body;
    if (!sessionId) return res.status(400).json({ success: false, message: "Session ID required" });

    const userTracker = await UserTracker.findOne({ "currentSession.sessionId": sessionId });
    if (!userTracker) return res.status(404).json({ success: false, message: "Session not found" });

    const result = await endCurrentSession(userTracker, graceMs);
    
    res.json({
      success: true,
      totalTimeMs: result.totalTimeMs,
      activeTimeMs: result.activeTimeMs,
      idleTimeMs: result.idleTimeMs,
      breaksTimeMs: result.breaksTimeMs,
      graceTimeMs: result.graceTimeMs,
      message: "Punch out successful"
    });
  } catch (e) {
    console.error('Punch out error:', e);
    res.status(500).json({ success: false, message: "Failed to punch out" });
  }
};



// Break Start with enhanced logic
exports.breakStart = async (req, res) => {
  try {
    const { sessionId, type = "manual", startedAt, durationMinutes } = req.body;
    if (!sessionId || !startedAt) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    const userTracker = await UserTracker.findOne({ "currentSession.sessionId": sessionId });
    if (!userTracker) return res.status(404).json({ success: false, message: "Session not found" });

    const currentSession = userTracker.getCurrentSession();
    if (!currentSession) {
      return res.status(404).json({ success: false, message: "Current session not found" });
    }

    // End any ongoing break first
    const ongoingBreak = currentSession.breaks.find(b => b.isOngoing);
    if (ongoingBreak) {
      ongoingBreak.endedAt = new Date(startedAt);
      ongoingBreak.durationMs = Math.max(0, ongoingBreak.endedAt - ongoingBreak.startedAt);
      ongoingBreak.isOngoing = false;
    }

    // Create new break
    const breakData = {
      type,
      startedAt: new Date(startedAt),
      endedAt: null,
      durationMs: 0,
      durationMinutes: durationMinutes || getDefaultBreakDuration(type),
      graceMinutes: getGracePeriod(type),
      isOngoing: true,
      earlyTermination: false,
      meta: {
        originalDuration: durationMinutes || getDefaultBreakDuration(type),
        gracePeriod: getGracePeriod(type),
        autoEnd: true
      }
    };

    currentSession.breaks.push(breakData);
    
    // Recalculate session times
    await recalculateSessionTimes(currentSession);
    
    await userTracker.save();

    res.json({ 
      success: true, 
      breakId: breakData._id,
      durationMinutes: breakData.durationMinutes,
      graceMinutes: breakData.graceMinutes,
      message: "Break started"
    });
  } catch (e) {
    console.error('Break start error:', e);
    res.status(500).json({ success: false, message: "Failed to start break" });
  }
};

// Break End with early termination logic
exports.breakEnd = async (req, res) => {
  try {
    const { sessionId, endedAt, earlyTermination = false } = req.body;
    if (!sessionId || !endedAt) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    const userTracker = await UserTracker.findOne({ "currentSession.sessionId": sessionId });
    if (!userTracker) return res.status(404).json({ success: false, message: "Session not found" });

    const currentSession = userTracker.getCurrentSession();
    if (!currentSession) {
      return res.status(404).json({ success: false, message: "Current session not found" });
    }

    const ongoingBreak = currentSession.breaks.find(b => b.isOngoing);
    if (!ongoingBreak) {
      return res.status(400).json({ success: false, message: "No ongoing break" });
    }

    const e = new Date(endedAt);
    ongoingBreak.endedAt = e;
    ongoingBreak.durationMs = Math.max(0, e - ongoingBreak.startedAt);
    ongoingBreak.isOngoing = false;
    ongoingBreak.earlyTermination = earlyTermination;

    // Calculate actual break time vs expected
    const expectedDuration = (ongoingBreak.durationMinutes || 0) * 60 * 1000;
    const actualDuration = ongoingBreak.durationMs;
    const timeDifference = expectedDuration - actualDuration;

    // If early termination, add the remaining time as grace
    if (earlyTermination && timeDifference > 0) {
      currentSession.graceTimeMs += timeDifference;
      ongoingBreak.meta = {
        ...ongoingBreak.meta,
        earlyTermination: true,
        savedTime: timeDifference
      };
    }

    // Recalculate session times
    await recalculateSessionTimes(currentSession);
    
    await userTracker.save();

    res.json({ 
      success: true, 
      breakDuration: actualDuration,
      activeTimeMs: currentSession.activeTimeMs,
      earlyTermination,
      savedTime: earlyTermination ? timeDifference : 0,
      message: "Break ended"
    });
  } catch (e) {
    console.error('Break end error:', e);
    res.status(500).json({ success: false, message: "Failed to end break" });
  }
};

// Enhanced idle detection with 30-second rule
exports.pushIdle = async (req, res) => {
  try {
    const { sessionId, startedAt, endedAt } = req.body;
    if (!sessionId || !startedAt || !endedAt)
      return res.status(400).json({ success: false, message: "Missing fields" });

    const userTracker = await UserTracker.findOne({ "currentSession.sessionId": sessionId });
    if (!userTracker) return res.status(404).json({ success: false, message: "Session not found" });

    const currentSession = userTracker.getCurrentSession();
    if (!currentSession) {
      return res.status(404).json({ success: false, message: "Current session not found" });
    }

    const s = new Date(startedAt);
    const e = new Date(endedAt);
    const dur = Math.max(0, e - s);

    // Only count idle time if it's more than 30 seconds (31s rule)
    if (dur >= 31000) {
      currentSession.idlePeriods.push({ startedAt: s, endedAt: e, durationMs: dur });
    }

    // Recalculate session times
    await recalculateSessionTimes(currentSession);
    
    await userTracker.save();
    res.json({ success: true, activeTimeMs: currentSession.activeTimeMs });
  } catch (e) {
    console.error('Push idle error:', e);
    res.status(500).json({ success: false, message: "Failed to record idle" });
  }
};

// Activity update endpoint for real-time tracking
exports.updateActivity = async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(200).json({ success: false, isIdle: false, message: "No session id" });

    const userTracker = await UserTracker.findOne({ "currentSession.sessionId": sessionId });
    if (!userTracker) return res.status(200).json({ success: false, isIdle: false, message: "Session not found" });

    const now = new Date();
    const currentSession = userTracker.getCurrentSession();
    
    if (!currentSession) {
      return res.status(200).json({ success: false, isIdle: false, message: "Current session not found" });
    }

    // Update last activity time
    currentSession.lastActivityAt = now;
    userTracker.currentSession.lastActivityAt = now;
    userTracker.lastActivityDate = now;

    // Check if we need to end any ongoing idle period
    const ongoingIdle = currentSession.idlePeriods.find(period => !period.endedAt);
    if (ongoingIdle) {
      ongoingIdle.endedAt = now;
      ongoingIdle.durationMs = now - ongoingIdle.startedAt;
      
      // Recalculate session times
      await recalculateSessionTimes(currentSession);
    }

    await userTracker.save();

    res.json({ 
      success: true,
      isIdle: false,
      message: "Activity updated"
    });
  } catch (e) {
    console.error('Activity update error:', e);
    res.status(500).json({ success: false, message: "Failed to update activity" });
  }
};

// Idle detection - called by desktop app when no activity detected
exports.detectIdle = async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(200).json({ success: false, isIdle: false, message: "No session id" });

    const userTracker = await UserTracker.findOne({ "currentSession.sessionId": sessionId });
    if (!userTracker) return res.status(200).json({ success: false, isIdle: false, message: "Session not found" });

    const currentSession = userTracker.getCurrentSession();
    if (!currentSession) {
      return res.status(200).json({ success: false, isIdle: false, message: "Current session not found" });
    }

    const now = new Date();
    const timeSinceLastActivity = now - currentSession.lastActivityAt;
    const idleThreshold = userTracker.settings.idleThresholdSeconds * 1000; // 31 seconds

    // Only start idle if we haven't already and it's been more than 31 seconds
    const ongoingIdle = currentSession.idlePeriods.find(period => !period.endedAt);
    
    if (!ongoingIdle && timeSinceLastActivity >= idleThreshold) {
      // Start new idle period
      const idleStartTime = new Date(currentSession.lastActivityAt.getTime() + idleThreshold);
      
      currentSession.idlePeriods.push({
        startedAt: idleStartTime,
        endedAt: null,
        durationMs: 0
      });

      // Recalculate session times
      await recalculateSessionTimes(currentSession);
      
      await userTracker.save();

      res.json({ 
        success: true,
        isIdle: true,
        idleStartedAt: idleStartTime,
        message: "Idle period started"
      });
    } else {
      res.json({ 
        success: true,
        isIdle: Boolean(ongoingIdle),
        message: ongoingIdle ? "Idle period ongoing" : "Not idle yet"
      });
    }
  } catch (e) {
    console.error('Idle detection error:', e);
    res.status(500).json({ success: false, message: "Failed to detect idle" });
  }
};

// Auto-end break after duration + grace period
exports.autoEndBreak = async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ success: false, message: "Session ID required" });

    const userTracker = await UserTracker.findOne({ "currentSession.sessionId": sessionId });
    if (!userTracker) return res.status(404).json({ success: false, message: "Session not found" });

    const currentSession = userTracker.getCurrentSession();
    if (!currentSession) {
      return res.status(404).json({ success: false, message: "Current session not found" });
    }

    const ongoingBreak = currentSession.breaks.find(b => b.isOngoing);
    if (!ongoingBreak) {
      return res.status(400).json({ success: false, message: "No ongoing break" });
    }

    const now = new Date();
    const breakDuration = now - ongoingBreak.startedAt;
    const expectedDuration = (ongoingBreak.durationMinutes || 0) * 60 * 1000;
    const gracePeriod = (ongoingBreak.graceMinutes || 0) * 60 * 1000;
    const totalAllowedTime = expectedDuration + gracePeriod;

    if (breakDuration >= totalAllowedTime) {
      // Auto-end the break
      ongoingBreak.endedAt = new Date(ongoingBreak.startedAt.getTime() + expectedDuration);
      ongoingBreak.durationMs = expectedDuration;
      ongoingBreak.isOngoing = false;
      ongoingBreak.meta = {
        ...ongoingBreak.meta,
        autoEnded: true,
        graceTimeUsed: Math.max(0, breakDuration - expectedDuration)
      };

      // Add grace time if used
      const graceTimeUsed = Math.max(0, breakDuration - expectedDuration);
      if (graceTimeUsed > 0) {
        currentSession.graceTimeMs += graceTimeUsed;
      }

      // Recalculate session times
      await recalculateSessionTimes(currentSession);
      
      await userTracker.save();

      res.json({ 
        success: true, 
        autoEnded: true,
        breakDuration: expectedDuration,
        graceTimeUsed,
        message: "Break auto-ended"
      });
    } else {
      res.json({ success: true, autoEnded: false, message: "Break still ongoing" });
    }
  } catch (e) {
    console.error('Auto-end break error:', e);
    res.status(500).json({ success: false, message: "Failed to auto-end break" });
  }
};

// Get today's stats
exports.statsToday = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ success: false, message: "Email required" });

    const userTracker = await UserTracker.findOne({ email });
    if (!userTracker) {
      return res.json({
        success: true,
        totalTimeMs: 0,
        activeTimeMs: 0,
        idleTimeMs: 0,
        breaksTimeMs: 0,
        graceTimeMs: 0,
      });
    }

    const todayData = userTracker.getTodayData();
    
    // If there's an active session, calculate live totals
    if (todayData.isActive && todayData.currentSessionId) {
      const currentSession = todayData.punchSessions.find(s => s.sessionId === todayData.currentSessionId);
      if (currentSession && currentSession.status === "running") {
        const now = new Date();
        const sessionDuration = now - currentSession.punchInAt;
        
        // Add current session time to today's totals
        const liveTotals = {
          totalTimeMs: todayData.totalTimeMs + sessionDuration,
          activeTimeMs: todayData.activeTimeMs + currentSession.activeTimeMs,
          idleTimeMs: todayData.idleTimeMs + currentSession.idleTimeMs,
          breaksTimeMs: todayData.breaksTimeMs + currentSession.breaksTimeMs,
          graceTimeMs: todayData.graceTimeMs + currentSession.graceTimeMs,
        };
        
        return res.json({
          success: true,
          ...liveTotals,
          isActive: true,
          currentSessionId: todayData.currentSessionId
        });
      }
    }

    res.json({
      success: true,
      totalTimeMs: todayData.totalTimeMs,
      activeTimeMs: todayData.activeTimeMs,
      idleTimeMs: todayData.idleTimeMs,
      breaksTimeMs: todayData.breaksTimeMs,
      graceTimeMs: todayData.graceTimeMs,
      isActive: todayData.isActive,
      currentSessionId: todayData.currentSessionId
    });
  } catch (e) {
    console.error('Stats today error:', e);
    res.status(500).json({ success: false, message: "Failed to get stats" });
  }
};

// Get today's sessions
exports.listToday = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ success: false, message: "Email required" });

    const userTracker = await UserTracker.findOne({ email });
    if (!userTracker) {
      return res.json({ success: true, sessions: [] });
    }

    const todayData = userTracker.getTodayData();
    
    res.json({ 
      success: true, 
      sessions: todayData.punchSessions,
      isActive: todayData.isActive,
      currentSessionId: todayData.currentSessionId
    });
  } catch (e) {
    console.error('List today error:', e);
    res.status(500).json({ success: false, message: "Failed to list sessions" });
  }
};

// Helper functions
function getDefaultBreakDuration(type) {
  const durations = {
    'tea15': 15,
    'full45': 45,
    'meeting15': 15,
    'meeting15_2': 15,
    'custom': 10,
    'manual': 0
  };
  return durations[type] || 0;
}

function getGracePeriod(type) {
  const gracePeriods = {
    'tea15': 5,    // 5 minutes grace for 15-minute breaks
    'full45': 10,  // 10 minutes grace for 45-minute breaks
    'meeting15': 5,
    'meeting15_2': 5,
    'custom': 3,   // 3 minutes grace for custom breaks
    'manual': 0
  };
  return gracePeriods[type] || 0;
}