const EmployeeTracker = require("../models/EmployeeTracker");
const User = require("../models/User");
const Employee = require("../models/Employee");

// Helper function to get or create employee tracker
const getOrCreateEmployeeTracker = async (employeeId, companyId) => {
  let tracker = await EmployeeTracker.findOne({ employeeId });
  
  // Always fetch employee info to ensure we have the latest data
  const employee = await Employee.findById(employeeId).select('name email teamMemberId designation addedBy');
  
  if (!tracker) {
    // Get the company owner ID from the employee's addedBy field
    const actualCompanyId = employee?.addedBy || companyId;
    
    tracker = new EmployeeTracker({
      employeeId,
      companyId: actualCompanyId,
      employeeInfo: {
        name: employee?.name || '',
        email: employee?.email || '',
        teamMember_Id: employee?.teamMemberId || ''
      }
    });
    
    await tracker.save();
  } else {
    // Always update employee info and companyId for existing trackers
    tracker.employeeInfo = {
      name: employee?.name || '',
      email: employee?.email || '',
      teamMember_Id: employee?.teamMemberId || ''
    };
    
    // Update companyId if it's wrong
    if (employee?.addedBy) {
      tracker.companyId = employee.addedBy;
    }
    
    await tracker.save();
  }
  
  return tracker;
};

// Punch In - Start work session
exports.punchIn = async (req, res) => {
  try {
    const employeeId = req.user._id;
    const companyId = req.user.companyId || req.user._id; // Use user's company or self if admin
    
    const tracker = await getOrCreateEmployeeTracker(employeeId, companyId);
    
    // Check if already punched in
    if (tracker.isActive && tracker.currentSession?.isActive) {
      return res.status(400).json({
        success: false,
        message: "Already punched in. Please punch out first.",
        currentSession: tracker.currentSession
      });
    }
    
    // Start new work session
    const newSession = tracker.startWorkSession();
    await tracker.save();
    
    res.json({
      success: true,
      message: "Punched in successfully",
      session: newSession, // Already in IST and minutes
      status: tracker.getCurrentStatus()
    });
    
  } catch (error) {
    console.error('Punch in error:', error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error during punch in"
    });
  }
};

// Punch Out - End work session
exports.punchOut = async (req, res) => {
  try {
    const employeeId = req.user._id;
    
    const tracker = await EmployeeTracker.findOne({ employeeId });
    if (!tracker) {
      return res.status(404).json({
        success: false,
        message: "Employee tracker not found"
      });
    }
    
    // Check if there's an active session
    if (!tracker.isActive || !tracker.currentSession?.isActive) {
      return res.status(400).json({
        success: false,
        message: "No active session to punch out from"
      });
    }
    
    // End work session
    const endedSession = tracker.endWorkSession();
    await tracker.save();
    
    res.json({
      success: true,
      message: "Punched out successfully",
      endedSession: endedSession, // Already in IST and minutes
      status: tracker.getCurrentStatus()
    });
    
  } catch (error) {
    console.error('Punch out error:', error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error during punch out"
    });
  }
};

// Start Break
exports.startBreak = async (req, res) => {
  try {
    const employeeId = req.user._id;
    const { breakType = 'manual', reason = '' } = req.body;
    
    const tracker = await EmployeeTracker.findOne({ employeeId });
    if (!tracker) {
      return res.status(404).json({
        success: false,
        message: "Employee tracker not found"
      });
    }
    
    // Start break
    const newBreak = tracker.startBreak(breakType, reason);
    
    // Recalculate current session times and update stats
    tracker.recalculateCurrentSessionTimes();
    tracker.updateDailySummary();
    tracker.updateOverallStats();
    
    await tracker.save();
    
    res.json({
      success: true,
      message: "Break started successfully",
      break: newBreak, // Already in IST and minutes
      currentSession: tracker.currentSession // Already in IST and minutes
    });
    
  } catch (error) {
    console.error('Start break error:', error);
    res.status(400).json({
      success: false,
      message: error.message || "Error starting break"
    });
  }
};

