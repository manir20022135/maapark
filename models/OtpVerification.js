// models/OtpVerification.js
// Temporary OTP verification store for pre-registration & mobile authentication

import mongoose from 'mongoose';

const otpVerificationSchema = new mongoose.Schema(
  {
    mobile: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: '15m' }, // MongoDB TTL auto-cleanup after 15 minutes
    },
    verified: {
      type: Boolean,
      default: false,
    },
    attempts: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: 'ambassador_otps',
  }
);

export const OtpVerification =
  mongoose.models.OtpVerification ||
  mongoose.model('OtpVerification', otpVerificationSchema);

export default OtpVerification;
