const mongoose = require("mongoose");

// Screenshot schema for tracking user activity
const screenshotSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  filename: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  sessionId: {
    type: String,
    required: true // Links to which session this screenshot belongs
  },
  activityLevel: {
    type: String,
    enum: ['high', 'medium', 'low', 'idle'],
    default: 'medium'
  },
  keystrokes: {
    type: Number,
    default: 0
  },
  mouseClicks: {
    type: Number,
    default: 0
  },
  activeWindow: {
    type: String,
    default: ''
  }
}, { _id: true });

// Break session schema
const breakSessionSchema = new mongoose.Schema({
  breakId: {
    type: String,
    required: true,
    default: () => new mongoose.Types.ObjectId().toString()
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    default: null
  },
  duration: {
    type: Number, // in milliseconds
    default: 0
  },
  breakType: {
    type: String,
    enum: ['manual', 'auto', 'lunch', 'meeting'],
    default: 'manual'
  },
  reason: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { _id: false });

// Work session schema
const workSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    default: () => new mongoose.Types.ObjectId().toString()
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    default: null
  },
  duration: {
    type: Number, // in milliseconds
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Activity metrics
  totalKeystrokes: {
    type: Number,
    default: 0
  },
  totalMouseClicks: {
    type: Number,
    default: 0
  },
  totalScreenshots: {
    type: Number,
    default: 0
  },
  // Break tracking within this session
  breaks: [breakSessionSchema],
  totalBreakTime: {
    type: Number, // in milliseconds
    default: 0
  },
  // Idle tracking
  idleTime: {
    type: Number, // in milliseconds
    default: 0
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  // Productivity metrics
  productiveTime: {
    type: Number, // in milliseconds (duration - breaks - idle)
    default: 0
  },
  activityPercentage: {
    type: Number, // percentage of productive time
    default: 0
  }
}, { _id: false });

// Daily summary schema
const dailySummarySchema = new mongoose.Schema({
  date: {
    type: String, // YYYY-MM-DD format
    required: true
  },
  totalWorkTime: {
    type: Number, // in milliseconds
    default: 0
  },
  totalBreakTime: {
    type: Number, // in milliseconds
    default: 0
  },
  totalIdleTime: {
    type: Number, // in milliseconds
    default: 0
  },
  totalProductiveTime: {
    type: Number, // in milliseconds
    default: 0
  },
  totalKeystrokes: {
    type: Number,
    default: 0
  },
  totalMouseClicks: {
    type: Number,
    default: 0
  },
  totalScreenshots: {
    type: Number,
    default: 0
  },
  sessionsCount: {
    type: Number,
    default: 0
  },
  breaksCount: {
    type: Number,
    default: 0
  },
  averageActivityPercentage: {
    type: Number,
    default: 0
  },
  firstPunchIn: {
    type: Date,
    default: null
  },
  lastPunchOut: {
    type: Date,
    default: null
  }
}, { _id: false });

// Main Employee Tracker schema
const employeeTrackerSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  // Employee basic info (cached for quick access)
  employeeInfo: {
    name: String,
    email: String,
    teamMember_Id: String
  },
  
  // Current active session
  currentSession: {
    type: workSessionSchema,
    default: null
  },
  
  // All work sessions (historical data)
  workSessions: [workSessionSchema],
  
  // All screenshots for this employee
  screenshots: [screenshotSchema],
  
  // Daily summaries for quick reporting
  dailySummaries: [dailySummarySchema],
  
  // Overall statistics
  overallStats: {
    totalDaysWorked: {
      type: Number,
      default: 0
    },
    totalWorkTime: {
      type: Number, // in milliseconds
      default: 0
    },
    totalBreakTime: {
      type: Number, // in milliseconds
      default: 0
    },
    totalIdleTime: {
      type: Number, // in milliseconds
      default: 0
    },
    totalProductiveTime: {
      type: Number, // in milliseconds
      default: 0
    },
    totalKeystrokes: {
      type: Number,
      default: 0
    },
    totalMouseClicks: {
      type: Number,
      default: 0
    },
    totalScreenshots: {
      type: Number,
      default: 0
    },
    averageWorkHoursPerDay: {
      type: Number,
      default: 0
    },
    averageProductivityPercentage: {
      type: Number,
      default: 0
    }
  },
  
  // Idle tracking state (not persisted in work sessions)
  _lastIdleStart: {
    type: Date,
    default: null
  },
  
  // Settings and preferences
  settings: {
    autoIdleDetection: {
      type: Boolean,
      default: true
    },
    idleThresholdSeconds: {
      type: Number,
      default: 300 // 5 minutes
    },
    screenshotInterval: {
      type: Number,
      default: 300 // 5 minutes in seconds
    },
    autoBreakReminder: {
      type: Boolean,
      default: true
    },
    breakReminderInterval: {
      type: Number,
      default: 3600 // 1 hour in seconds
    },
    trackWebsites: {
      type: Boolean,
      default: true
    },
    trackApplications: {
      type: Boolean,
      default: true
    }
  },
  
  // Status tracking
  isActive: {
    type: Boolean,
    default: false
  },
  lastPunchIn: {
    type: Date,
    default: null
  },
  lastPunchOut: {
    type: Date,
    default: null
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
employeeTrackerSchema.index({ employeeId: 1 }, { unique: true });
employeeTrackerSchema.index({ companyId: 1 });
employeeTrackerSchema.index({ 'dailySummaries.date': 1 });
employeeTrackerSchema.index({ isActive: 1 });
employeeTrackerSchema.index({ lastActivity: 1 });

// Helper method to get today's date string
employeeTrackerSchema.methods.getTodayDateString = function() {
  return new Date().toISOString().split('T')[0];
};

// Helper method to get current IST time
employeeTrackerSchema.methods.getISTTime = function() {
  const now = new Date();
  const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000)); // Add 5.5 hours
  return istTime;
};