// End Break
exports.endBreak = async (req, res) => {
  try {
    const employeeId = req.user._id;
    
    const tracker = await EmployeeTracker.findOne({ employeeId });
    if (!tracker) {
      return res.status(404).json({
        success: false,
        message: "Employee tracker not found"
      });
    }
    
    // End break
    const endedBreak = tracker.endBreak();
    
    // Recalculate current session times and update stats
    tracker.recalculateCurrentSessionTimes();
    tracker.updateDailySummary();
    tracker.updateOverallStats();
    
    await tracker.save();
    
    res.json({
      success: true,
      message: "Break ended successfully",
      endedBreak: endedBreak, // Already in IST and minutes
      currentSession: tracker.currentSession // Already in IST and minutes
    });
    
  } catch (error) {
    console.error('End break error:', error);
    res.status(400).json({
      success: false,
      message: error.message || "Error ending break"
    });
  }
};

// Add Screenshot
exports.addScreenshot = async (req, res) => {
  try {
    const employeeId = req.user._id;
    const screenshotData = req.body;
    
    // If file was uploaded via multer
    if (req.file) {
      screenshotData.filename = req.file.filename;
      screenshotData.filePath = `/uploads/screenshots/${req.file.filename}`;
    }
    
    const tracker = await EmployeeTracker.findOne({ employeeId });
    if (!tracker) {
      return res.status(404).json({
        success: false,
        message: "Employee tracker not found"
      });
    }
    
    // Add screenshot
    const screenshot = tracker.addScreenshot(screenshotData);
    await tracker.save();
    
    res.json({
      success: true,
      message: "Screenshot added successfully",
      screenshot: screenshot,
      sessionStats: {
        totalScreenshots: tracker.currentSession?.totalScreenshots || 0,
        totalKeystrokes: tracker.currentSession?.totalKeystrokes || 0,
        totalMouseClicks: tracker.currentSession?.totalMouseClicks || 0
      }
    });
    
  } catch (error) {
    console.error('Add screenshot error:', error);
    res.status(400).json({
      success: false,
      message: error.message || "Error adding screenshot"
    });
  }
};

// Update Activity (keystrokes, mouse clicks)
exports.updateActivity = async (req, res) => {
  try {
    const employeeId = req.user._id;
    const { keystrokes = 0, mouseClicks = 0 } = req.body;
    
    const tracker = await EmployeeTracker.findOne({ employeeId });
    if (!tracker) {
      return res.status(404).json({
        success: false,
        message: "Employee tracker not found"
      });
    }
    
    // Update activity
    tracker.updateActivity(keystrokes, mouseClicks);
    await tracker.save();
    
    res.json({
      success: true,
      message: "Activity updated successfully",
      sessionStats: {
        totalKeystrokes: tracker.currentSession?.totalKeystrokes || 0,
        totalMouseClicks: tracker.currentSession?.totalMouseClicks || 0,
        lastActivity: tracker.lastActivity
      }
    });
    
  } catch (error) {
    console.error('Update activity error:', error);
    res.status(500).json({
      success: false,
      message: "Error updating activity"
    });
  }
};

// Idle Start
exports.idleStart = async (req, res) => {
  try {
    const employeeId = req.user._id;
    const { idleType = 'auto', startedAt } = req.body;
    const tracker = await EmployeeTracker.findOne({ employeeId });
    if (!tracker) {
      return res.status(404).json({ success: false, message: 'Employee tracker not found' });
    }
    // Just acknowledge start; duration is accounted on idleEnd
    tracker._lastIdleStart = startedAt ? new Date(startedAt) : tracker.getISTTime();
    await tracker.save();
    res.json({ success: true, message: 'Idle started', idleType, startedAt: tracker._lastIdleStart });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error starting idle' });
  }
};

