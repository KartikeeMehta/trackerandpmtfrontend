import React, { useState, useEffect, useRef } from "react";

const Track = () => {
  // Essential state only
  const [isActive, setIsActive] = useState(false);
  const [startAt, setStartAt] = useState(null);
  const [userName, setUserName] = useState("");
  const [tick, setTick] = useState(0);
  const [breakMs, setBreakMs] = useState(0);
  const [selectedBreakType, setSelectedBreakType] = useState("select");
  const [customBreakReason, setCustomBreakReason] = useState("");
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [breakStartTime, setBreakStartTime] = useState(null);
  const [breakType, setBreakType] = useState(null);
  const [autoEndCountdown, setAutoEndCountdown] = useState(null);
  const [activityCounts, setActivityCounts] = useState({
    keystrokes: 0,
    mouseClicks: 0,
    spamKeystrokes: 0,
  });
  const [isSpamMode, setIsSpamMode] = useState(false);

  // Essential refs only
  const tickRef = useRef(null);
  const activityRef = useRef({
    last: null,
    idle: false,
    idleSince: null,
  });
  const autoEndTimerRef = useRef(null);
  const isActiveRef = useRef(false);
  const isOnBreakRef = useRef(false);
  const statusPollRef = useRef(null);

  // Break type configurations - must match server-side BREAK_DURATION_LIMITS
  const breakTypes = {
    tea_break: { label: "Tea Break", duration: 1, color: "bg-orange-500" }, // 1 minute for testing
    lunch_break: {
      label: "Lunch/Dinner Break",
      duration: 45,
      color: "bg-blue-500",
    },
    meeting_break: {
      label: "Meeting Break",
      duration: 10,
      color: "bg-purple-500",
    },
    manual: {
      label: "Manual/Custom Break",
      duration: null, // No auto-end for manual breaks
      color: "bg-gray-500",
    },
  };

  const getAuthHeaders = () => {
    let token = null;
    try {
      token = localStorage.getItem("pf_auth_token");
    } catch (e) {
      console.error("Failed to get token:", e);
    }
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const toMs = (minutes) => (minutes || 0) * 60 * 1000;
  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const nowTs = Date.now();
  const currentBreakMs =
    isOnBreak && breakStartTime
      ? nowTs - new Date(breakStartTime).getTime()
      : 0;

  // Simplified display calculations
  const totalTime = isActive ? nowTs - new Date(startAt).getTime() : 0;

  // Simple timer for UI updates only
  const ensureTicker = () => {
    if (tickRef.current) return;
    console.log("⏰ Starting UI ticker for real-time updates");
    tickRef.current = setInterval(() => {
      setTick((t) => t + 1); // Force re-render for real-time updates
    }, 1000);
  };

  // Start global activity tracking (idle detection is handled by main process)
  const startIdleDetection = () => {
    console.log(
      "🕐 Starting global activity tracking (idle detection handled by main process)"
    );
    // The main process handles idle detection globally
    // We just need to ensure activity tracking is active
    const now = Date.now();
    activityRef.current.last = now;
    activityRef.current.idle = false;
    activityRef.current.idleSince = null;
  };

  const stopTicker = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  // Start status polling to check for break auto-end
  const startStatusPolling = () => {
    if (statusPollRef.current) return;
    console.log("🔄 Starting status polling for break auto-end detection");
    statusPollRef.current = setInterval(async () => {
      try {
        const res = await fetch(
          "http://localhost:8000/api/employee-tracker/status",
          { method: "GET", headers: getAuthHeaders(), credentials: "include" }
        );
        const data = await res.json();
        if (data && data.success && data.status) {
          const st = data.status;
          const cur = st.currentSession || null;

          if (cur && cur.isActive) {
            // Check if break status changed
            const activeBreak = Array.isArray(cur.breaks)
              ? cur.breaks.find((b) => b.isActive)
              : null;

            // If we think we're on break but server says no active break
            if (isOnBreakRef.current && !activeBreak) {
              console.log("🔄 Break auto-ended detected, updating UI");
              setIsOnBreak(false);
              isOnBreakRef.current = false;
              setBreakStartTime(null);
              setBreakType(null);
              setAutoEndCountdown(null);

              // Clear auto-end timer
              if (autoEndTimerRef.current) {
                clearTimeout(autoEndTimerRef.current);
                autoEndTimerRef.current = null;
              }

              // Restart activity and idle tracking
              const now = Date.now();
              activityRef.current.last = now;
              activityRef.current.idle = false;
              activityRef.current.idleSince = null;
              startIdleDetection();

              console.log(
                "✅ Activity and idle tracking restarted after break auto-end"
              );
            }
          }
        }
      } catch (e) {
        console.error("Status polling error:", e);
      }
    }, 2000); // Check every 2 seconds
  };

  const stopStatusPolling = () => {
    if (statusPollRef.current) {
      clearInterval(statusPollRef.current);
      statusPollRef.current = null;
      console.log("🔄 Stopped status polling");
    }
  };

  // Simple status check
  const checkStatus = async () => {
    try {
      const res = await fetch(
        "http://localhost:8000/api/employee-tracker/status",
        { method: "GET", headers: getAuthHeaders(), credentials: "include" }
      );
      const data = await res.json();
      if (!data || data.success === false) return;

      const st = data.status || {};
      const cur = st.currentSession || null;

      if (cur && cur.isActive) {
        setIsActive(true);
        isActiveRef.current = true;
        setStartAt(cur.startTime ? new Date(cur.startTime) : new Date());
        setBreakMs(toMs(cur.totalBreakTime || 0));

        // Check for active break
        const activeBreak = Array.isArray(cur.breaks)
          ? cur.breaks.find((b) => b.isActive)
          : null;
        if (activeBreak) {
          setIsOnBreak(true);
          isOnBreakRef.current = true;
          setBreakStartTime(
            activeBreak.startTime ? new Date(activeBreak.startTime) : new Date()
          );
          setBreakType(activeBreak.breakType || "manual");
        } else {
          setIsOnBreak(false);
          isOnBreakRef.current = false;
        }
      } else {
        setIsActive(false);
        isActiveRef.current = false;
        setStartAt(null);
        setBreakMs(0);
        setIsOnBreak(false);
        isOnBreakRef.current = false;
        setBreakStartTime(null);
        setBreakType(null);
      }
    } catch (e) {
      console.error("Status check error:", e);
    }
  };

  // Function to schedule automatic break ending
  const scheduleAutoBreakEnd = (breakType) => {
    const durationLimit = breakTypes[breakType]?.duration;
    if (!durationLimit) {
      console.log(`No auto-end configured for ${breakType} break`);
      setAutoEndCountdown(null);
      return;
    }

    // Clear any existing timer
    if (autoEndTimerRef.current) {
      clearTimeout(autoEndTimerRef.current);
    }

    // Set initial countdown
    setAutoEndCountdown(durationLimit * 60); // Convert to seconds

    // Update countdown every second
    const countdownInterval = setInterval(() => {
      setAutoEndCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    // Set new timer
    autoEndTimerRef.current = setTimeout(async () => {
      console.log(
        `Auto-ending ${breakType} break after ${durationLimit} minutes`
      );
      clearInterval(countdownInterval);
      setAutoEndCountdown(null);
      try {
        // Check if still on break before attempting to end
        if (isOnBreak) {
          await endBreak();
          console.log(`Successfully auto-ended ${breakType} break`);
        } else {
          console.log(`Break already ended, skipping auto-end`);
        }
      } catch (error) {
        console.error("Error auto-ending break:", error);
        // Update UI even if API fails
        setIsOnBreak(false);
        setBreakStartTime(null);
        setBreakType(null);
      }
    }, durationLimit * 60 * 1000); // Convert minutes to milliseconds

    console.log(
      `Scheduled auto-end for ${breakType} break in ${durationLimit} minutes`
    );
  };

  const punchIn = async () => {
    try {
      const res = await fetch(
        "http://localhost:8000/api/employee-tracker/punch-in",
        {
          method: "POST",
          headers: getAuthHeaders(),
          credentials: "include",
        }
      );
      const data = await res.json();
      if (data.success) {
        await checkStatus();
        // Start idle countdown immediately on punch-in
        const now = Date.now();
        activityRef.current.last = now;
        activityRef.current.idle = false;
        activityRef.current.idleSince = null;
        console.log(
          "✅ Punched in - initialized activity tracking at",
          new Date(now).toLocaleTimeString()
        );

        // Reset activity counters for new session
        if (window.tracker && window.tracker.resetActivityCounters) {
          try {
            await window.tracker.resetActivityCounters();
            console.log("🔄 Activity counters reset for new session");
          } catch (e) {
            console.error("Failed to reset activity counters:", e);
          }
        }

        ensureTicker();
        startIdleDetection(); // Start idle detection
      }
    } catch (e) {
      console.error("Punch in error:", e);
    }
  };

  const punchOut = async () => {
    try {
      // Send final activity counts before punching out
      if (window.tracker && window.tracker.getActivityCounts) {
        try {
          const counts = await window.tracker.getActivityCounts();
          if (counts.keystrokes > 0 || counts.mouseClicks > 0) {
            console.log(
              "📊 Sending final activity counts on punch out:",
              counts
            );
            await fetch(
              "http://localhost:8000/api/employee-tracker/activity/update",
              {
                method: "POST",
                headers: getAuthHeaders(),
                credentials: "include",
                body: JSON.stringify({
                  keystrokes: counts.keystrokes,
                  mouseClicks: counts.mouseClicks,
                  spamKeystrokes: counts.spamKeystrokes,
                }),
              }
            );
          }
        } catch (e) {
          console.error("Error sending final activity counts:", e);
        }
      }

      const res = await fetch(
        "http://localhost:8000/api/employee-tracker/punch-out",
        {
          method: "POST",
          headers: getAuthHeaders(),
          credentials: "include",
        }
      );
      const data = await res.json();
      if (data.success) {
        await checkStatus();
        stopTicker();
        stopStatusPolling();
        // Global idle detection is handled by main process, no cleanup needed
      }
    } catch (e) {
      console.error("Punch out error:", e);
    }
  };

  const startBreak = async () => {
    if (selectedBreakType === "select") {
      alert("Please select a break type");
      return;
    }
    if (selectedBreakType === "manual" && !customBreakReason.trim()) {
      alert("Please provide a reason for manual break");
      return;
    }

    try {
      const res = await fetch(
        "http://localhost:8000/api/employee-tracker/break/start",
        {
          method: "POST",
          headers: getAuthHeaders(),
          credentials: "include",
          body: JSON.stringify({
            breakType: selectedBreakType,
            reason: selectedBreakType === "manual" ? customBreakReason : "",
          }),
        }
      );
      const data = await res.json();
      if (data.success) {
        setIsOnBreak(true);
        isOnBreakRef.current = true;
        setBreakStartTime(new Date());
        setBreakType(selectedBreakType);
        setSelectedBreakType("select");
        setCustomBreakReason("");

        // Set up automatic break ending based on break type
        scheduleAutoBreakEnd(selectedBreakType);

        // Start status polling to detect auto-end
        startStatusPolling();

        await checkStatus();
      }
    } catch (e) {
      console.error("Start break error:", e);
    }
  };

  const endBreak = async () => {
    try {
      const res = await fetch(
        "http://localhost:8000/api/employee-tracker/break/end",
        {
          method: "POST",
          headers: getAuthHeaders(),
          credentials: "include",
        }
      );
      const data = await res.json();
      if (data.success) {
        // Clear auto-end timer and countdown
        if (autoEndTimerRef.current) {
          clearTimeout(autoEndTimerRef.current);
          autoEndTimerRef.current = null;
          console.log("Cleared auto-end timer for manual break end");
        }
        setAutoEndCountdown(null);

        setIsOnBreak(false);
        isOnBreakRef.current = false;
        setBreakStartTime(null);
        setBreakType(null);

        // Stop status polling since break is manually ended
        stopStatusPolling();

        // Restart activity and idle tracking
        const now = Date.now();
        activityRef.current.last = now;
        activityRef.current.idle = false;
        activityRef.current.idleSince = null;
        startIdleDetection();

        console.log(
          "✅ Activity and idle tracking restarted after manual break end"
        );

        await checkStatus();
      }
    } catch (e) {
      console.error("End break error:", e);
    }
  };

  const loadProfile = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/profile", {
        method: "GET",
        headers: getAuthHeaders(),
        credentials: "include",
      });
      const data = await res.json();
      if (data.success && data.user) {
        setUserName(data.user.name || data.user.email || "User");
      }
    } catch (e) {
      console.error("Profile load error:", e);
    }
  };

  // Global activity monitoring (works even when app is minimized/in tray)
  useEffect(() => {
    if (!isActiveRef.current) return;

    const markActivity = (event) => {
      const now = Date.now();
      console.log(
        "🖱️ Global activity detected:",
        event.source || "unknown",
        "at",
        new Date(now).toLocaleTimeString()
      );

      // Update activity counts from main process
      if (
        event.keystrokes !== undefined ||
        event.mouseClicks !== undefined ||
        event.spamKeystrokes !== undefined
      ) {
        setActivityCounts({
          keystrokes: event.keystrokes || 0,
          mouseClicks: event.mouseClicks || 0,
          spamKeystrokes: event.spamKeystrokes || 0,
        });
      }

      // Ignore activity transitions while on break
      if (isOnBreakRef.current) {
        activityRef.current.last = now;
        return;
      }

      // If idle and user becomes active, end idle
      if (activityRef.current.idle) {
        try {
          console.log("🟢 Ending idle time - calling API");
          fetch("http://localhost:8000/api/employee-tracker/idle/end", {
            method: "POST",
            headers: getAuthHeaders(),
            credentials: "include",
            body: JSON.stringify({ endedAt: new Date().toISOString() }),
          })
            .then((response) => response.json())
            .then((data) => {
              console.log("🟢 Idle end API response:", data);
            })
            .catch((e) => {
              console.error("❌ Idle end error:", e);
            });
        } catch (e) {
          console.error("❌ Idle end error:", e);
        }
        activityRef.current.idle = false;
        activityRef.current.idleSince = null;
      }

      // Update last activity time and restart idle detection
      activityRef.current.last = now;
      startIdleDetection(); // Restart the 5-second timer
    };

    const handleIdleStart = (event) => {
      const reason = event.reason || "normal";
      console.log(
        `🟡 Global idle start detected at ${new Date().toLocaleTimeString()} (reason: ${reason})`
      );
      console.log("🟡 Full idle start event:", event);

      // Only process if we're active and not on break
      if (!isActiveRef.current || isOnBreakRef.current) {
        console.log("⏸️ Ignoring idle start - not active or on break");
        return;
      }

      // Track spam mode
      if (reason === "key-spam") {
        setIsSpamMode(true);
        console.log("🚫 SPAM MODE ACTIVATED in renderer");
      }

      // The main process handles idle detection, we just need to track it
      activityRef.current.idle = true;
      activityRef.current.idleSince = Date.now();

      // Notify backend
      const idleType = reason === "key-spam" ? "spam" : "auto";
      console.log(`🟡 Sending idle start to backend with type: ${idleType}`);

      fetch("http://localhost:8000/api/employee-tracker/idle/start", {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          idleType: idleType,
          startedAt: new Date().toISOString(),
        }),
      })
        .then((response) => {
          console.log("🟡 Idle start response status:", response.status);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          return response.json();
        })
        .then((data) => {
          console.log("🟡 Idle start API response:", data);
        })
        .catch((e) => {
          console.error("❌ Idle start error:", e);
          console.error("❌ Error details:", e.message);
        });
    };

    const handleIdleEnd = (event) => {
      const source = event.source || "unknown";
      console.log(
        `🟢 Global idle end detected at ${new Date().toLocaleTimeString()} (source: ${source})`
      );
      console.log("🟢 Full idle end event:", event);

      // Only process if we were idle
      if (!activityRef.current.idle) {
        console.log("⏸️ Ignoring idle end - not currently idle");
        return;
      }

      // Track spam mode end
      if (source === "spam-recovery") {
        setIsSpamMode(false);
        console.log("✅ SPAM MODE DEACTIVATED in renderer");
      }

      // The main process handles idle detection, we just need to track it
      activityRef.current.idle = false;
      activityRef.current.idleSince = null;

      // Notify backend
      console.log("🟢 Sending idle end to backend");
      fetch("http://localhost:8000/api/employee-tracker/idle/end", {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ endedAt: new Date().toISOString() }),
      })
        .then((response) => {
          console.log("🟢 Idle end response status:", response.status);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          return response.json();
        })
        .then((data) => {
          console.log("🟢 Idle end API response:", data);
        })
        .catch((e) => {
          console.error("❌ Idle end error:", e);
          console.error("❌ Error details:", e.message);
        });
    };

    // Listen to global activity events from main process
    if (window.tracker) {
      window.tracker.onActivity(markActivity);
      window.tracker.onIdleStart(handleIdleStart);
      window.tracker.onIdleEnd(handleIdleEnd);
    }

    return () => {
      // Cleanup is handled by the preload script
    };
  }, [isActive, isOnBreak]); // Keep dependencies for useEffect

  // Fetch activity counts and send to backend periodically
  useEffect(() => {
    if (!isActiveRef.current) return;

    const fetchAndUpdateActivityCounts = async () => {
      if (window.tracker && window.tracker.getActivityCounts) {
        try {
          const counts = await window.tracker.getActivityCounts();
          setActivityCounts(counts);

          // Send activity counts to backend if there's any activity
          if (counts.keystrokes > 0 || counts.mouseClicks > 0) {
            console.log("📊 Sending activity counts to backend:", counts);
            fetch(
              "http://localhost:8000/api/employee-tracker/activity/update",
              {
                method: "POST",
                headers: getAuthHeaders(),
                credentials: "include",
                body: JSON.stringify({
                  keystrokes: counts.keystrokes,
                  mouseClicks: counts.mouseClicks,
                  spamKeystrokes: counts.spamKeystrokes,
                }),
              }
            )
              .then((response) => response.json())
              .then((data) => {
                console.log("📊 Activity update response:", data);
                // Reset counters after successful update
                if (data.success && window.tracker.resetActivityCounters) {
                  window.tracker.resetActivityCounters();
                }
              })
              .catch((e) => {
                console.error("❌ Activity update error:", e);
              });
          }
        } catch (e) {
          console.error("Failed to fetch activity counts:", e);
        }
      }
    };

    // Fetch and update counts every 10 seconds
    const interval = setInterval(fetchAndUpdateActivityCounts, 10000);

    return () => clearInterval(interval);
  }, [isActive]);

  // Initialize on mount
  useEffect(() => {
    checkStatus();
    loadProfile();

    return () => {
      stopTicker();
      stopStatusPolling();
      // Clear auto-end timer on cleanup
      if (autoEndTimerRef.current) {
        clearTimeout(autoEndTimerRef.current);
        autoEndTimerRef.current = null;
      }
      // Global idle detection is handled by main process, no cleanup needed
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Time Tracker
          </h1>
          <p className="text-gray-600">Welcome, {userName}</p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Punch In/Out Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {isActive ? "Currently Working" : "Ready to Start"}
              </h3>
              {!isActive ? (
                <button
                  onClick={punchIn}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
                >
                  Punch In
                </button>
              ) : (
                <button
                  onClick={punchOut}
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
                >
                  Punch Out
                </button>
              )}
            </div>
          </div>

          {/* Total Time Card - Only show when active */}
          {isActive && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Total Time
                </h3>
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              </div>
              <div className="text-3xl sm:text-4xl font-bold text-blue-600 font-mono">
                {formatTime(totalTime)}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                From punch in to punch out
              </p>
            </div>
          )}

          {/* Activity Statistics Card - Only show when active */}
          {isActive && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Activity Statistics
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {activityCounts.keystrokes}
                  </div>
                  <div className="text-sm text-gray-500">Keystrokes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {activityCounts.mouseClicks}
                  </div>
                  <div className="text-sm text-gray-500">Mouse Clicks</div>
                </div>
              </div>
              {activityCounts.spamKeystrokes > 0 && (
                <div className="mt-4 p-3 bg-red-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-600">
                      {activityCounts.spamKeystrokes}
                    </div>
                    <div className="text-sm text-red-500">
                      Spam Keystrokes (Excluded)
                    </div>
                  </div>
                </div>
              )}
              {isSpamMode && (
                <div className="mt-4 p-3 bg-red-100 border-2 border-red-300 rounded-lg">
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-700">
                      🚫 SPAM MODE ACTIVE
                    </div>
                    <div className="text-sm text-red-600">
                      Idle time is being calculated
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Break Management Card - Only show when active */}
          {isActive && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Break Management
              </h3>

              {!isOnBreak ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Break Type
                    </label>
                    <select
                      value={selectedBreakType}
                      onChange={(e) => setSelectedBreakType(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="select">Select Break Type</option>
                      {Object.entries(breakTypes).map(([key, config]) => (
                        <option key={key} value={key}>
                          {config.label}
                          {config.duration && ` (${config.duration} min)`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedBreakType === "manual" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reason
                      </label>
                      <input
                        type="text"
                        value={customBreakReason}
                        onChange={(e) => setCustomBreakReason(e.target.value)}
                        placeholder="Enter break reason"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                  )}

                  <button
                    onClick={startBreak}
                    disabled={!isActive || selectedBreakType === "select"}
                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
                  >
                    Start Break
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-sm font-medium mb-4">
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                    On {breakTypes[breakType]?.label || "Break"}
                  </div>
                  <div className="text-2xl font-bold text-orange-600 font-mono mb-4">
                    {formatTime(
                      breakStartTime
                        ? Date.now() - new Date(breakStartTime).getTime()
                        : 0
                    )}
                  </div>
                  {autoEndCountdown && (
                    <div className="text-sm text-orange-500 mb-2">
                      Auto-ends in: {Math.floor(autoEndCountdown / 60)}:
                      {(autoEndCountdown % 60).toString().padStart(2, "0")}
                    </div>
                  )}
                  <button
                    onClick={endBreak}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
                  >
                    End Break
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Track;