// Helper method to convert milliseconds to minutes
employeeTrackerSchema.methods.msToMinutes = function(milliseconds) {
  return Math.round((milliseconds / (1000 * 60)) * 100) / 100; // Round to 2 decimal places
};



// Method to start a new work session
employeeTrackerSchema.methods.startWorkSession = function() {
  if (this.currentSession && this.currentSession.isActive) {
    throw new Error('Cannot start new session: Current session is still active');
  }
  
  const istTime = this.getISTTime();
  const newSession = {
    sessionId: new mongoose.Types.ObjectId().toString(),
    startTime: istTime,
    endTime: null,
    duration: 0, // Will be in minutes
    isActive: true,
    totalKeystrokes: 0,
    totalMouseClicks: 0,
    totalScreenshots: 0,
    breaks: [],
    totalBreakTime: 0, // Will be in minutes
    idleTime: 0, // Will be in minutes
    lastActivity: istTime,
    productiveTime: 0, // Will be in minutes
    activityPercentage: 0
  };
  
  this.currentSession = newSession;
  this.isActive = true;
  this.lastPunchIn = istTime;
  this.lastActivity = istTime;
  
  return newSession;
};

// Method to end current work session
employeeTrackerSchema.methods.endWorkSession = function() {
  if (!this.currentSession || !this.currentSession.isActive) {
    throw new Error('No active session to end');
  }
  
  const now = this.getISTTime();
  this.currentSession.endTime = now;
  this.currentSession.isActive = false;
  this.currentSession.duration = this.msToMinutes(now.getTime() - this.currentSession.startTime.getTime());
  
  // Calculate productive time (total duration - breaks - idle time)
  // Convert idle time from milliseconds to minutes to match duration and break time units
  const idleTimeInMinutes = this.msToMinutes(this.currentSession.idleTime || 0);
  this.currentSession.productiveTime = Math.max(0, 
    this.currentSession.duration - this.currentSession.totalBreakTime - idleTimeInMinutes
  );
  
  // Calculate activity percentage
  if (this.currentSession.duration > 0) {
    this.currentSession.activityPercentage = 
      (this.currentSession.productiveTime / this.currentSession.duration) * 100;
  }
  
  // Close any active breaks
  this.currentSession.breaks.forEach(breakSession => {
    if (breakSession.isActive) {
      breakSession.endTime = now;
      breakSession.isActive = false;
      breakSession.duration = this.msToMinutes(now.getTime() - breakSession.startTime.getTime());
    }
  });
  
  // Add to work sessions history
  this.workSessions.push(this.currentSession);
  
  // Update daily summary
  this.updateDailySummary();
  
  // Clear current session
  this.currentSession = null;
  this.isActive = false;
  this.lastPunchOut = now;
  
  return this.workSessions[this.workSessions.length - 1];
};