// Idle End
exports.idleEnd = async (req, res) => {
  try {
    const employeeId = req.user._id;
    const { endedAt } = req.body;
    const tracker = await EmployeeTracker.findOne({ employeeId });
    if (!tracker) {
      return res.status(404).json({ success: false, message: 'Employee tracker not found' });
    }
    const endTs = endedAt ? new Date(endedAt) : tracker.getISTTime();
    let startTs = tracker._lastIdleStart || null;
    if (!startTs) {
      // Fallback: treat as small idle (0) to avoid negative
      startTs = endTs;
    }
    const diffMs = Math.max(0, endTs.getTime() - startTs.getTime());
    tracker.addIdleTime(diffMs);
    tracker._lastIdleStart = null;
    tracker.recalculateCurrentSessionTimes();
    tracker.updateDailySummary();
    tracker.updateOverallStats();
    await tracker.save();
    res.json({ success: true, message: 'Idle ended', addedMs: diffMs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error ending idle' });
  }
};

// Add Idle Time
exports.addIdleTime = async (req, res) => {
  try {
    const employeeId = req.user._id;
    const { idleSeconds } = req.body;
    
    if (!idleSeconds || idleSeconds <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid idle time provided"
      });
    }
    
    const tracker = await EmployeeTracker.findOne({ employeeId });
    if (!tracker) {
      return res.status(404).json({
        success: false,
        message: "Employee tracker not found"
      });
    }
    
    // Add idle time
    const idleMilliseconds = idleSeconds * 1000;
    tracker.addIdleTime(idleMilliseconds);
    await tracker.save();
    
    res.json({
      success: true,
      message: "Idle time recorded successfully",
      idleTime: {
        addedSeconds: idleSeconds,
        totalIdleTime: tracker.currentSession?.idleTime || 0
      }
    });
    
  } catch (error) {
    console.error('Add idle time error:', error);
    res.status(500).json({
      success: false,
      message: "Error recording idle time"
    });
  }
};

// Get Current Status
exports.getCurrentStatus = async (req, res) => {
  try {
    const employeeId = req.user._id;
    
    const tracker = await EmployeeTracker.findOne({ employeeId });
    if (!tracker) {
      return res.json({
        success: true,
        message: "No tracker found - employee hasn't started tracking yet",
        status: {
          isActive: false,
          currentSession: null,
          lastActivity: null,
          todaySummary: null,
          overallStats: null
        }
      });
    }
    
    // Always update employee info and companyId
    const employee = await Employee.findById(employeeId).select('name email teamMemberId designation addedBy');
    
    tracker.employeeInfo = {
      name: employee?.name || '',
      email: employee?.email || '',
      teamMember_Id: employee?.teamMemberId || ''
    };
    
    // Update companyId if it's wrong
    if (employee?.addedBy) {
      tracker.companyId = employee.addedBy;
    }
    
    await tracker.save();
    
    const status = tracker.getCurrentStatus();
    
    res.json({
      success: true,
      message: "Status retrieved successfully",
      status: status,
      employeeInfo: tracker.employeeInfo
    });
    
  } catch (error) {
    console.error('Get current status error:', error);
    res.status(500).json({
      success: false,
      message: "Error getting current status"
    });
  }
};

// Get Daily Summary
exports.getDailySummary = async (req, res) => {
  try {
    const employeeId = req.user._id;
    const { date } = req.query; // YYYY-MM-DD format
    
    const tracker = await EmployeeTracker.findOne({ employeeId });
    if (!tracker) {
      return res.status(404).json({
        success: false,
        message: "Employee tracker not found"
      });
    }
    
    const targetDate = date || tracker.getTodayDateString();
    const dailySummary = tracker.dailySummaries.find(summary => summary.date === targetDate);
    
    if (!dailySummary) {
      return res.json({
        success: true,
        message: "No data found for the specified date",
        date: targetDate,
        summary: null
      });
    }
    
    res.json({
      success: true,
      message: "Daily summary retrieved successfully",
      date: targetDate,
      summary: dailySummary // Already in IST and minutes
    });
    
  } catch (error) {
    console.error('Get daily summary error:', error);
    res.status(500).json({
      success: false,
      message: "Error getting daily summary"
    });
  }
};

// Get Date Range Summary
exports.getDateRangeSummary = async (req, res) => {
  try {
    const employeeId = req.user._id;
    const { startDate, endDate } = req.query;
    
    const tracker = await EmployeeTracker.findOne({ employeeId });
    if (!tracker) {
      return res.status(404).json({
        success: false,
        message: "Employee tracker not found"
      });
    }
    
    let summaries = tracker.dailySummaries;
    
    // Filter by date range if provided
    if (startDate || endDate) {
      summaries = summaries.filter(summary => {
        const summaryDate = summary.date;
        if (startDate && summaryDate < startDate) return false;
        if (endDate && summaryDate > endDate) return false;
        return true;
      });
    }
    
    // Sort by date (most recent first)
    summaries.sort((a, b) => b.date.localeCompare(a.date));
    
    res.json({
      success: true,
      message: "Date range summary retrieved successfully",
      startDate: startDate || "all",
      endDate: endDate || "all",
      summaries: summaries, // Already in IST and minutes
      count: summaries.length
    });
    
  } catch (error) {
    console.error('Get date range summary error:', error);
    res.status(500).json({
      success: false,
      message: "Error getting date range summary"
    });
  }
};

