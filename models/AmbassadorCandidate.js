// models/AmbassadorCandidate.js
// MaaPark Brand Ambassador & App Promotion Hunt (2026–2027)
// Mongoose Model for Candidate Journey & Assessment Tracking

import mongoose from 'mongoose';

const ambassadorCandidateSchema = new mongoose.Schema(
  {
    // Unique ID: MP-AMB-2026-XXXX
    candidateId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    // Step 1: Basic Registration & Identity
    name: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
    },
    socialLinks: {
      instagram: { type: String, trim: true, default: '' },
      youtube: { type: String, trim: true, default: '' },
      linkedin: { type: String, trim: true, default: '' },
      other: { type: String, trim: true, default: '' },
    },

    // OTP Verification
    otp: {
      code: { type: String },
      expiresAt: { type: Date },
      verified: { type: Boolean, default: false },
    },

    // Workflow Status
    status: {
      type: String,
      enum: ['registered', 'paid', 'vision_submitted', 'assessment_completed', 'finalist', 'winner'],
      default: 'registered',
      index: true,
    },

    // Step 2: Payment Verification (₹499)
    feePaid: {
      type: Number,
      default: 499,
    },
    paymentGateway: {
      type: String,
      enum: ['razorpay', 'cashfree', 'phonepe', 'upi', 'direct_transfer', 'test_mode'],
      default: 'razorpay',
    },
    orderId: { type: String, trim: true },
    paymentId: { type: String, trim: true },
    paidAt: { type: Date },

    // 1-Year Free Premium App Access Activation Code
    premiumActivationCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
    },

    // Step 3: Candidate Background & Vision ("About & Thoughts")
    education: {
      highestDegree: { type: String, trim: true, default: '' },
      collegeOrWork: { type: String, trim: true, default: '' },
      currentRole: { type: String, trim: true, default: '' },
    },
    personalBio: {
      type: String,
      trim: true,
      default: '',
    },
    promotionStrategy: {
      type: String,
      trim: true,
      default: '',
    },
    maternalHealthPerspective: {
      type: String,
      trim: true,
      default: '',
    },
    visionSubmittedAt: {
      type: Date,
    },

    // Step 4: 25-Minute Online Assessment (40 MCQs)
    examStartedAt: {
      type: Date,
    },
    examSubmittedAt: {
      type: Date,
    },
    timeSpentSeconds: {
      type: Number,
      default: 0,
    },
    answers: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    score: {
      type: Number,
      default: null,
      index: true,
    },
    scoreDetails: {
      appFeaturesScore: { type: Number, default: 0 },
      maternalWellnessScore: { type: Number, default: 0 },
      userEmpathyScore: { type: Number, default: 0 },
      marketingStrategyScore: { type: Number, default: 0 },
      totalQuestions: { type: Number, default: 40 },
    },
    tabSwitchCount: {
      type: Number,
      default: 0,
    },
    autoSubmitted: {
      type: Boolean,
      default: false,
    },

    // Step 5 & Admin Workflow
    isTop10Finalist: {
      type: Boolean,
      default: false,
      index: true,
    },
    adminNotes: {
      type: String,
      trim: true,
      default: '',
    },
    interviewScheduledAt: {
      type: Date,
    },
    certificateId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
    },
    certificateReleased: {
      type: Boolean,
      default: false,
    },
    certificateHash: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: 'ambassador_candidates',
  }
);

export const AmbassadorCandidate =
  mongoose.models.AmbassadorCandidate ||
  mongoose.model('AmbassadorCandidate', ambassadorCandidateSchema);

export default AmbassadorCandidate;
