// growth-loop-routes.js
// Anti-Gravity Recursive Growth Loop — Express Router
// National Clinical & Digital Health Nursing Championship 2026
//
// Mount in backend.js:
//   import growthRouter from './growth-loop-routes.js';
//   app.use('/api/growth', growthRouter);
//
// Endpoints:
//   POST  /api/growth/lead                   → Save quiz teaser lead
//   GET   /api/growth/referral/:code         → Validate referral code
//   POST  /api/growth/referral/click         → Track referral link click
//   GET   /api/growth/cashback/status/:id    → Get cashback status for a candidate
//   POST  /api/growth/cashback/process       → Admin: mark cashback as PROCESSING → trigger payout
//   GET   /api/growth/social-proof           → Recent registrations (FOMO ticker feed)
//   GET   /api/growth/slots                  → Live slot counter
//   POST  /api/growth/payment/confirm        → Post-payment webhook handler (generates referralCode)
//   GET   /api/growth/leaderboard            → Top referrers (public)

import express from 'express';
import crypto from 'crypto';
import { Candidate } from './models/Candidate.js';
import { Lead } from './models/Lead.js';
import {
  ChampionshipRegistration,
  ChampionshipConfig,
} from './database.js';

const router = express.Router();

// ─── Constants ────────────────────────────────────────────────────────────────
const INITIAL_SLOTS = 1000;
const CASHBACK_THRESHOLD = 3;
const AMBASSADOR_COMMISSION = 20; // ₹20 per referral
const CASHBACK_AMOUNT = 99;       // ₹99 full refund

// ─── Helper: Generate Referral Code ──────────────────────────────────────────
// Format: NC26-XXXX  (e.g. NC26-AB12, NC26-ZK99)
// Uses 4 alphanumeric characters (uppercase, no ambiguous chars O/0/I/1)
function generateReferralCode() {
  const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 chars, no O/0/I/1
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += CHARS[crypto.randomInt(0, CHARS.length)];
  }
  return `NC26-${suffix}`;
}

// ─── Helper: Ensure Unique Referral Code ────────────────────────────────────
async function uniqueReferralCode(maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateReferralCode();
    const exists = await Candidate.findOne({ referralCode: code }).lean();
    if (!exists) return code;
  }
  throw new Error('Could not generate a unique referral code after multiple attempts');
}

