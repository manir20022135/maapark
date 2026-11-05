// models/Candidate.js
// Anti-Gravity Growth Loop — Candidate (Referral Node) Schema
// National Clinical & Digital Health Nursing Championship 2026
//
// This model extends the core registration data with the full
// K-Factor viral referral & cashback engine state for each paid candidate.
//
// Relationship to existing data:
//   - `registrationId` → links to ChampionshipRegistration._id
//   - `referredBy`      → links to another Candidate._id (upstream node)
//   - `referredUsers`   → array of downstream Candidate._ids

import mongoose from 'mongoose';

// ─── Sub-schema: Individual Commission Entry ──────────────────────────────────
const commissionEntrySchema = new mongoose.Schema(
  {
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate',
      required: true,
    },
    name: { type: String, trim: true },
    college: { type: String, trim: true },
    registeredAt: { type: Date, default: Date.now },
    amount: { type: Number, default: 20 }, // ₹20 flat commission per referral
    paid: { type: Boolean, default: false },
    paidAt: { type: Date },
  },
  { _id: false }
);

// ─── Main Schema ──────────────────────────────────────────────────────────────
const candidateSchema = new mongoose.Schema(
  {
    // ── Link to core registration record ──────────────────────────────────────
    registrationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChampionshipRegistration',
      required: true,
      unique: true,
      index: true,
    },

    // ── Candidate snapshot (denormalised for fast ticker/social-proof queries) ─
    name: { type: String, required: true, trim: true },
    college: { type: String, trim: true },
    state: { type: String, trim: true },
    whatsapp: { type: String, trim: true },
    upiId: { type: String, trim: true },

    // ── Referral Code ─────────────────────────────────────────────────────────
    // Format: NC26-XXXX  (e.g. NC26-AB12)
    // Generated automatically post-payment in growth-loop-routes.js
    referralCode: {
      type: String,
      unique: true,
      sparse: true,         // null until payment confirmed
      uppercase: true,
      trim: true,
      match: [/^NC26-[A-Z0-9]{4}$/, 'Referral code must be in NC26-XXXX format'],
      index: true,
    },

    // ── Referral Tree ─────────────────────────────────────────────────────────
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate',
      default: null,
      index: true,
    },
    referredUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Candidate',
      },
    ],

    // ── Conversion Metrics ────────────────────────────────────────────────────
    // A "successful conversion" = referred user completed payment
    successfulConversions: { type: Number, default: 0, min: 0 },

    // Raw click counter for referral link (includes non-converting visits)
    referralClicks: { type: Number, default: 0 },

    // ── Cashback Engine ───────────────────────────────────────────────────────
    // Trigger: successfulConversions >= cashbackTriggerThreshold → ELIGIBLE
    cashbackStatus: {
      type: String,
      enum: ['LOCKED', 'ELIGIBLE', 'PROCESSING', 'PAID'],
      default: 'LOCKED',
      index: true,
    },
    cashbackTriggerThreshold: { type: Number, default: 3 },
    cashbackAmount: { type: Number, default: 99 }, // ₹99 full refund
    cashbackRequestedAt: { type: Date },
    cashbackProcessedAt: { type: Date },
    cashbackTransactionRef: { type: String, trim: true }, // UPI UTR number
    cashbackNotes: { type: String, trim: true },

    // ── Campus Ambassador Commission ──────────────────────────────────────────
    // ₹20 flat per every paid referral (regardless of cashback threshold)
    commissionEntries: [commissionEntrySchema],
    totalEarnings: { type: Number, default: 0 }, // sum of all commissionEntries.amount
    commissionPaidOut: { type: Number, default: 0 },

    // ── Share tracking ────────────────────────────────────────────────────────
    whatsappShareCount: { type: Number, default: 0 },
    lastSharedAt: { type: Date },
  },
  {
    timestamps: true, // createdAt, updatedAt
    collection: 'growth_candidates',
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
candidateSchema.index({ cashbackStatus: 1, successfulConversions: -1 });
candidateSchema.index({ createdAt: -1 }); // social-proof ticker queries

// ─── Virtual: Pending Commission Payout ──────────────────────────────────────
candidateSchema.virtual('pendingCommission').get(function () {
  return this.totalEarnings - this.commissionPaidOut;
});

// ─── Instance Method: Check & Update Cashback Eligibility ────────────────────
candidateSchema.methods.checkCashbackEligibility = async function () {
  if (
    this.cashbackStatus === 'LOCKED' &&
    this.successfulConversions >= this.cashbackTriggerThreshold
  ) {
    this.cashbackStatus = 'ELIGIBLE';
    this.cashbackRequestedAt = new Date();
    await this.save();
    return true; // newly eligible
  }
  return false; // no change
};

// ─── Instance Method: Credit a New Referral ──────────────────────────────────
// Call this when a referred user completes payment.
candidateSchema.methods.creditReferral = async function (newCandidateDoc) {
  // 1. Add to referred users list (avoid duplicates)
  const alreadyTracked = this.referredUsers.some(
    (id) => id.toString() === newCandidateDoc._id.toString()
  );
  if (!alreadyTracked) {
    this.referredUsers.push(newCandidateDoc._id);
    this.successfulConversions += 1;

    // 2. Add ₹20 commission entry
    this.commissionEntries.push({
      candidateId: newCandidateDoc._id,
      name: newCandidateDoc.name,
      college: newCandidateDoc.college,
      amount: 20,
    });
    this.totalEarnings += 20;

    // 3. Check cashback eligibility
    await this.checkCashbackEligibility();

    await this.save();
  }
  return this;
};

// ─── Static Method: Find or Create by RegistrationId ─────────────────────────
candidateSchema.statics.findOrCreateByRegistration = async function (regDoc) {
  let candidate = await this.findOne({ registrationId: regDoc._id });
  if (!candidate) {
    candidate = await this.create({
      registrationId: regDoc._id,
      name: regDoc.name,
      college: regDoc.college,
      state: regDoc.state,
      whatsapp: regDoc.whatsapp,
    });
  }
  return candidate;
};

// ─── Model Export ─────────────────────────────────────────────────────────────
export const Candidate =
  mongoose.models.Candidate ||
  mongoose.model('Candidate', candidateSchema);
