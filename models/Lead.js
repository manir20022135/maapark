// models/Lead.js
// Anti-Gravity Growth Loop — Quiz Teaser Lead Capture Schema
// National Clinical & Digital Health Nursing Championship 2026
//
// Each document represents one person who completed the 5-question teaser quiz
// and submitted their contact info at the hard gate. These are pre-conversion
// leads — when they pay ₹99, a Candidate document is created and
// `convertedToCandidate` is flipped to true.

import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema(
  {
    // ── Contact Information (captured at hard gate) ───────────────────────────
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [120, 'Name too long'],
    },
    whatsapp: {
      type: String,
      required: [true, 'WhatsApp number is required'],
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'],
    },
    college: {
      type: String,
      required: [true, 'College name is required'],
      trim: true,
      maxlength: [200, 'College name too long'],
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
    },

    // ── Quiz Performance Data ─────────────────────────────────────────────────
    // Raw score out of 5
    quizScore: {
      type: Number,
      required: true,
      min: 0,
      max: 5,
    },
    // Simulated percentile (0–100), generated server-side for credibility
    quizPercentile: {
      type: Number,
      min: 0,
      max: 100,
    },
    // Which answers the candidate chose (array of option IDs, length 5)
    answers: {
      type: [String],
      default: [],
    },

    // ── Attribution & UTM ─────────────────────────────────────────────────────
    // Referral code used to land on quiz page (from ?ref= query param)
    referralCodeUsed: {
      type: String,
      trim: true,
      uppercase: true,
    },
    utmSource: { type: String, trim: true },
    utmMedium: { type: String, trim: true },
    utmCampaign: { type: String, trim: true },

    // ── Device / Dedup Signals ────────────────────────────────────────────────
    ipAddress: { type: String, trim: true },
    userAgent: { type: String, trim: true },

    // ── Conversion Tracking ───────────────────────────────────────────────────
    // Flipped to true when this lead pays and a Candidate record is created
    convertedToCandidate: { type: Boolean, default: false, index: true },
    convertedAt: { type: Date },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate',
      default: null,
    },

    // ── Funnel Stage ──────────────────────────────────────────────────────────
    // quiz_complete → gate_shown → form_submitted → cta_clicked → paid
    funnelStage: {
      type: String,
      enum: ['quiz_complete', 'gate_shown', 'form_submitted', 'cta_clicked', 'paid'],
      default: 'form_submitted',
      index: true,
    },

    // ── Follow-up ─────────────────────────────────────────────────────────────
    whatsappSent: { type: Boolean, default: false },
    whatsappSentAt: { type: Date },
    reminderCount: { type: Number, default: 0 },

    // ── TTL: Auto-delete cold leads after 90 days ─────────────────────────────
    // Converted leads should have convertedToCandidate=true so you can filter
    // them before this hits. Adjust TTL by changing the `expireAfterSeconds` value.
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      index: { expireAfterSeconds: 0 }, // MongoDB TTL index
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
    collection: 'growth_leads',
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
leadSchema.index({ whatsapp: 1 }); // dedup check
leadSchema.index({ createdAt: -1 }); // analytics queries
leadSchema.index({ referralCodeUsed: 1, convertedToCandidate: 1 }); // attribution reports

// ─── Virtual: Percentile Label ────────────────────────────────────────────────
leadSchema.virtual('percentileLabel').get(function () {
  const p = this.quizPercentile;
  if (p >= 95) return 'Top 5%';
  if (p >= 90) return 'Top 10%';
  if (p >= 75) return 'Top 25%';
  if (p >= 50) return 'Top 50%';
  return 'Below Average';
});

// ─── Static: Simulate Percentile ─────────────────────────────────────────────
// Generates a credible, slightly inflated percentile score to drive FOMO.
// Score 5/5 → 95–99th percentile, Score 4/5 → 82–94th, etc.
leadSchema.statics.simulatePercentile = function (score) {
  const bands = {
    5: [95, 99],
    4: [82, 94],
    3: [62, 78],
    2: [38, 58],
    1: [15, 35],
    0: [2, 12],
  };
  const [min, max] = bands[score] ?? [5, 15];
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// ─── Model Export ─────────────────────────────────────────────────────────────
export const Lead =
  mongoose.models.Lead ||
  mongoose.model('Lead', leadSchema);