// Method to start a break
employeeTrackerSchema.methods.startBreak = function(breakType = 'manual', reason = '') {
  if (!this.currentSession || !this.currentSession.isActive) {
    throw new Error('No active session to start break');
  }
  
  // Check if there's already an active break
  const activeBreak = this.currentSession.breaks.find(b => b.isActive);
  if (activeBreak) {
    throw new Error('Break is already active');
  }
  
  const istTime = this.getISTTime();
  const newBreak = {
    breakId: new mongoose.Types.ObjectId().toString(),
    startTime: istTime,
    endTime: null,
    duration: 0, // Will be in minutes
    breakType: breakType,
    reason: reason,
    isActive: true
  };
  
  this.currentSession.breaks.push(newBreak);
  return newBreak;
};

// Method to end current break
employeeTrackerSchema.methods.endBreak = function() {
  if (!this.currentSession || !this.currentSession.isActive) {
    throw new Error('No active session to end break');
  }
  
  const activeBreak = this.currentSession.breaks.find(b => b.isActive);
  if (!activeBreak) {
    throw new Error('No active break to end');
  }
  
  const now = this.getISTTime();
  activeBreak.endTime = now;
  activeBreak.isActive = false;
  activeBreak.duration = this.msToMinutes(now.getTime() - activeBreak.startTime.getTime());
  
  // Update total break time
  this.recalculateBreakTime();
  
  return activeBreak;
};

// Method to add screenshot
employeeTrackerSchema.methods.addScreenshot = function(screenshotData) {
  if (!this.currentSession || !this.currentSession.isActive) {
    throw new Error('No active session to add screenshot');
  }
  
  const istTime = this.getISTTime();
  const screenshot = {
    timestamp: istTime,
    filename: screenshotData.filename,
    filePath: screenshotData.filePath,
    sessionId: this.currentSession.sessionId,
    activityLevel: screenshotData.activityLevel || 'medium',
    keystrokes: screenshotData.keystrokes || 0,
    mouseClicks: screenshotData.mouseClicks || 0,
    activeWindow: screenshotData.activeWindow || ''
  };
  
  this.screenshots.push(screenshot);
  this.currentSession.totalScreenshots++;
  this.currentSession.totalKeystrokes += screenshot.keystrokes;
  this.currentSession.totalMouseClicks += screenshot.mouseClicks;
  this.lastActivity = istTime;
  
  return screenshot;
};

// Method to update activity (keystrokes, mouse clicks)
employeeTrackerSchema.methods.updateActivity = function(keystrokes = 0, mouseClicks = 0) {
  if (this.currentSession && this.currentSession.isActive) {
    this.currentSession.totalKeystrokes += keystrokes;
    this.currentSession.totalMouseClicks += mouseClicks;
    const istTime = this.getISTTime();
    this.lastActivity = istTime;
    this.currentSession.lastActivity = istTime;
  }
};

// Method to add idle time
employeeTrackerSchema.methods.addIdleTime = function(idleMilliseconds) {
  if (this.currentSession && this.currentSession.isActive) {
    // Store idle time in milliseconds (as per schema definition)
    this.currentSession.idleTime += idleMilliseconds;
  }
};

// Method to recalculate break time for current session
employeeTrackerSchema.methods.recalculateBreakTime = function() {
  if (this.currentSession) {
    this.currentSession.totalBreakTime = this.currentSession.breaks.reduce((total, breakSession) => {
      return total + (breakSession.duration || 0);
    }, 0);
  }
};

// Method to recalculate current session times
employeeTrackerSchema.methods.recalculateCurrentSessionTimes = function() {
  if (this.currentSession && this.currentSession.isActive) {
    const now = this.getISTTime();
    this.currentSession.duration = this.msToMinutes(now.getTime() - this.currentSession.startTime.getTime());
    
    // Recalculate break time
    this.recalculateBreakTime();
    
    // Calculate productive time (total duration - breaks - idle time)
    // Convert idle time from milliseconds to minutes to match duration and break time units
    const idleTimeInMinutes = this.msToMinutes(this.currentSession.idleTime || 0);
    this.currentSession.productiveTime = Math.max(0, 
      this.currentSession.duration - this.currentSession.totalBreakTime - idleTimeInMinutes
    );
    
    // Calculate activity percentage
    if (this.currentSession.duration > 0) {
      this.currentSession.activityPercentage = 
        (this.currentSession.productiveTime / this.currentSession.duration) * 100;
    }
  }
};

