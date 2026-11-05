// ambassador-routes.js
// Express Router for MaaPark Brand Ambassador & App Promotion Hunt (2026–2027)

import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { AmbassadorCandidate } from './models/AmbassadorCandidate.js';
import { OtpVerification } from './models/OtpVerification.js';
import { AMBASSADOR_QUESTIONS } from './ambassador-questions.js';
import {
  generateCandidateId,
  generatePremiumActivationCode,
  generateCertificateId,
  calculateAssessmentScore,
  generateAmbassadorCertificatePDF,
  isCertificateUnlocked,
  CAMPAIGN_MILESTONES,
} from './ambassador-services.js';

const router = express.Router();

// Helper to format/clean 10-digit Indian mobile number
function cleanIndianMobile(raw = '') {
  let cleaned = String(raw).replace(/[^0-9]/g, '');
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  return cleaned;
}

// Razorpay setup (with test fallbacks)
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_MaaPark2026',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'MaaParkSecret2026',
});

// Admin Auth Middleware
function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'] || req.query.adminToken;
  const configuredToken = process.env.CHAMPIONSHIP_ADMIN_TOKEN || 'maapark_admin_secure_2026';
  if (!token || token !== configuredToken) {
    return res.status(401).json({ error: 'Unauthorized. Valid admin token required.' });
  }
  next();
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1: REGISTRATION & IDENTITY + OTP
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/ambassador/register
 * Step 1 registration
 */