// ─── Helper: Admin Auth ───────────────────────────────────────────────────────
function adminAuth(req, res, next) {
  const token = req.headers['x-admin-token'] || req.query.adminToken;
  if (!token || token !== process.env.CHAMPIONSHIP_ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized. Admin token required.' });
  }
  next();
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 1: QUIZ LEAD CAPTURE
// POST /api/growth/lead
// Body: { name, whatsapp, college, state, quizScore, answers[], referralCodeUsed?, utmSource?, utmMedium?, utmCampaign? }
// Returns: { success, lead: { _id, quizPercentile, percentileLabel } }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/lead', async (req, res) => {
  try {
    const {
      name, whatsapp, college, state,
      quizScore, answers,
      referralCodeUsed, utmSource, utmMedium, utmCampaign,
    } = req.body;

    // ── Validation ──────────────────────────────────────────────────────────
    if (!name || !whatsapp || !college || !state) {
      return res.status(400).json({ error: 'name, whatsapp, college, and state are required.' });
    }
    if (typeof quizScore !== 'number' || quizScore < 0 || quizScore > 5) {
      return res.status(400).json({ error: 'quizScore must be a number between 0 and 5.' });
    }
    if (!/^[6-9]\d{9}$/.test(whatsapp.replace(/\s/g, ''))) {
      return res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number.' });
    }

    // ── Dedup: prevent duplicate submissions from same number ──────────────
    const existing = await Lead.findOne({
      whatsapp: whatsapp.trim(),
      convertedToCandidate: false,
    }).lean();
    if (existing) {
      // Return existing lead data so UX continues smoothly
      return res.status(200).json({
        success: true,
        duplicate: true,
        lead: {
          _id: existing._id,
          quizPercentile: existing.quizPercentile,
          percentileLabel: existing.funnelStage,
        },
      });
    }

    // ── Compute Percentile ─────────────────────────────────────────────────
    const quizPercentile = Lead.simulatePercentile(quizScore);

    // ── Create Lead Document ───────────────────────────────────────────────
    const lead = await Lead.create({
      name: name.trim(),
      whatsapp: whatsapp.trim().replace(/\s/g, ''),
      college: college.trim(),
      state: state.trim(),
      quizScore,
      quizPercentile,
      answers: Array.isArray(answers) ? answers : [],
      referralCodeUsed: referralCodeUsed?.trim().toUpperCase() || undefined,
      utmSource, utmMedium, utmCampaign,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      funnelStage: 'form_submitted',
    });

    console.log(`🎯 New quiz lead: ${lead.name} (${lead.whatsapp}) — Score: ${quizScore}/5, Percentile: ${quizPercentile}`);

    // ── Return result ──────────────────────────────────────────────────────
    const label =
      quizPercentile >= 95 ? 'Top 5%' :
      quizPercentile >= 90 ? 'Top 10%' :
      quizPercentile >= 75 ? 'Top 25%' :
      quizPercentile >= 50 ? 'Top 50%' : 'Above Average';

    return res.status(201).json({
      success: true,
      lead: {
        _id: lead._id,
        quizPercentile,
        percentileLabel: label,
        name: lead.name,
      },
    });
  } catch (err) {
    console.error('❌ /growth/lead error:', err.message);
    if (err.name === 'ValidationError') {
      const msgs = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ error: msgs.join('. ') });
    }
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 2a: REFERRAL CODE VALIDATION
// GET /api/growth/referral/:code
// Returns referrer's name and college (safe public subset) or 404
// ─────────────────────────────────────────────────────────────────────────────
router.get('/referral/:code', async (req, res) => {
  try {
    const code = req.params.code?.toUpperCase().trim();
    if (!code || !/^NC26-[A-Z0-9]{4}$/.test(code)) {
      return res.status(400).json({ error: 'Invalid referral code format.' });
    }

    const candidate = await Candidate.findOne({ referralCode: code })
      .select('name college state successfulConversions cashbackStatus')
      .lean();

    if (!candidate) {
      return res.status(404).json({ error: 'Referral code not found.' });
    }

    return res.json({
      success: true,
      referrer: {
        name: candidate.name,
        college: candidate.college,
        state: candidate.state,
        referralsCount: candidate.successfulConversions,
        cashbackStatus: candidate.cashbackStatus,
      },
    });
  } catch (err) {
    console.error('❌ /growth/referral/:code error:', err.message);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 2b: REFERRAL CLICK TRACKING
// POST /api/growth/referral/click
// Body: { code }
// Increments `referralClicks` on the Candidate document
// ─────────────────────────────────────────────────────────────────────────────
router.post('/referral/click', async (req, res) => {
  try {
    const code = req.body.code?.toUpperCase().trim();
    if (!code) return res.status(400).json({ error: 'code is required.' });

    await Candidate.findOneAndUpdate(
      { referralCode: code },
      { $inc: { referralClicks: 1 } }
    );

    return res.json({ success: true });
  } catch (err) {
    console.error('❌ /growth/referral/click error:', err.message);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 2c: WHATSAPP SHARE TRACKING
// POST /api/growth/share
// Body: { candidateId }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/share', async (req, res) => {
  try {
    const { candidateId } = req.body;
    if (!candidateId) return res.status(400).json({ error: 'candidateId required.' });

    await Candidate.findByIdAndUpdate(candidateId, {
      $inc: { whatsappShareCount: 1 },
      $set: { lastSharedAt: new Date() },
    });

    return res.json({ success: true });
  } catch (err) {
    console.error('❌ /growth/share error:', err.message);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 2d: POST-PAYMENT HOOK — Generate Referral Code & Credit Referrer
// POST /api/growth/payment/confirm
// Body: { registrationId, referralCodeUsed? }
// Called by championship-routes.js after successful Razorpay payment verification.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/payment/confirm', async (req, res) => {
  try {
    const { registrationId, referralCodeUsed } = req.body;

    if (!registrationId) {
      return res.status(400).json({ error: 'registrationId is required.' });
    }

    // ── Find the registration ──────────────────────────────────────────────
    const reg = await ChampionshipRegistration.findById(registrationId);
    if (!reg) {
      return res.status(404).json({ error: 'Registration not found.' });
    }
    if (reg.status !== 'paid') {
      return res.status(400).json({ error: 'Registration is not in paid status.' });
    }

    // ── Find or create Candidate record ───────────────────────────────────
    let candidate = await Candidate.findOne({ registrationId: reg._id });
    if (!candidate) {
      const code = await uniqueReferralCode();
      candidate = await Candidate.create({
        registrationId: reg._id,
        name: reg.name,
        college: reg.college,
        state: reg.state,
        whatsapp: reg.whatsapp,
        referralCode: code,
      });
      console.log(`✅ Growth candidate created: ${reg.name} → Code: ${code}`);
    } else if (!candidate.referralCode) {
      // Edge case: candidate exists but has no code (shouldn't happen)
      candidate.referralCode = await uniqueReferralCode();
      await candidate.save();
    }

    // ── Credit the upstream referrer ───────────────────────────────────────
    let referrerUpdated = false;
    const refCode = (referralCodeUsed || reg.refCode)?.toUpperCase().trim();
    if (refCode) {
      const referrer = await Candidate.findOne({ referralCode: refCode });
      if (referrer && referrer._id.toString() !== candidate._id.toString()) {
        // Set bi-directional link
        if (!candidate.referredBy) {
          candidate.referredBy = referrer._id;
          await candidate.save();
        }
        // Credit referrer (this also checks cashback eligibility internally)
        await referrer.creditReferral(candidate);
        referrerUpdated = true;
        console.log(`💰 Credited referrer ${referrer.name} (${refCode}): ${referrer.successfulConversions} conversions`);
      }
    }

    // ── Mark lead as converted if exists ──────────────────────────────────
    await Lead.findOneAndUpdate(
      { whatsapp: reg.whatsapp, convertedToCandidate: false },
      {
        $set: {
          convertedToCandidate: true,
          convertedAt: new Date(),
          candidateId: candidate._id,
          funnelStage: 'paid',
        },
      }
    );

    return res.status(200).json({
      success: true,
      referralCode: candidate.referralCode,
      candidateId: candidate._id,
      referrerCredited: referrerUpdated,
    });
  } catch (err) {
    console.error('❌ /growth/payment/confirm error:', err.message);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 2e: CASHBACK STATUS CHECK
// GET /api/growth/cashback/status/:candidateId
// ─────────────────────────────────────────────────────────────────────────────
router.get('/cashback/status/:candidateId', async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.candidateId)
      .select('name referralCode successfulConversions cashbackStatus cashbackTriggerThreshold cashbackAmount totalEarnings commissionPaidOut cashbackProcessedAt')
      .lean();

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found.' });
    }

    const remaining = Math.max(0, candidate.cashbackTriggerThreshold - candidate.successfulConversions);

    return res.json({
      success: true,
      data: {
        referralCode: candidate.referralCode,
        successfulConversions: candidate.successfulConversions,
        cashbackStatus: candidate.cashbackStatus,
        cashbackAmount: candidate.cashbackAmount,
        remainingForCashback: remaining,
        totalEarnings: candidate.totalEarnings,
        pendingPayout: candidate.totalEarnings - (candidate.commissionPaidOut || 0),
        cashbackProcessedAt: candidate.cashbackProcessedAt || null,
        message:
          candidate.cashbackStatus === 'PAID'
            ? `Your ₹${candidate.cashbackAmount} cashback has been processed!`
            : candidate.cashbackStatus === 'ELIGIBLE'
            ? `You are eligible for ₹${candidate.cashbackAmount} cashback. Processing soon.`
            : candidate.cashbackStatus === 'PROCESSING'
            ? 'Your cashback is being processed. UPI transfer within 24–48 hours.'
            : `Refer ${remaining} more paid registrant${remaining !== 1 ? 's' : ''} to unlock ₹${candidate.cashbackAmount} cashback.`,
      },
    });
  } catch (err) {
    console.error('❌ /growth/cashback/status error:', err.message);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 2f: ADMIN — PROCESS CASHBACK
// POST /api/growth/cashback/process
// Body: { candidateId, transactionRef, notes? }
// Admin-only. Updates cashback status from ELIGIBLE → PROCESSING → PAID.
// In production, integrate your UPI payout webhook here (Razorpay Payouts API).
// ─────────────────────────────────────────────────────────────────────────────
router.post('/cashback/process', adminAuth, async (req, res) => {
  try {
    const { candidateId, transactionRef, notes, status } = req.body;

    if (!candidateId || !transactionRef) {
      return res.status(400).json({ error: 'candidateId and transactionRef are required.' });
    }

    const newStatus = ['PROCESSING', 'PAID'].includes(status) ? status : 'PROCESSING';

    const candidate = await Candidate.findOneAndUpdate(
      {
        _id: candidateId,
        cashbackStatus: { $in: ['ELIGIBLE', 'PROCESSING'] },
      },
      {
        $set: {
          cashbackStatus: newStatus,
          cashbackTransactionRef: transactionRef,
          cashbackNotes: notes || '',
          ...(newStatus === 'PAID' ? { cashbackProcessedAt: new Date() } : {}),
        },
      },
      { new: true }
    ).select('name whatsapp referralCode cashbackStatus cashbackTransactionRef');

    if (!candidate) {
      return res.status(404).json({
        error: 'Candidate not found or not in ELIGIBLE/PROCESSING state.',
      });
    }

    console.log(`💸 Cashback ${newStatus}: ${candidate.name} (${candidate.referralCode}) — UTR: ${transactionRef}`);

    return res.json({
      success: true,
      candidate: {
        name: candidate.name,
        referralCode: candidate.referralCode,
        cashbackStatus: candidate.cashbackStatus,
        transactionRef: candidate.cashbackTransactionRef,
      },
    });
  } catch (err) {
    console.error('❌ /growth/cashback/process error:', err.message);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 2g: ADMIN — PROCESS AMBASSADOR COMMISSION PAYOUT
// POST /api/growth/commission/payout
// Body: { candidateId, amount, transactionRef }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/commission/payout', adminAuth, async (req, res) => {
  try {
    const { candidateId, amount, transactionRef } = req.body;
    if (!candidateId || !amount || !transactionRef) {
      return res.status(400).json({ error: 'candidateId, amount, and transactionRef required.' });
    }

    const candidate = await Candidate.findByIdAndUpdate(
      candidateId,
      { $inc: { commissionPaidOut: amount } },
      { new: true }
    ).select('name referralCode totalEarnings commissionPaidOut');

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found.' });
    }

    console.log(`💰 Commission payout ₹${amount} to ${candidate.name} — UTR: ${transactionRef}`);

    return res.json({
      success: true,
      candidate: {
        name: candidate.name,
        referralCode: candidate.referralCode,
        totalEarnings: candidate.totalEarnings,
        commissionPaidOut: candidate.commissionPaidOut,
        pendingPayout: candidate.totalEarnings - candidate.commissionPaidOut,
      },
    });
  } catch (err) {
    console.error('❌ /growth/commission/payout error:', err.message);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 3: SOCIAL PROOF FEED (FOMO Ticker)
// GET /api/growth/social-proof
// Returns last 20 confirmed paid registrations (name, college, time ago)
// Non-blocking — uses a lean query with a short projection.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/social-proof', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);

    // Pull recent paid registrations from core model
    const registrations = await ChampionshipRegistration.find({ status: 'paid' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('name college state createdAt')
      .lean();

    // Map to ticker-friendly format
    const events = registrations.map((r) => {
      const msAgo = Date.now() - new Date(r.createdAt).getTime();
      const minsAgo = Math.floor(msAgo / 60000);
      const hoursAgo = Math.floor(msAgo / 3600000);
      const daysAgo = Math.floor(msAgo / 86400000);

      let timeLabel;
      if (minsAgo < 2) timeLabel = 'just now';
      else if (minsAgo < 60) timeLabel = `${minsAgo}m ago`;
      else if (hoursAgo < 24) timeLabel = `${hoursAgo}h ago`;
      else timeLabel = `${daysAgo}d ago`;

      // Truncate college name to 40 chars for ticker readability
      const collegeName = r.college?.length > 40
        ? r.college.substring(0, 37) + '…'
        : (r.college || 'a nursing college');

      return {
        text: `${r.name} from ${collegeName} just registered`,
        timeLabel,
        state: r.state || '',
      };
    });

    // If no real data yet (very early stage), return plausible seed events
    const SEED_EVENTS = [
      { text: 'Priyanka from Gauhati Medical College just registered', timeLabel: '2m ago', state: 'Assam' },
      { text: 'Anjali from AIIMS Bhubaneswar just registered', timeLabel: '5m ago', state: 'Odisha' },
      { text: 'Suresh from Manipal College of Nursing just registered', timeLabel: '9m ago', state: 'Karnataka' },
      { text: 'Deepa from St. John\'s Medical College just registered', timeLabel: '14m ago', state: 'Karnataka' },
      { text: 'Ramesh from JIPMER Puducherry just registered', timeLabel: '18m ago', state: 'Puducherry' },
    ];

    return res.json({
      success: true,
      events: events.length >= 3 ? events : SEED_EVENTS,
      total: registrations.length,
    });
  } catch (err) {
    console.error('❌ /growth/social-proof error:', err.message);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 3b: SLOT COUNTER
// GET /api/growth/slots
// Returns real remaining slot count based on ChampionshipConfig
// ─────────────────────────────────────────────────────────────────────────────
router.get('/slots', async (req, res) => {
  try {
    let cfg;
    try {
      cfg = await ChampionshipConfig.findOne().lean();
    } catch (_) {
      cfg = null;
    }

    const totalSlots = cfg?.seatsTotal ?? INITIAL_SLOTS;
    const filledSlots = cfg?.seatsFilled ?? 0;
    const remaining = Math.max(0, totalSlots - filledSlots);
    const pct = Math.round((filledSlots / totalSlots) * 100);

    return res.json({
      success: true,
      slots: {
        total: totalSlots,
        filled: filledSlots,
        remaining,
        percentFilled: pct,
        urgencyLevel: remaining < 100 ? 'CRITICAL' : remaining < 300 ? 'HIGH' : 'NORMAL',
      },
    });
  } catch (err) {
    console.error('❌ /growth/slots error:', err.message);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC LEADERBOARD — Top 10 referrers (name, college, referral count)
// GET /api/growth/leaderboard
// ─────────────────────────────────────────────────────────────────────────────
router.get('/leaderboard', async (req, res) => {
  try {
    const leaders = await Candidate.find({ successfulConversions: { $gt: 0 } })
      .sort({ successfulConversions: -1 })
      .limit(10)
      .select('name college state successfulConversions cashbackStatus referralCode')
      .lean();

    // Mask referral codes to first 7 chars for privacy (NC26-XX)
    const data = leaders.map((l, i) => ({
      rank: i + 1,
      name: l.name,
      college: l.college,
      state: l.state,
      referrals: l.successfulConversions,
      cashbackStatus: l.cashbackStatus,
      badge:
        l.cashbackStatus === 'PAID' ? '🏆 Cashback Earned' :
        l.cashbackStatus === 'ELIGIBLE' ? '✅ Eligible' :
        `${3 - l.successfulConversions > 0 ? 3 - l.successfulConversions : 0} more to cashback`,
    }));

    return res.json({ success: true, leaderboard: data });
  } catch (err) {
    console.error('❌ /growth/leaderboard error:', err.message);
    return res.status(500).json({ error: 'Server error.' });
  }
});

export default router;