// Get Screenshots
exports.getScreenshots = async (req, res) => {
  try {
    const employeeId = req.user._id;
    const { sessionId, date, limit = 50, offset = 0 } = req.query;
    
    const tracker = await EmployeeTracker.findOne({ employeeId });
    if (!tracker) {
      return res.status(404).json({
        success: false,
        message: "Employee tracker not found"
      });
    }
    
    let screenshots = tracker.screenshots;
    
    // Filter by session ID
    if (sessionId) {
      screenshots = screenshots.filter(screenshot => screenshot.sessionId === sessionId);
    }
    
    // Filter by date
    if (date) {
      screenshots = screenshots.filter(screenshot => 
        screenshot.timestamp.toISOString().split('T')[0] === date
      );
    }
    
    // Sort by timestamp (most recent first)
    screenshots.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    // Apply pagination
    const paginatedScreenshots = screenshots.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    
    res.json({
      success: true,
      message: "Screenshots retrieved successfully",
      screenshots: paginatedScreenshots,
      total: screenshots.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
  } catch (error) {
    console.error('Get screenshots error:', error);
    res.status(500).json({
      success: false,
      message: "Error getting screenshots"
    });
  }
};

// Get Overall Statistics
exports.getOverallStats = async (req, res) => {
  try {
    const employeeId = req.user._id;
    
    const tracker = await EmployeeTracker.findOne({ employeeId });
    if (!tracker) {
      return res.status(404).json({
        success: false,
        message: "Employee tracker not found"
      });
    }
    
    // Update overall stats before returning
    tracker.updateOverallStats();
    await tracker.save();
    
    res.json({
      success: true,
      message: "Overall statistics retrieved successfully",
      stats: tracker.overallStats, // Already in minutes
      employeeInfo: tracker.employeeInfo
    });
    
  } catch (error) {
    console.error('Get overall stats error:', error);
    res.status(500).json({
      success: false,
      message: "Error getting overall statistics"
    });
  }
};

// Update Settings
exports.updateSettings = async (req, res) => {
  try {
    const employeeId = req.user._id;
    const settingsUpdate = req.body;
    
    const tracker = await EmployeeTracker.findOne({ employeeId });
    if (!tracker) {
      return res.status(404).json({
        success: false,
        message: "Employee tracker not found"
      });
    }
    
    // Update settings
    Object.keys(settingsUpdate).forEach(key => {
      if (tracker.settings[key] !== undefined) {
        tracker.settings[key] = settingsUpdate[key];
      }
    });
    
    await tracker.save();
    
    res.json({
      success: true,
      message: "Settings updated successfully",
      settings: tracker.settings
    });
    
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      message: "Error updating settings"
    });
  }
};

// Admin: Get All Employees Tracking Data
exports.getAllEmployeesData = async (req, res) => {
  try {
    const companyId = req.user._id; // Assuming admin user
    const { date, isActive } = req.query;
    
    let query = { companyId };
    
    // Filter by active status if provided
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    let trackers = await EmployeeTracker.find(query).select('-screenshots'); // Exclude screenshots for performance
    
    // Filter by date if provided
    if (date) {
      trackers = trackers.map(tracker => {
        const dailySummary = tracker.dailySummaries.find(summary => summary.date === date);
        return {
          ...tracker.toObject(),
          dailySummaries: dailySummary ? [dailySummary] : []
        };
      });
    }
    
    res.json({
      success: true,
      message: "All employees data retrieved successfully",
      employees: trackers, // Already in IST and minutes
      count: trackers.length
    });
    
  } catch (error) {
    console.error('Get all employees data error:', error);
    res.status(500).json({
      success: false,
      message: "Error getting all employees data"
    });
  }
};