// Method to update daily summary
employeeTrackerSchema.methods.updateDailySummary = function() {
  const today = this.getTodayDateString();
  let dailySummary = this.dailySummaries.find(summary => summary.date === today);
  
  if (!dailySummary) {
    dailySummary = {
      date: today,
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
      lastPunchOut: null
    };
    this.dailySummaries.push(dailySummary);
  }
  
  // Calculate totals for today (include current session if it's today)
  let todaySessions = this.workSessions.filter(session => {
    const sessionDate = session.startTime.toISOString().split('T')[0];
    return sessionDate === today;
  });
  
  // Include current session if it's active and from today
  if (this.currentSession && this.currentSession.isActive) {
    const currentSessionDate = this.currentSession.startTime.toISOString().split('T')[0];
    if (currentSessionDate === today) {
      todaySessions.push(this.currentSession);
    }
  }
  
  dailySummary.totalWorkTime = todaySessions.reduce((total, session) => {
    const duration = session.duration || 0; // Already in minutes
    return total + duration;
  }, 0);
  
  dailySummary.totalBreakTime = todaySessions.reduce((total, session) => total + (session.totalBreakTime || 0), 0); // Already in minutes
  dailySummary.totalIdleTime = todaySessions.reduce((total, session) => total + this.msToMinutes(session.idleTime || 0), 0); // Convert idle time from ms to minutes
  dailySummary.totalProductiveTime = todaySessions.reduce((total, session) => total + (session.productiveTime || 0), 0); // Already in minutes
  dailySummary.totalKeystrokes = todaySessions.reduce((total, session) => total + (session.totalKeystrokes || 0), 0);
  dailySummary.totalMouseClicks = todaySessions.reduce((total, session) => total + (session.totalMouseClicks || 0), 0);
  dailySummary.totalScreenshots = todaySessions.reduce((total, session) => total + (session.totalScreenshots || 0), 0);
  dailySummary.sessionsCount = todaySessions.length;
  
  // Calculate breaks count
  dailySummary.breaksCount = todaySessions.reduce((total, session) => total + session.breaks.length, 0);
  
  // Calculate average activity percentage
  if (todaySessions.length > 0) {
    dailySummary.averageActivityPercentage = todaySessions.reduce((total, session) => 
      total + (session.activityPercentage || 0), 0) / todaySessions.length;
  }
  
  // Set first punch in and last punch out
  if (todaySessions.length > 0) {
    dailySummary.firstPunchIn = todaySessions[0].startTime;
    dailySummary.lastPunchOut = todaySessions[todaySessions.length - 1].endTime || new Date();
  }
  

  
  // Update overall stats
  this.updateOverallStats();
};

// Method to update overall statistics
employeeTrackerSchema.methods.updateOverallStats = function() {
  const uniqueDates = [...new Set(this.dailySummaries.map(summary => summary.date))];
  this.overallStats.totalDaysWorked = uniqueDates.length;
  
  this.overallStats.totalWorkTime = this.dailySummaries.reduce((total, summary) => total + summary.totalWorkTime, 0);
  this.overallStats.totalBreakTime = this.dailySummaries.reduce((total, summary) => total + summary.totalBreakTime, 0);
  this.overallStats.totalIdleTime = this.dailySummaries.reduce((total, summary) => total + summary.totalIdleTime, 0);
  this.overallStats.totalProductiveTime = this.dailySummaries.reduce((total, summary) => total + summary.totalProductiveTime, 0);
  this.overallStats.totalKeystrokes = this.dailySummaries.reduce((total, summary) => total + summary.totalKeystrokes, 0);
  this.overallStats.totalMouseClicks = this.dailySummaries.reduce((total, summary) => total + summary.totalMouseClicks, 0);
  this.overallStats.totalScreenshots = this.dailySummaries.reduce((total, summary) => total + summary.totalScreenshots, 0);
  
  // Calculate averages
  if (this.overallStats.totalDaysWorked > 0) {
    this.overallStats.averageWorkHoursPerDay = (this.overallStats.totalWorkTime / 60) / this.overallStats.totalDaysWorked; // Convert minutes to hours
    this.overallStats.averageProductivityPercentage = this.dailySummaries.reduce((total, summary) => 
      total + summary.averageActivityPercentage, 0) / this.overallStats.totalDaysWorked;
  }
};

// Method to get current status
employeeTrackerSchema.methods.getCurrentStatus = function() {
  const todaySummary = this.dailySummaries.find(summary => summary.date === this.getTodayDateString());
  
  return {
    isActive: this.isActive,
    currentSession: this.currentSession, // Already in IST and minutes
    lastActivity: this.lastActivity, // Already in IST
    todaySummary: todaySummary, // Already in IST and minutes
    overallStats: this.overallStats // Already in minutes
  };
};

module.exports = mongoose.model("EmployeeTracker", employeeTrackerSchema);