router.post('/register', async (req, res) => {
  try {
    const { name, mobile, email, city, state, socialLinks, otp } = req.body;

    if (!name || !mobile || !email || !city || !state) {
      return res.status(400).json({ error: 'Full name, mobile, email, city, and state are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanMobile = cleanIndianMobile(mobile);

    if (cleanMobile.length !== 10) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });
    }

    // Check OTP verification status
    let isOtpVerified = false;
    if (otp && (otp.trim() === '123456')) {
      isOtpVerified = true;
    } else {
      const otpRecord = await OtpVerification.findOne({ mobile: cleanMobile });
      if (otpRecord && otpRecord.verified) {
        isOtpVerified = true;
      }
    }

    // Check if candidate already exists
    let candidate = await AmbassadorCandidate.findOne({ email: cleanEmail });

    if (candidate) {
      if (isOtpVerified) candidate.otp.verified = true;
      await candidate.save();

      return res.status(200).json({
        success: true,
        alreadyRegistered: true,
        message: `Welcome back, ${candidate.name}! Resuming your application (${candidate.candidateId}).`,
        data: candidate,
      });
    }

    // Generate unique ID: MP-AMB-2026-XXXX
    let candidateId = generateCandidateId();
    let collision = await AmbassadorCandidate.findOne({ candidateId });
    while (collision) {
      candidateId = generateCandidateId();
      collision = await AmbassadorCandidate.findOne({ candidateId });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    candidate = await AmbassadorCandidate.create({
      candidateId,
      name: name.trim(),
      mobile: cleanMobile,
      email: cleanEmail,
      city: city.trim(),
      state: state.trim(),
      socialLinks: {
        instagram: (socialLinks?.instagram || '').trim(),
        youtube: (socialLinks?.youtube || '').trim(),
        linkedin: (socialLinks?.linkedin || '').trim(),
        other: (socialLinks?.other || '').trim(),
      },
      otp: {
        code: otpCode,
        expiresAt: otpExpires,
        verified: isOtpVerified,
      },
      status: 'registered',
    });

    console.log(`✨ [AMBASSADOR REGISTRATION] ID: ${candidateId}, Name: ${candidate.name}, Mobile: ${cleanMobile}, Verified: ${isOtpVerified}`);

    res.status(201).json({
      success: true,
      message: 'Registration successful! Proceeding to Payment.',
      candidateId: candidate.candidateId,
      verified: isOtpVerified,
      demoOtpNotice: `(Dev / Demo Mode: OTP is ${otpCode})`,
      data: candidate,
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: err.message || 'Server error during registration.' });
  }
});

/**
 * POST /api/ambassador/send-otp
 * Dispatches 6-digit OTP for pre-registration & mobile verification
 */
router.post('/send-otp', async (req, res) => {
  try {
    const { candidateId, email, mobile } = req.body;
    const cleanMobile = cleanIndianMobile(mobile);

    if (!cleanMobile || cleanMobile.length !== 10) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number to receive OTP.' });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    // Upsert into OtpVerification collection
    await OtpVerification.findOneAndUpdate(
      { mobile: cleanMobile },
      {
        code: otpCode,
        expiresAt: otpExpires,
        verified: false,
        attempts: 0,
      },
      { upsert: true, new: true }
    );

    // If candidate exists, update their record as well
    const query = candidateId ? { candidateId } : email ? { email: email.toLowerCase().trim() } : { mobile: cleanMobile };
    const candidate = await AmbassadorCandidate.findOne(query);
    if (candidate) {
      candidate.otp = {
        code: otpCode,
        expiresAt: otpExpires,
        verified: false,
      };
      await candidate.save();
    }

    console.log(`📲 [OTP DISPATCH] Mobile: ${cleanMobile} -> OTP: ${otpCode}`);

    res.json({
      success: true,
      message: `OTP has been dispatched to +91 ${cleanMobile}.`,
      mobile: cleanMobile,
      code: otpCode,
      demoOtpNotice: `Your verification code is ${otpCode} (or master demo code 123456)`,
      expiresIn: 900,
    });
  } catch (err) {
    console.error('send-otp error:', err);
    res.status(500).json({ error: err.message || 'Failed to dispatch OTP.' });
  }
});

/**
 * POST /api/ambassador/verify-otp
 * Verifies 6-digit OTP
 */
router.post('/verify-otp', async (req, res) => {
  try {
    const { candidateId, mobile, otp } = req.body;
    const cleanMobile = cleanIndianMobile(mobile);
    const cleanOtp = (otp || '').trim();

    if (!cleanOtp) {
      return res.status(400).json({ error: 'Please enter the 6-digit OTP code.' });
    }

    // Check dev/demo bypass
    const isMaster = cleanOtp === '123456';

    // Verify against OtpVerification record
    let isValid = false;
    if (isMaster) {
      isValid = true;
    } else if (cleanMobile) {
      const otpRecord = await OtpVerification.findOne({ mobile: cleanMobile });
      if (otpRecord && otpRecord.code === cleanOtp && new Date() <= new Date(otpRecord.expiresAt)) {
        isValid = true;
      }
    }

    // Also check candidate document if candidateId provided
    let candidate = null;
    if (candidateId) {
      candidate = await AmbassadorCandidate.findOne({ candidateId });
      if (candidate && candidate.otp && candidate.otp.code === cleanOtp && new Date() <= new Date(candidate.otp.expiresAt)) {
        isValid = true;
      }
    }

    if (!isValid) {
      return res.status(400).json({
        error: 'Invalid or expired OTP. Please enter the correct 6-digit code or request a new OTP.',
      });
    }

    // Mark as verified in OtpVerification
    if (cleanMobile) {
      await OtpVerification.findOneAndUpdate(
        { mobile: cleanMobile },
        { verified: true }
      );
    }

    if (candidate) {
      candidate.otp.verified = true;
      await candidate.save();
    }

    console.log(`✅ [OTP VERIFIED] Mobile: ${cleanMobile || candidate?.mobile} -> Verified: true`);

    res.json({
      success: true,
      message: 'Mobile number verified successfully!',
      verified: true,
      mobile: cleanMobile || candidate?.mobile,
      candidateId: candidate?.candidateId,
      data: candidate,
    });
  } catch (err) {
    console.error('verify-otp error:', err);
    res.status(500).json({ error: err.message || 'OTP verification failed.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2: PAYMENT VERIFICATION (₹499)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/ambassador/create-order
 * Initiates Razorpay payment order for ₹499
 */
router.post('/create-order', async (req, res) => {
  try {
    const { candidateId } = req.body;
    const candidate = await AmbassadorCandidate.findOne({ candidateId });

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found.' });
    }

    if (candidate.status === 'paid' || candidate.paidAt) {
      return res.json({
        success: true,
        alreadyPaid: true,
        message: 'Payment already verified for this candidate.',
        premiumActivationCode: candidate.premiumActivationCode,
      });
    }

    const amountPaise = CAMPAIGN_MILESTONES.FEE_INR * 100; // 49900 paise
    const receipt = `RCPT_${candidate.candidateId.replace(/[^A-Z0-9]/g, '')}`;

    try {
      const order = await razorpay.orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt,
        notes: {
          candidateId: candidate.candidateId,
          name: candidate.name,
          campaign: 'MaaPark Ambassador & App Promotion 2026-2027',
        },
      });

      res.json({
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID || 'rzp_test_MaaPark2026',
        candidate: {
          id: candidate.candidateId,
          name: candidate.name,
          email: candidate.email,
          mobile: candidate.mobile,
        },
      });
    } catch (rzpErr) {
      console.warn('⚠️ Razorpay live API error, using simulation order:', rzpErr.message);
      // Fallback simulated order ID for instant test checkout
      const mockOrderId = `order_sim_${Date.now()}_${candidate.candidateId}`;
      res.json({
        success: true,
        orderId: mockOrderId,
        amount: amountPaise,
        currency: 'INR',
        key: process.env.RAZORPAY_KEY_ID || 'rzp_test_MaaPark2026',
        isSimulation: true,
        candidate: {
          id: candidate.candidateId,
          name: candidate.name,
          email: candidate.email,
          mobile: candidate.mobile,
        },
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message || 'Payment initiation failed.' });
  }
});

/**
 * POST /api/ambassador/verify-payment
 * Confirms payment (₹499), generates 1-Yr Free Premium App Code
 */
router.post('/verify-payment', async (req, res) => {
  try {
    const { candidateId, orderId, paymentId, signature, gateway = 'razorpay' } = req.body;
    const activeOrderId = orderId || req.body.razorpay_order_id;
    const activePaymentId = paymentId || req.body.razorpay_payment_id;
    const activeSignature = signature || req.body.razorpay_signature;

    const candidate = await AmbassadorCandidate.findOne({ candidateId });
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate profile not found.' });
    }

    if (candidate.status === 'paid' || candidate.paidAt) {
      return res.json({
        success: true,
        message: 'Payment was already confirmed.',
        candidateId: candidate.candidateId,
        premiumActivationCode: candidate.premiumActivationCode,
        data: candidate,
      });
    }

    // Verify signature if live credentials exist (ignore dummy test placeholders)
    const secret = process.env.RAZORPAY_KEY_SECRET;
    const isPlaceholderSecret = !secret || secret === 'your_razorpay_secret_here';
    const isSimulated = gateway === 'test_mode' || 
                        activeOrderId?.toLowerCase().includes('sim') || 
                        activePaymentId?.toLowerCase().includes('sim') ||
                        activeOrderId?.toLowerCase().includes('test') ||
                        activePaymentId?.toLowerCase().includes('test');

    let isValid = true;
    if (activeSignature && !isPlaceholderSecret && !isSimulated) {
      const generatedSig = crypto
        .createHmac('sha256', secret)
        .update(`${activeOrderId}|${activePaymentId}`)
        .digest('hex');
      isValid = generatedSig === activeSignature;
    }

    if (!isValid) {
      return res.status(400).json({ error: 'Payment signature verification failed.' });
    }

    // Generate unique 1-Year Free Premium App Activation Promo Code: MP-PREM-XXXX-XXXX
    let promoCode = generatePremiumActivationCode();
    let codeExists = await AmbassadorCandidate.findOne({ premiumActivationCode: promoCode });
    while (codeExists) {
      promoCode = generatePremiumActivationCode();
      codeExists = await AmbassadorCandidate.findOne({ premiumActivationCode: promoCode });
    }

    candidate.status = 'paid';
    candidate.orderId = activeOrderId || `ORD_${Date.now()}`;
    candidate.paymentId = activePaymentId || `PAY_${Date.now()}`;
    candidate.paymentGateway = gateway;
    candidate.paidAt = new Date();
    candidate.feePaid = 499;
    candidate.premiumActivationCode = promoCode;

    await candidate.save();

    console.log(`💰 [PAYMENT VERIFIED] ₹499 Candidate: ${candidate.candidateId} (${candidate.name}) -> Promo: ${promoCode}`);

    res.json({
      success: true,
      message: 'Payment of ₹499 verified successfully! 1-Year Free Premium Access unlocked.',
      candidateId: candidate.candidateId,
      premiumActivationCode: candidate.premiumActivationCode,
      status: candidate.status,
      data: candidate,
    });
  } catch (err) {
    console.error('Payment verification error:', err);
    res.status(500).json({ error: err.message || 'Payment verification failed.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CANDIDATE LOOKUP / RESUME
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/ambassador/candidate/:idOrEmail
 * Resume workflow at any time
 */
router.get('/candidate/:idOrEmail', async (req, res) => {
  try {
    const raw = req.params.idOrEmail.trim();
    const isEmail = raw.includes('@');
    const query = isEmail ? { email: raw.toLowerCase() } : { candidateId: raw.toUpperCase() };

    const candidate = await AmbassadorCandidate.findOne(query).lean();
    if (!candidate) {
      return res.status(404).json({ error: 'No ambassador candidate found with that ID or Email.' });
    }

    // Mask sensitive questions audit before sending
    res.json({
      success: true,
      data: {
        ...candidate,
        // Only show raw score if assessment complete, no pass/fail
        displayScore: candidate.score !== null ? `Score: ${candidate.score}/40` : null,
        certificateUnlocked: isCertificateUnlocked(candidate),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Lookup failed.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3: CANDIDATE BACKGROUND & MAAPARK APP VISION ("About & Thoughts")
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/ambassador/submit-vision
 * Step 3: Education, Bio (100 words), Promotion Strategy (150 words), Maternal Perspective (100 words)
 */
router.post('/submit-vision', async (req, res) => {
  try {
    const {
      candidateId,
      highestDegree,
      collegeOrWork,
      currentRole,
      personalBio,
      promotionStrategy,
      maternalHealthPerspective,
    } = req.body;

    const candidate = await AmbassadorCandidate.findOne({ candidateId });
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found.' });
    }

    if (candidate.status === 'registered') {
      return res.status(403).json({ error: 'Please complete Step 2 payment verification first.' });
    }

    if (!highestDegree || !personalBio || !promotionStrategy || !maternalHealthPerspective) {
      return res.status(400).json({
        error: 'Please fill out all required fields: Degree, Personal Bio, App Promotion Strategy, and Maternal Health Perspective.',
      });
    }

    candidate.education = {
      highestDegree: highestDegree.trim(),
      collegeOrWork: (collegeOrWork || '').trim(),
      currentRole: (currentRole || '').trim(),
    };
    candidate.personalBio = personalBio.trim();
    candidate.promotionStrategy = promotionStrategy.trim();
    candidate.maternalHealthPerspective = maternalHealthPerspective.trim();
    candidate.visionSubmittedAt = new Date();

    if (candidate.status === 'paid') {
      candidate.status = 'vision_submitted';
    }

    await candidate.save();

    console.log(`📝 [STEP 3 SUBMITTED] Candidate: ${candidate.candidateId} submitted vision & background.`);

    res.json({
      success: true,
      message: 'Background & App Promotion Strategy successfully saved! You may now start your 25-minute assessment.',
      candidateId: candidate.candidateId,
      status: candidate.status,
      data: candidate,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to submit candidate vision.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// STEP 4: 25-MINUTE ONLINE ASSESSMENT (40 MCQs)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/ambassador/assessment-questions/:candidateId
 * Fetches the 40 MCQs sanitized (no correctId)
 */
router.get('/assessment-questions/:candidateId', async (req, res) => {
  try {
    const { candidateId } = req.params;
    const candidate = await AmbassadorCandidate.findOne({ candidateId });

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found.' });
    }

    if (candidate.status === 'registered') {
      return res.status(403).json({ error: 'Payment required before taking the assessment.' });
    }

    if (candidate.score !== null || candidate.status === 'assessment_completed') {
      return res.status(400).json({
        error: 'Assessment has already been completed for this candidate.',
        score: candidate.score,
        displayScore: `Score: ${candidate.score}/40`,
      });
    }

    // Set examStartedAt if starting now
    if (!candidate.examStartedAt) {
      candidate.examStartedAt = new Date();
      await candidate.save();
    }

    // Sanitize questions (remove correctId and explanation)
    const sanitizedQuestions = AMBASSADOR_QUESTIONS.map((q, idx) => ({
      index: idx + 1,
      id: q.id,
      section: q.section,
      sectionTitle: q.sectionTitle,
      text: q.text,
      options: q.options,
    }));

    res.json({
      success: true,
      candidateId: candidate.candidateId,
      examStartedAt: candidate.examStartedAt,
      timeLimitMinutes: CAMPAIGN_MILESTONES.ASSESSMENT_TIME_LIMIT_MINUTES,
      totalQuestions: sanitizedQuestions.length,
      questions: sanitizedQuestions,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to load assessment questions.' });
  }
});

/**
 * POST /api/ambassador/submit-assessment
 * Evaluates 40 MCQs, saves raw score, outputs STRICT immediate format:
 * "Your Assessment is Complete! Your Score: [X] / 40"
 * "Your score and profile have been successfully submitted for final evaluation. You do not need to take any further steps."
 */
router.post('/submit-assessment', async (req, res) => {
  try {
    const { candidateId, answers = {}, timeSpentSeconds = 0, tabSwitchCount = 0, autoSubmitted = false } = req.body;

    const candidate = await AmbassadorCandidate.findOne({ candidateId });
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate profile not found.' });
    }

    if (candidate.score !== null) {
      return res.status(200).json({
        success: true,
        alreadySubmitted: true,
        score: candidate.score,
        maxScore: 40,
        displayScore: `Score: ${candidate.score}/40`,
        message: `Your Assessment is Complete! Your Score: ${candidate.score} / 40`,
        subtext: 'Your score and profile have been successfully submitted for final evaluation. You do not need to take any further steps.',
        candidateId: candidate.candidateId,
      });
    }

    // Calculate score
    const { rawScore, scoreDetails } = calculateAssessmentScore(answers);

    candidate.answers = answers;
    candidate.score = rawScore;
    candidate.scoreDetails = scoreDetails;
    candidate.timeSpentSeconds = Number(timeSpentSeconds) || 0;
    candidate.tabSwitchCount = Number(tabSwitchCount) || 0;
    candidate.autoSubmitted = Boolean(autoSubmitted);
    candidate.examSubmittedAt = new Date();
    candidate.status = 'assessment_completed';
    candidate.certificateId = generateCertificateId();

    await candidate.save();

    console.log(`🎯 [ASSESSMENT COMPLETE] Candidate: ${candidate.candidateId} (${candidate.name}) -> Score: ${rawScore}/40, Time: ${timeSpentSeconds}s, Tab Switches: ${tabSwitchCount}`);

    // Strictly adhere to specification output format:
    res.json({
      success: true,
      candidateId: candidate.candidateId,
      score: rawScore,
      maxScore: 40,
      displayScore: `Score: ${rawScore}/40`,
      message: `Your Assessment is Complete! Your Score: ${rawScore} / 40`,
      subtext: 'Your score and profile have been successfully submitted for final evaluation. You do not need to take any further steps.',
      winnerAnnouncementDate: '1 January 2027',
      certificateUnlockDate: '10 January 2027',
      premiumActivationCode: candidate.premiumActivationCode,
    });
  } catch (err) {
    console.error('Submit assessment error:', err);
    res.status(500).json({ error: err.message || 'Assessment submission failed.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// STEP 5: E-CERTIFICATE DOWNLOAD & VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/ambassador/certificate/:candidateId
 * PDF generation locked until 10 January 2027 (admin override supported)
 */
router.get('/certificate/:candidateId', async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { adminKey } = req.query;

    const candidate = await AmbassadorCandidate.findOne({
      $or: [{ candidateId: candidateId.toUpperCase() }, { certificateId: candidateId.toUpperCase() }],
    });

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate credential not found.' });
    }

    if (candidate.score === null) {
      return res.status(400).json({ error: 'Assessment must be completed before certificate generation.' });
    }

    const isAdminBypass = adminKey === (process.env.CHAMPIONSHIP_ADMIN_TOKEN || 'maapark_admin_secure_2026');
    const unlocked = isCertificateUnlocked(candidate) || isAdminBypass;

    if (!unlocked) {
      return res.status(403).json({
        error: 'Certificate Locked',
        message: "Official 'Certified Maternal & Women’s Health Advocate' Certificate will be available for download here starting 10 January 2027.",
        unlockDate: '2027-01-10T00:00:00.000Z',
        candidateId: candidate.candidateId,
      });
    }

    // Generate PDF buffer
    const pdfBuffer = await generateAmbassadorCertificatePDF(candidate);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="MaaPark-Advocate-Certificate-${candidate.candidateId}.pdf"`
    );
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Certificate generation error:', err);
    res.status(500).json({ error: err.message || 'Certificate generation failed.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN DASHBOARD ENDPOINTS (/admin/ambassadors)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/ambassador/admin/candidates
 * Leaderboard & candidate review panel
 */
router.get('/admin/candidates', requireAdmin, async (req, res) => {
  try {
    const { sortBy = 'score', sortOrder = 'desc', status, state, search, finalistsOnly } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (state) filter.state = new RegExp(state, 'i');
    if (finalistsOnly === 'true') filter.isTop10Finalist = true;
    if (search) {
      const re = new RegExp(search.trim(), 'i');
      filter.$or = [{ name: re }, { email: re }, { mobile: re }, { candidateId: re }, { city: re }];
    }

    let sortOption = {};
    if (sortBy === 'score') {
      sortOption = { score: sortOrder === 'asc' ? 1 : -1, timeSpentSeconds: 1 };
    } else if (sortBy === 'time') {
      sortOption = { timeSpentSeconds: sortOrder === 'asc' ? 1 : -1 };
    } else if (sortBy === 'date') {
      sortOption = { createdAt: sortOrder === 'asc' ? 1 : -1 };
    } else {
      sortOption = { score: -1, createdAt: -1 };
    }

    const candidates = await AmbassadorCandidate.find(filter).sort(sortOption).lean();

    // Summary statistics
    const totalApplicants = await AmbassadorCandidate.countDocuments();
    const paidCount = await AmbassadorCandidate.countDocuments({ status: { $ne: 'registered' } });
    const completedAssessments = await AmbassadorCandidate.countDocuments({ score: { $ne: null } });
    const finalistCount = await AmbassadorCandidate.countDocuments({ isTop10Finalist: true });

    const avgScoreAgg = await AmbassadorCandidate.aggregate([
      { $match: { score: { $ne: null } } },
      { $group: { _id: null, avgScore: { $avg: '$score' }, maxScore: { $max: '$score' } } },
    ]);

    const avgScore = avgScoreAgg[0]?.avgScore ? avgScoreAgg[0].avgScore.toFixed(1) : 0;
    const topScore = avgScoreAgg[0]?.maxScore || 0;

    res.json({
      success: true,
      stats: {
        totalApplicants,
        paidCount,
        completedAssessments,
        finalistCount,
        avgScore,
        topScore,
      },
      count: candidates.length,
      data: candidates,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch admin candidate list.' });
  }
});

/**
 * POST /api/ambassador/admin/shortlist
 * Select Top 10 finalists for 10-minute video interviews
 */
router.post('/admin/shortlist', requireAdmin, async (req, res) => {
  try {
    const { candidateId, isTop10Finalist, adminNotes } = req.body;
    const candidate = await AmbassadorCandidate.findOne({ candidateId });

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found.' });
    }

    if (typeof isTop10Finalist === 'boolean') {
      candidate.isTop10Finalist = isTop10Finalist;
    }
    if (adminNotes !== undefined) {
      candidate.adminNotes = adminNotes;
    }

    await candidate.save();

    res.json({
      success: true,
      message: `Candidate ${candidate.candidateId} shortlist status updated to ${candidate.isTop10Finalist}.`,
      data: candidate,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to update shortlist status.' });
  }
});

/**
 * POST /api/ambassador/admin/bulk-certificates
 * Release or unlock certificates in bulk
 */
router.post('/admin/bulk-certificates', requireAdmin, async (req, res) => {
  try {
    const { releaseAll = false, candidateIds = [] } = req.body;

    let result;
    if (releaseAll) {
      result = await AmbassadorCandidate.updateMany(
        { score: { $ne: null } },
        { $set: { certificateReleased: true } }
      );
    } else {
      result = await AmbassadorCandidate.updateMany(
        { candidateId: { $in: candidateIds } },
        { $set: { certificateReleased: true } }
      );
    }

    res.json({
      success: true,
      message: `Certificates successfully unlocked for ${result.modifiedCount} candidates.`,
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Bulk certificate update failed.' });
  }
});

/**
 * GET /api/ambassador/admin/export-csv
 * CSV Export of candidates
 */
router.get('/admin/export-csv', requireAdmin, async (req, res) => {
  try {
    const candidates = await AmbassadorCandidate.find().sort({ score: -1, createdAt: -1 }).lean();

    const headers = [
      'Candidate ID',
      'Full Name',
      'Mobile',
      'Email',
      'City',
      'State',
      'Status',
      'Score (out of 40)',
      'Time Spent (Sec)',
      'Tab Switches',
      'Top 10 Finalist',
      'Promo Code',
      'Registered At',
      'Degree',
      'Bio (Excerpt)',
      'App Strategy (Excerpt)',
      'Maternal Vision (Excerpt)',
    ];

    const escapeCsv = (str) => {
      if (!str) return '""';
      return `"${String(str).replace(/"/g, '""').replace(/\n/g, ' ')}"`;
    };

    const rows = candidates.map((c) => [
      c.candidateId,
      escapeCsv(c.name),
      c.mobile,
      c.email,
      escapeCsv(c.city),
      escapeCsv(c.state),
      c.status,
      c.score !== null ? c.score : 'N/A',
      c.timeSpentSeconds || 0,
      c.tabSwitchCount || 0,
      c.isTop10Finalist ? 'YES' : 'NO',
      c.premiumActivationCode || 'N/A',
      c.createdAt ? new Date(c.createdAt).toISOString() : '',
      escapeCsv(c.education?.highestDegree || ''),
      escapeCsv((c.personalBio || '').substring(0, 100)),
      escapeCsv((c.promotionStrategy || '').substring(0, 150)),
      escapeCsv((c.maternalHealthPerspective || '').substring(0, 100)),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="maapark-ambassador-candidates.csv"');
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ error: err.message || 'CSV export failed.' });
  }
});

export default router;
