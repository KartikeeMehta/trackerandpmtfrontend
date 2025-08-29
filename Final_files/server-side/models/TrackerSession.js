const mongoose = require("mongoose");

// Schema for individual break periods
const breakSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "tea15",
        "full45",
        "meeting15",
        "meeting15_2",
        "custom",
        "manual",
        "grace7",
      ],
      required: true,
    },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date },
    durationMs: { type: Number, default: 0 },
    durationMinutes: { type: Number, default: 0 },
    graceMinutes: { type: Number, default: 0 },
    isOngoing: { type: Boolean, default: false },
    earlyTermination: { type: Boolean, default: false },
    meta: { type: Object },
  },
  { _id: false }
);

// Schema for individual idle periods
const idlePeriodSchema = new mongoose.Schema(
  {
    startedAt: { type: Date, required: true },
    endedAt: { type: Date },
    durationMs: { type: Number, default: 0 },
  },
  { _id: false }
);

// Schema for individual punch sessions within a day
const punchSessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true }, // Unique session ID for this punch
    punchInAt: { type: Date, required: true },
    punchOutAt: { type: Date },
    status: {
      type: String,
      enum: ["running", "ended"],
      default: "running",
    },
    
    // Time tracking for this session
    totalTimeMs: { type: Number, default: 0 },
    activeTimeMs: { type: Number, default: 0 },
    idleTimeMs: { type: Number, default: 0 },
    breaksTimeMs: { type: Number, default: 0 },
    graceTimeMs: { type: Number, default: 0 },
    
    // Activity tracking
    lastActivityAt: { type: Date, default: Date.now },
    
    // Arrays for detailed tracking
    breaks: [breakSchema],
    idlePeriods: [idlePeriodSchema],
  },
  { _id: false }
);

// Schema for daily tracking data
const dailyTrackingSchema = new mongoose.Schema(
  {
    date: { 
      type: Date, 
      required: true,
      // Store only the date part (YYYY-MM-DD)
      get: function(date) {
        if (!date) return null;
        return date.toISOString().split('T')[0];
      },
      set: function(input) {
        if (!input) return input;
        let d;
        if (input instanceof Date) {
          d = new Date(input.getTime());
        } else if (typeof input === 'string') {
          // Accept either 'YYYY-MM-DD' or full ISO
          const str = input.includes('T') ? input : (input + 'T00:00:00.000Z');
          d = new Date(str);
        } else {
          // Fallback: try constructing a date
          d = new Date(input);
        }
        if (isNaN(d.valueOf())) return undefined;
        d.setHours(0, 0, 0, 0);
        return d;
      }
    },
    
    // Daily totals
    totalTimeMs: { type: Number, default: 0 },
    activeTimeMs: { type: Number, default: 0 },
    idleTimeMs: { type: Number, default: 0 },
    breaksTimeMs: { type: Number, default: 0 },
    graceTimeMs: { type: Number, default: 0 },
    
    // Array of punch sessions for this day
    punchSessions: [punchSessionSchema],
    
    // Current running session (if any)
    currentSessionId: { type: String },
    
    // Daily metadata
    isActive: { type: Boolean, default: false }, // If user has an active session today
  },
  { _id: false }
);

// Main tracker document - one per user
const userTrackerSchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true,
      unique: true,
      index: true 
    },
    email: { 
      type: String, 
      required: true,
      unique: true,
      index: true 
    },
    companyId: { type: String, index: true },
    companyName: { type: String },
    
    // Array of daily tracking data
    dailyData: [dailyTrackingSchema],
    
    // Current active session info (for quick access)
    currentSession: {
      sessionId: { type: String },
      date: { type: Date },
      punchInAt: { type: Date },
      lastActivityAt: { type: Date },
    },
    
    // User preferences and settings
    settings: {
      autoIdleDetection: { type: Boolean, default: true },
      idleThresholdSeconds: { type: Number, default: 31 },
      defaultGracePeriod: { type: Number, default: 7 }, // minutes
    },
    
    // Statistics
    totalSessions: { type: Number, default: 0 },
    totalActiveDays: { type: Number, default: 0 },
    lastActivityDate: { type: Date },
    
    // Status
    isActive: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { 
    timestamps: true,
    // Add methods to the schema
    methods: {
      // Get today's data or create if doesn't exist
      getTodayData() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let todayData = this.dailyData.find(day => {
          if (!day.date) return false;
          const dayDate = new Date(day.date);
          dayDate.setHours(0, 0, 0, 0);
          return dayDate.getTime() === today.getTime();
        });
        
        if (!todayData) {
          todayData = {
            date: today,
            totalTimeMs: 0,
            activeTimeMs: 0,
            idleTimeMs: 0,
            breaksTimeMs: 0,
            graceTimeMs: 0,
            punchSessions: [],
            currentSessionId: null,
            isActive: false
          };
          this.dailyData.push(todayData);
        }
        
        return todayData;
      },
      
      // Get current active session
      getCurrentSession() {
        if (!this.currentSession || !this.currentSession.sessionId) return null;
        
        const todayData = this.getTodayData();
        if (!todayData.punchSessions) return null;
        
        return todayData.punchSessions.find(session => 
          session.sessionId === this.currentSession.sessionId
        );
      },
      
      // Update daily totals
      updateDailyTotals() {
        const todayData = this.getTodayData();
        
        if (!todayData.punchSessions) {
          todayData.punchSessions = [];
        }
        
        todayData.totalTimeMs = todayData.punchSessions.reduce((sum, session) => 
          sum + (session.totalTimeMs || 0), 0
        );
        
        todayData.activeTimeMs = todayData.punchSessions.reduce((sum, session) => 
          sum + (session.activeTimeMs || 0), 0
        );
        
        todayData.idleTimeMs = todayData.punchSessions.reduce((sum, session) => 
          sum + (session.idleTimeMs || 0), 0
        );
        
        todayData.breaksTimeMs = todayData.punchSessions.reduce((sum, session) => 
          sum + (session.breaksTimeMs || 0), 0
        );
        
        todayData.graceTimeMs = todayData.punchSessions.reduce((sum, session) => 
          sum + (session.graceTimeMs || 0), 0
        );
      },
      
      // Generate unique session ID
      generateSessionId() {
        return `${this.userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
    }
  }
);

// Index for efficient queries
userTrackerSchema.index({ "dailyData.date": 1 });
userTrackerSchema.index({ "dailyData.punchSessions.sessionId": 1 });

module.exports = mongoose.model("UserTracker", userTrackerSchema);
