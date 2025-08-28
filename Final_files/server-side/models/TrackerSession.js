const mongoose = require("mongoose");

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
        "grace7", // post-session grace captured as separate
      ],
      required: true,
    },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date },
    durationMs: { type: Number, default: 0 },
    isOngoing: { type: Boolean, default: false },
    meta: { type: Object },
  },
  { _id: false }
);

const idlePeriodSchema = new mongoose.Schema(
  {
    startedAt: { type: Date, required: true },
    endedAt: { type: Date },
    durationMs: { type: Number, default: 0 },
  },
  { _id: false }
);

const trackerSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    email: { type: String, index: true },
    companyId: { type: String, index: true },
    companyName: { type: String },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date },

    totalTimeMs: { type: Number, default: 0 },
    activeTimeMs: { type: Number, default: 0 },
    idleTimeMs: { type: Number, default: 0 },
    breaksTimeMs: { type: Number, default: 0 },
    graceTimeMs: { type: Number, default: 0 },

    breaks: [breakSchema],
    idlePeriods: [idlePeriodSchema],

    status: {
      type: String,
      enum: ["running", "paused", "ended"],
      default: "running",
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TrackerSession", trackerSessionSchema);
