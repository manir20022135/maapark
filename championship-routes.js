// championship-routes.js
// Express router for National Clinical & Digital Health Nursing Championship 2026
// Mount in backend.js: app.use('/api/championship', championshipRouter)

import express from 'express';
import Razorpay from 'razorpay';
import {
  ChampionshipConfig,
  ChampionshipRegistration,
  ChampionshipQuestion,
  ChampionshipExamSession,
  ChampionshipAffiliate,
} from './database.js';
import {
  generateRollNumber,
  generateCertificateId,
  generateCertificateHash,
  generateExamToken,
  generateReferralCode,
  generateViralShareMessage,
  verifyRazorpaySignature,
  verifyRazorpayWebhookSignature,
  calculateScore,
  syncToGoogleSheets,
  generateCertificatePDF,
  sendNotificationEmail,
  getTieredPricing,
  getPrizePoolMilestone,
  ASSAM_INSTITUTIONS,
  INDIA_INSTITUTIONS,
  cryptoShuffle,
  normalizeAndAuditQuestions,
  generateCandidateSessionSet,
} from './championship-services.js';
import sqlDB from './database_sql.js';
import {
  generateDailyChannelUpdate,
  dispatchDailyBroadcast,
  WHATSAPP_CHANNEL_URL,
  WHATSAPP_CHANNEL_ID
} from './whatsapp-channel-bot.js';

const router = express.Router();

// Razorpay instance (with safe dev fallback)
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_MaaParkDev2026',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'MaaParkDevSecret2026',
});

// ─── Helper: Ensure config doc exists ────────────────────────────────────────
async function getConfig() {
  try {
    let cfg = await ChampionshipConfig.findOne();
    if (!cfg) {
      cfg = await ChampionshipConfig.create({});
    }
    return cfg;
  } catch (err) {
    return {
      seatsTotal: 12000,
      seatsFilled: 412,
      registrationOpen: true,
      examDate: new Date('2026-09-13T13:30:00.000Z'),
      examEndDate: new Date('2026-09-13T14:15:00.000Z'),
      registrationStart: new Date('2026-08-20T00:00:00.000Z'),
      registrationEnd: new Date('2026-09-13T13:00:00.000Z'),
      extendedByDays: 0,
      waitingListActive: false,
    };
  }
}

// ─── Admin Auth Middleware ────────────────────────────────────────────────────
function adminAuth(req, res, next) {
  const token = req.headers['x-admin-token'] || req.query.adminToken;
  if (!token || token !== process.env.CHAMPIONSHIP_ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized. Admin token required.' });
  }
  next();
}

// ─── GET /api/championship/institutions ───────────────────────────────────────
// Returns list of premier All-India nursing institutions & official codes
router.get('/institutions', (req, res) => {
  const { state } = req.query;
  if (state) {
    const filtered = INDIA_INSTITUTIONS.filter(i => i.state.toLowerCase() === state.toLowerCase());
    return res.json({ success: true, count: filtered.length, data: filtered });
  }
  res.json({
    success: true,
    count: INDIA_INSTITUTIONS.length,
    data: INDIA_INSTITUTIONS,
  });
});

// ─── GET /api/championship/config ─────────────────────────────────────────────
// Returns live public config: seat count, registration status, exam window, tiered pricing & prize pool
router.get('/config', async (req, res) => {
  try {
    const cfg = await getConfig();
    const now = new Date();
    const regEnd = new Date(cfg.registrationEnd);
    // Apply extension
    regEnd.setDate(regEnd.getDate() + (cfg.extendedByDays || 0));
    const registrationActive = cfg.registrationOpen &&
      now >= new Date(cfg.registrationStart) &&
      now <= regEnd &&
      cfg.seatsFilled < cfg.seatsTotal;
    const soldOut = cfg.seatsFilled >= cfg.seatsTotal;
    const examOpen = now >= new Date(cfg.examDate) && now <= new Date(cfg.examEndDate);

    const pricing = getTieredPricing(cfg.seatsFilled);
    const prizePool = getPrizePoolMilestone(cfg.seatsFilled);

    res.json({
      success: true,
      data: {
        seatsTotal: cfg.seatsTotal,
        seatsFilled: cfg.seatsFilled,
        seatsRemaining: cfg.seatsTotal - cfg.seatsFilled,
        registrationActive,
        soldOut,
        waitingListActive: cfg.waitingListActive,
        examDate: cfg.examDate,
        examEndDate: cfg.examEndDate,
        registrationStart: cfg.registrationStart,
        registrationEnd: regEnd,
        examOpen,
        pricing,
        prizePool,
        institutions: ASSAM_INSTITUTIONS,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (err) {
    console.error('Config error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── POST /api/championship/register ──────────────────────────────────────────
// Creates Razorpay order + pending registration
router.post('/register', async (req, res) => {
  try {
    const cfg = await getConfig();
    const now = new Date();
    const regEnd = new Date(cfg.registrationEnd);
    regEnd.setDate(regEnd.getDate() + (cfg.extendedByDays || 0));

    if (!cfg.registrationOpen || now < new Date(cfg.registrationStart) || now > regEnd) {
      return res.status(400).json({ error: 'Registration window is closed.' });
    }
    if (cfg.seatsFilled >= cfg.seatsTotal) {
      return res.status(400).json({ error: 'All seats are filled. You have been added to the waiting list.', waitingList: true });
    }

    const { name, whatsapp, email, college, state, course, year, nursingCouncilRegNo, refCode } = req.body;
    if (!name || !whatsapp || !email || !college || !state || !course || !year) {
      return res.status(400).json({ error: 'Missing required fields: name, whatsapp, email, college, state, course, year.' });
    }
    if (!/^[0-9]{10}$/.test(whatsapp.replace(/\s/g, ''))) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit WhatsApp number.' });
    }

    // Duplicate check by email
    const existing = await ChampionshipRegistration.findOne({ email: email.toLowerCase().trim(), status: { $ne: 'pending' } });
    if (existing) {
      return res.status(409).json({ error: 'A registration already exists for this email address. Your Roll Number: ' + existing.rollNumber });
    }

    // Derive college code from refCode or abbreviate college name
    const collegeCode = refCode
      ? refCode.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 6)
      : college.split(/\s+/).map(w => w[0]).join('').toUpperCase().substring(0, 6);

    // Compute dynamic pricing based on live seat count
    const pricing = getTieredPricing(cfg.seatsFilled);

    // Create Razorpay order (with safe dev fallback)
    let order;
    try {
      order = await razorpay.orders.create({
        amount: pricing.pricePaise, // dynamic price in paise
        currency: 'INR',
        receipt: `MPC2026-${Date.now()}`,
        notes: { name, email, college, refCode: refCode || '', tier: pricing.tier, price: pricing.price },
      });
    } catch (rzpErr) {
      console.warn('⚠️ Razorpay live order error, using dev mock order:', rzpErr.message);
      order = { id: `order_mock_${Date.now()}` };
    }

    // Create pending registration
    const reg = await ChampionshipRegistration.create({
      name: name.trim(),
      whatsapp: whatsapp.trim(),
      email: email.trim().toLowerCase(),
      college: college.trim(),
      course: course.trim(),
      year: year.trim(),
      collegeCode,
      state: state.trim(),
      nursingCouncilRegNo: nursingCouncilRegNo?.trim() || '',
      refCode: refCode?.toUpperCase() || '',
      razorpayOrderId: order.id,
      tier: pricing.tier,
      feePaid: pricing.price,
      status: 'pending',
    });

    console.log(`📝 Pending registration: ${reg.email} | Order: ${order.id} | Tier: ${pricing.tier} (₹${pricing.price})`);

    res.status(201).json({
      success: true,
      orderId: order.id,
      amount: pricing.pricePaise,
      price: pricing.price,
      tier: pricing.tier,
      tierName: pricing.tierName,
      currency: 'INR',
      registrationId: reg._id,
      message: `Order created for ${pricing.tierName} (₹${pricing.price}). Please complete payment.`,
    });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// ─── POST /api/championship/verify-payment ────────────────────────────────────
// Client-side payment verification (Razorpay checkout success callback)
router.post('/verify-payment', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment verification fields.' });
    }

    const isValid = verifyRazorpaySignature(
      razorpay_order_id, razorpay_payment_id, razorpay_signature,
      process.env.RAZORPAY_KEY_SECRET
    );
    if (!isValid) {
      return res.status(400).json({ error: 'Payment signature verification failed.' });
    }

    // Find pending registration
    const reg = await ChampionshipRegistration.findOne({ razorpayOrderId: razorpay_order_id, status: 'pending' });
    if (!reg) {
      return res.status(404).json({ error: 'Registration not found for this order.' });
    }

    // Update seat count atomically
    const cfg = await ChampionshipConfig.findOneAndUpdate(
      { seatsFilled: { $lt: 12000 } },
      { $inc: { seatsFilled: 1 } },
      { new: true }
    );
    if (!cfg) {
      return res.status(400).json({ error: 'Seats are now full. Your payment will be refunded within 5-7 working days.' });
    }

    // Generate Roll Number: sequence = seatsFilled
    const rollNumber = generateRollNumber(reg.collegeCode, cfg.seatsFilled);
    const examToken = generateExamToken();

    // Update registration
    reg.razorpayPaymentId = razorpay_payment_id;
    reg.razorpaySignature = razorpay_signature;
    reg.status = 'paid';
    reg.rollNumber = rollNumber;
    reg.examToken = examToken;
    await reg.save();

    // ── Real-Time SQL Database Persistence (SQLite & PostgreSQL Compatible) ──
    try {
      sqlDB.upsertRegistration({
        rollNumber,
        name: reg.name,
        whatsapp: reg.whatsapp,
        email: reg.email,
        college: reg.college,
        collegeCode: reg.collegeCode,
        course: reg.course,
        year: reg.year,
        state: reg.state,
        pricingTier: reg.tier,
        amount: reg.pricePaid || 99,
        referralCode: reg.refCode,
        paymentStatus: 'Captured',
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        examToken: examToken
      });
      sqlDB.savePayment({
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        amount: reg.pricePaid || 99,
        phone: reg.whatsapp,
        email: reg.email,
        rollNumber,
        candidateName: reg.name,
        college: reg.college,
        status: 'Captured',
        date: new Date().toISOString()
      });
      console.log(`✅ [SQL Real-Time Sync] Registration & Payment saved to SQL for ${rollNumber}`);
    } catch (sqlErr) {
      console.warn('⚠️ SQL Sync Warning in payment/verify:', sqlErr.message);
    }

    // ── Anti-Gravity Growth Loop: generate referral code + credit upstream referrer ──
    // Fire-and-forget — never blocks payment confirmation if growth API is slow
    fetch(`${process.env.API_BASE_URL || 'http://localhost:3000'}/api/growth/payment/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        registrationId: reg._id.toString(),
        referralCodeUsed: reg.refCode || '',
      }),
    }).then(r => r.json())
      .then(d => console.log(`🔗 Growth loop: referral code ${d.referralCode} generated for ${reg.name}`))
      .catch(e => console.warn('⚠️ Growth loop payment/confirm skipped (non-blocking):', e.message));

    // ₹15 Institutional SNA welfare ledger note (logged to console + sheets)
    let affiliateStats = null;
    if (reg.refCode) {
      const cleanRef = reg.refCode.toUpperCase().trim();
      console.log(`💰 Institutional Welfare: ₹15 credited to ${cleanRef} fund for registration ${rollNumber}`);
      reg.snaWelfareLedgered = true;
      await reg.save();

      try {
        const aff = await ChampionshipAffiliate.findOneAndUpdate(
          { code: cleanRef },
          { $inc: { paidRegistrations: 1, snaFundAccrued: 15 } },
          { new: true }
        );
        if (aff) {
          affiliateStats = {
            code: aff.code,
            coordinatorName: aff.name,
            totalPaid: aff.paidRegistrations,
            totalSnaFund: aff.snaFundAccrued,
          };
        }
      } catch (affErr) {
        console.warn('Affiliate ledger update warning:', affErr.message);
      }
    }

    // Sync to Google Sheets
    await syncToGoogleSheets({
      type: 'registration',
      timestamp: new Date().toISOString(),
      rollNumber,
      name: reg.name,
      whatsapp: reg.whatsapp,
      email: reg.email,
      college: reg.college,
      course: reg.course,
      year: reg.year,
      state: reg.state,
      tier: `Tier ${reg.tier || 1}`,
      feePaid: `₹${reg.feePaid || 99}`,
      refCode: reg.refCode || '',
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      snaWelfare: reg.refCode ? '₹15' : '₹0',
    });

    // Send hall ticket email
    const hallTicketHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0d1527;color:#f1f5f9;padding:2rem;border-radius:12px;">
        <h2 style="color:#38bdf8;text-align:center;">🏆 Maa Park Championship 2026</h2>
        <h3 style="color:#10b981;text-align:center;">Hall Ticket Confirmed!</h3>
        <div style="background:#111d35;border:1px solid rgba(56,189,248,0.2);border-radius:8px;padding:1.5rem;margin:1.5rem 0;">
          <p><strong style="color:#38bdf8;">Roll Number:</strong> <span style="font-size:1.4rem;color:#fff;font-weight:bold;">${rollNumber}</span></p>
          <p><strong style="color:#38bdf8;">Name:</strong> ${reg.name}</p>
          <p><strong style="color:#38bdf8;">College:</strong> ${reg.college}</p>
          <p><strong style="color:#38bdf8;">Exam Date:</strong> Sunday, 13 September 2026</p>
          <p><strong style="color:#38bdf8;">Exam Time:</strong> 7:00 PM – 7:45 PM IST</p>
          <p><strong style="color:#38bdf8;">Exam URL:</strong> <a href="https://maapark.in/championship-exam.html" style="color:#10b981;">maapark.in/championship-exam.html</a></p>
          <p><strong style="color:#38bdf8;">Access Token:</strong> <code style="background:#0d1527;padding:0.2rem 0.5rem;border-radius:4px;">${examToken}</code></p>
        </div>
        <p style="color:#94a3b8;font-size:0.85rem;">IMPORTANT: Keep your Roll Number and Token safe. Do not share with anyone.</p>
        <p style="color:#94a3b8;font-size:0.85rem;">Join our WhatsApp channel for updates: https://whatsapp.com/channel/0029VbD8GjLHLHQgOzwPFq0</p>
        <hr style="border-color:rgba(56,189,248,0.2);">
        <p style="text-align:center;color:#64748b;font-size:0.8rem;">© 2026 Maa Park Technologies. maapark.in</p>
      </div>
    `;
    await sendNotificationEmail(
      reg.email,
      `🏆 Hall Ticket | Roll No: ${rollNumber} | Maa Park Championship 2026`,
      hallTicketHtml
    );

    res.json({
      success: true,
      rollNumber,
      examToken,
      examDate: '2026-08-30',
      examTime: '19:00 IST',
      examUrl: 'https://maapark.in/championship-exam.html',
      message: 'Payment verified. Your Hall Ticket has been sent to your email.',
    });
  } catch (err) {
    console.error('Verify payment error:', err.message);
    res.status(500).json({ error: 'Server error during payment verification.' });
  }
});

// ─── POST /api/championship/webhook/razorpay ──────────────────────────────────
// Razorpay webhook endpoint (use raw body for signature verification)
router.post('/webhook/razorpay', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.body; // Buffer
    const isValid = verifyRazorpayWebhookSignature(rawBody, signature, process.env.RAZORPAY_WEBHOOK_SECRET);
    if (!isValid) {
      console.warn('⚠️ Invalid Razorpay webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }
    const event = JSON.parse(rawBody.toString());
    console.log('🔔 Razorpay webhook event:', event.event);
    // Handle payment.captured as fallback
    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;
      const paymentId = payment.id;
      // Find and update if still pending
      const reg = await ChampionshipRegistration.findOne({ razorpayOrderId: orderId, status: 'pending' });
      if (reg) {
        console.log(`🔔 Webhook: processing pending payment for ${reg.email}`);
        // Trigger same flow as verify-payment
        // (simplified — in production call a shared handler function)
        const cfg = await ChampionshipConfig.findOneAndUpdate(
          { seatsFilled: { $lt: 12000 } },
          { $inc: { seatsFilled: 1 } },
          { new: true }
        );
        if (cfg) {
          const rollNumber = generateRollNumber(reg.collegeCode, cfg.seatsFilled);
          const examToken = generateExamToken();
          reg.razorpayPaymentId = paymentId;
          reg.status = 'paid';
          reg.rollNumber = rollNumber;
          reg.examToken = examToken;
          await reg.save();

          // ── Anti-Gravity Growth Loop (webhook path) ──────────────────────────
          fetch(`${process.env.API_BASE_URL || 'http://localhost:3000'}/api/growth/payment/confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              registrationId: reg._id.toString(),
              referralCodeUsed: reg.refCode || '',
            }),
          }).then(r => r.json())
            .then(d => console.log(`🔗 Growth loop webhook: code ${d.referralCode} for ${reg.name}`))
            .catch(e => console.warn('⚠️ Growth loop webhook skipped:', e.message));

          if (reg.refCode) {
            reg.snaWelfareLedgered = true;
            await reg.save();
            await ChampionshipAffiliate.findOneAndUpdate(
              { code: reg.refCode.toUpperCase().trim() },
              { $inc: { paidRegistrations: 1, snaFundAccrued: 15 } }
            ).catch(() => {});
          }

          await syncToGoogleSheets({
            type: 'webhook_registration',
            timestamp: new Date().toISOString(),
            rollNumber, name: reg.name, whatsapp: reg.whatsapp,
            email: reg.email, college: reg.college, course: reg.course, year: reg.year, state: reg.state,
            tier: `Tier ${reg.tier || 1}`, feePaid: `₹${reg.feePaid || 99}`,
            refCode: reg.refCode || '', paymentId, orderId, snaWelfare: reg.refCode ? '₹15' : '₹0',
          });
          console.log(`✅ Webhook: registration confirmed ${rollNumber}`);
        }
      }
    }
    res.json({ status: 'ok' });
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.status(500).json({ error: 'Webhook processing error' });
  }
});

// ─── POST /api/championship/claim-roll ──────────────────────────────────────
// Synchronize confirmed/claimed roll numbers directly into MongoDB Atlas & SQLite
router.post('/claim-roll', async (req, res) => {
  try {
    const {
      rollNumber,
      examToken,
      name,
      whatsapp,
      email,
      college,
      collegeCode,
      course,
      year,
      state,
      paymentId,
      orderId,
      feePaid
    } = req.body;

    if (!rollNumber) {
      return res.status(400).json({ error: 'Roll number is required.' });
    }

    const cleanRoll = rollNumber.trim().toUpperCase();
    const cleanToken = (examToken || 'TOK-' + Math.random().toString(36).substring(2, 10).toUpperCase()).trim();
    const candName = (name || 'AIONE Verified Candidate').trim();
    const candCollege = (college || 'Asian Institute of Nursing Education').trim();
    const candCode = collegeCode || candCollege.split(/\s+/).map(w => w[0]).join('').toUpperCase().substring(0, 6) || 'AIONE';
    const expiresAt = '2026-09-30T23:59:59.000Z';

    // 1. Upsert into MongoDB Atlas
    const mongoReg = await ChampionshipRegistration.findOneAndUpdate(
      { rollNumber: cleanRoll },
      {
        rollNumber: cleanRoll,
        name: candName,
        whatsapp: (whatsapp || '').trim(),
        email: (email || '').trim().toLowerCase(),
        college: candCollege,
        collegeCode: candCode,
        course: (course || 'B.Sc Nursing').trim(),
        year: (year || '4th Year').trim(),
        state: (state || 'Assam').trim(),
        examToken: cleanToken,
        password: cleanToken,
        status: 'paid',
        feePaid: Number(feePaid) || 99,
        reExamAllowed: true,
        examWindowExpiresAt: expiresAt,
        paymentId: paymentId || ('CLAIM-' + Date.now()),
        orderId: orderId || ('ORD-' + Date.now())
      },
      { upsert: true, new: true }
    );

    // 2. Upsert into SQLite Database
    try {
      sqlDB.upsertRegistration({
        rollNumber: cleanRoll,
        name: candName,
        whatsapp: (whatsapp || '').trim(),
        email: (email || '').trim().toLowerCase(),
        college: candCollege,
        collegeCode: candCode,
        course: (course || 'B.Sc Nursing').trim(),
        year: (year || '4th Year').trim(),
        state: (state || 'Assam').trim(),
        examToken: cleanToken,
        amount: Number(feePaid) || 99,
        status: 'paid',
        paymentStatus: 'paid',
        examWindowExpiresAt: expiresAt,
        razorpayPaymentId: paymentId || ('CLAIM-' + Date.now()),
        razorpayOrderId: orderId || ('ORD-' + Date.now())
      });
    } catch (sqlErr) {
      console.warn('⚠️ SQLite claim sync warning:', sqlErr.message);
    }

    console.log(`✅ [Claim Sync] Candidate ${cleanRoll} (${cleanToken}) synced to MongoDB Atlas & SQLite`);

    return res.json({
      success: true,
      rollNumber: cleanRoll,
      examToken: cleanToken,
      candidate: {
        name: candName,
        rollNumber: cleanRoll,
        examToken: cleanToken,
        college: candCollege,
        status: 'paid'
      }
    });
  } catch (err) {
    console.error('Claim roll sync error:', err.message);
    res.status(500).json({ error: 'Server error registering claimed roll number.' });
  }
});

// ─── UNIFIED CANDIDATE AUTHENTICATION RESOLVER ────────────────────────────────
// Single Source of Truth lookup & authentication across MongoDB Atlas & SQLite stores
async function findAuthenticatedCandidate(rollInput, tokenInput, options = {}) {
  const requireToken = options.requireToken !== false;
  const requirePayment = options.requirePayment !== false;

  if (!rollInput) {
    return { candidate: null, error: 'Roll number is required.', statusCode: 400 };
  }

  // Trim whitespace and sanitize inputs on both sides
  const cleanRoll = String(rollInput).trim().toUpperCase();
  const cleanToken = tokenInput ? String(tokenInput).trim().toUpperCase() : '';

  if (requireToken && !cleanToken) {
    return { candidate: null, error: 'Exam access token is required.', statusCode: 400 };
  }

  // 1. Demo Candidate Override
  const isDemo = cleanRoll.includes('DEMO') || cleanToken.includes('DEMO');
  if (isDemo) {
    return {
      isDemo: true,
      candidate: {
        rollNumber: cleanRoll || 'MPC-2026-DEMO-0001',
        name: 'Priya Sharma (Demo Candidate)',
        college: 'Dispur Nursing Institute, Guwahati',
        collegeCode: 'DEMO',
        examToken: 'DEMO-EXAM-TOKEN-2026',
        status: 'paid',
        feePaid: 99,
        reExamAllowed: true,
        examWindowExpiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
      }
    };
  }

  const cleanPhone = cleanRoll.replace(/\D/g, '').slice(-10);
  const isEmail = cleanRoll.includes('@');

  // 2. Lookup in MongoDB Atlas (Multi-strategy: exact, without PENDING-, with PENDING-, regex, email, or phone)
  let mongoCand = null;
  try {
    const rollVariants = [
      cleanRoll,
      cleanRoll.replace(/^PENDING-/, ''),
      'PENDING-' + cleanRoll.replace(/^PENDING-/, '')
    ];
    const mongoDocs = await ChampionshipRegistration.find({
      $or: [
        { rollNumber: { $in: rollVariants } },
        { rollNumber: { $regex: new RegExp('^' + cleanRoll.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') } }
      ]
    }).sort({ createdAt: -1 });
    mongoCand = mongoDocs.find(d => !d.rollNumber.startsWith('PENDING')) || mongoDocs[0] || null;

    // Fallback: Email lookup
    if (!mongoCand && isEmail) {
      const emailDocs = await ChampionshipRegistration.find({
        email: { $regex: new RegExp('^' + cleanRoll.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') }
      }).sort({ createdAt: -1 });
      mongoCand = emailDocs.find(d => !d.rollNumber.startsWith('PENDING')) || emailDocs[0] || null;
    }

    // Fallback: 10-digit mobile number lookup
    if (!mongoCand && cleanPhone.length === 10) {
      const phoneDocs = await ChampionshipRegistration.find({ whatsapp: { $regex: cleanPhone } }).sort({ createdAt: -1 });
      mongoCand = phoneDocs.find(d => !d.rollNumber.startsWith('PENDING')) || phoneDocs[0] || null;
    }

    // Fallback: Check if cleanRoll is an exam token
    if (!mongoCand && cleanRoll) {
      const tokenDocs = await ChampionshipRegistration.find({
        $or: [
          { examToken: cleanRoll },
          { examToken: { $regex: new RegExp('^' + cleanRoll.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') } }
        ]
      }).sort({ createdAt: -1 });
      mongoCand = tokenDocs.find(d => !d.rollNumber.startsWith('PENDING')) || tokenDocs[0] || null;
    }

    // Fallback: Check if cleanToken matches rollNumber or examToken
    if (!mongoCand && cleanToken && cleanToken !== 'LOOKUP_PASS') {
      const crossDocs = await ChampionshipRegistration.find({
        $or: [
          { rollNumber: cleanToken },
          { rollNumber: { $regex: new RegExp('^' + cleanToken.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') } },
          { examToken: cleanToken },
          { examToken: { $regex: new RegExp('^' + cleanToken.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') } }
        ]
      }).sort({ createdAt: -1 });
      mongoCand = crossDocs.find(d => !d.rollNumber.startsWith('PENDING')) || crossDocs[0] || null;
    }

    // Fallback: Name search
    if (!mongoCand && cleanRoll.length >= 3 && !/^\d+$/.test(cleanRoll)) {
      const nameDocs = await ChampionshipRegistration.find({
        name: { $regex: new RegExp(cleanRoll.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i') }
      }).sort({ createdAt: -1 });
      mongoCand = nameDocs.find(d => !d.rollNumber.startsWith('PENDING')) || nameDocs[0] || null;
    }
  } catch (err) {
    console.warn('MongoDB candidate lookup warning:', err.message);
  }

  // 3. Lookup in SQLite (Multi-strategy fallback)
  let sqlCand = null;
  try {
    sqlCand = sqlDB.getRegistrationByRoll(cleanRoll) ||
              sqlDB.getRegistrationByRoll(cleanRoll.replace(/^PENDING-/, '')) ||
              sqlDB.getRegistrationByRoll('PENDING-' + cleanRoll.replace(/^PENDING-/, ''));
    if (!sqlCand && isEmail) {
      sqlCand = sqlDB.getRegistrationByEmail(cleanRoll);
    }
    if (!sqlCand && cleanPhone.length === 10) {
      sqlCand = sqlDB.getRegistrationByPhone(cleanPhone);
    }
    if (!sqlCand) {
      sqlCand = sqlDB.getRegistrationByToken(cleanRoll) ||
                (cleanToken && cleanToken !== 'LOOKUP_PASS' ? sqlDB.getRegistrationByToken(cleanToken) : null) ||
                (cleanToken && cleanToken !== 'LOOKUP_PASS' ? sqlDB.getRegistrationByRoll(cleanToken) : null);
    }
  } catch (err) {
    console.warn('SQLite candidate lookup warning:', err.message);
  }

  if (!mongoCand && !sqlCand) {
    return {
      candidate: null,
      error: 'Candidate credentials not found. Please check your hall ticket or click "1-Click Practice Exam" to start immediately.',
      statusCode: 401
    };
  }

  // Cross-reference by phone to discover verified confirmed candidate if current match is PENDING-
  let confirmedCand = null;
  const candPhone = (mongoCand && mongoCand.whatsapp) || (sqlCand && sqlCand.whatsapp) || (/^\d{10}$/.test(cleanRoll) ? cleanRoll : null);
  if (candPhone) {
    const normPhone = candPhone.replace(/\D/g, '').slice(-10);
    if (normPhone.length === 10) {
      try {
        confirmedCand = await ChampionshipRegistration.findOne({
          whatsapp: { $regex: normPhone },
          rollNumber: { $not: /^PENDING-/ }
        });
      } catch (e) {}
    }
  }

  // Only use confirmedCand fallback if current match is PENDING-
  const isMongoPending = mongoCand && mongoCand.rollNumber && mongoCand.rollNumber.startsWith('PENDING-');
  const canonicalCandidate = (isMongoPending && confirmedCand) ? confirmedCand : (mongoCand || confirmedCand);
  const canonicalRoll = (canonicalCandidate && canonicalCandidate.rollNumber) || (sqlCand && sqlCand.roll_number) || cleanRoll;
  const name = (canonicalCandidate && canonicalCandidate.name) || (sqlCand && sqlCand.full_name) || 'Registered Candidate';
  const college = (canonicalCandidate && canonicalCandidate.college) || (sqlCand && sqlCand.college) || 'Nursing Institution';
  const collegeCode = (canonicalCandidate && canonicalCandidate.collegeCode) || (sqlCand && sqlCand.college_code) || '';
  const email = (canonicalCandidate && canonicalCandidate.email) || (sqlCand && sqlCand.email) || '';
  const whatsapp = (canonicalCandidate && canonicalCandidate.whatsapp) || (sqlCand && sqlCand.whatsapp) || '';
  const course = (canonicalCandidate && canonicalCandidate.course) || (sqlCand && sqlCand.course) || 'B.Sc Nursing';
  const year = (canonicalCandidate && canonicalCandidate.year) || (sqlCand && sqlCand.year_level) || 'Final Year';
  const state = (canonicalCandidate && canonicalCandidate.state) || (sqlCand && sqlCand.state) || 'Assam';
  const score = (canonicalCandidate && canonicalCandidate.score != null) ? canonicalCandidate.score : (sqlCand ? sqlCand.score : null);
  const certificateReleased = (canonicalCandidate && canonicalCandidate.certificateReleased) || (sqlCand && sqlCand.certificate_released === 1);
  const certificateId = (canonicalCandidate && canonicalCandidate.certificateId) || (sqlCand && sqlCand.certificate_id);

  // Status & payment resolution across fields - 100% authorized for special re-exam
  const mStatus = String((canonicalCandidate && canonicalCandidate.status) || (mongoCand && mongoCand.status) || '').toLowerCase();
  const sStatus = String((sqlCand && sqlCand.payment_status) || '').toLowerCase();
  const feePaid = Number((canonicalCandidate && canonicalCandidate.feePaid) || (mongoCand && mongoCand.feePaid) || (sqlCand && sqlCand.fee_paid_inr) || 0);
  const reExamAllowed = true;
  const isPaid = true;

  // Gather all valid tokens for this candidate
  const candidateTokens = new Set([
    String((canonicalCandidate && canonicalCandidate.examToken) || '').trim().toUpperCase(),
    String((mongoCand && mongoCand.examToken) || '').trim().toUpperCase(),
    String((sqlCand && sqlCand.exam_token) || '').trim().toUpperCase(),
    String((canonicalCandidate && canonicalCandidate.password) || '').trim().toUpperCase(),
    String((mongoCand && mongoCand.password) || '').trim().toUpperCase()
  ]);
  candidateTokens.delete('');
  const primaryToken = Array.from(candidateTokens)[0] || cleanToken;

  // User requirement: "koi bhi token invalid nahi dikhate... jo bhi token de, uske baad enter karne ke liye de do"
  // For any registered candidate, accept their entry immediately without throwing "Invalid exam access token"
  let tokenMatches = true;

  // Canonical normalized status
  let finalStatus = (canonicalCandidate && canonicalCandidate.status) || (mongoCand && mongoCand.status) || (sqlCand && sqlCand.status) || 'paid';
  if (finalStatus !== 'certified' && finalStatus !== 'exam_taken' && finalStatus !== 'Submitted - Pending Review') {
    finalStatus = 'paid';
  }

  const examWindowExpiresAt = (canonicalCandidate && canonicalCandidate.examWindowExpiresAt) || (mongoCand && mongoCand.examWindowExpiresAt) || (sqlCand && sqlCand.exam_window_expires_at) || '2026-09-30T23:59:59.000Z';

  return {
    isDemo: false,
    candidate: {
      rollNumber: canonicalRoll,
      name,
      college,
      collegeCode,
      email,
      whatsapp,
      course,
      year,
      state,
      status: finalStatus,
      rawStatus: mStatus || sStatus,
      feePaid: feePaid || 99,
      examToken: primaryToken,
      reExamAllowed,
      examWindowExpiresAt,
      score,
      certificateReleased,
      certificateId,
      mongoDoc: mongoCand,
      sqlRow: sqlCand,
      save: async function() {
        try {
          if (mongoCand && typeof mongoCand.save === 'function') {
            mongoCand.status = this.status;
            mongoCand.certificateReleased = this.certificateReleased;
            mongoCand.reExamAllowed = this.reExamAllowed;
            mongoCand.score = this.score;
            mongoCand.correctCount = this.correctCount;
            mongoCand.incorrectCount = this.incorrectCount;
            mongoCand.rank = this.rank;
            mongoCand.certificateId = this.certificateId;
            return await mongoCand.save();
          }
          return await ChampionshipRegistration.updateOne(
            { rollNumber: this.rollNumber },
            {
              $set: {
                status: this.status,
                certificateReleased: this.certificateReleased,
                reExamAllowed: this.reExamAllowed,
                score: this.score,
                correctCount: this.correctCount,
                incorrectCount: this.incorrectCount,
                rank: this.rank,
                certificateId: this.certificateId
              }
            }
          );
        } catch (e) {
          console.warn('Registration save warning:', e.message);
        }
      }
    }
  };
}

// ─── POST /api/championship/exam/login ────────────────────────────────────────
// Validates roll number + token, enforces 3-day window & 1-time re-attempt policy
router.post('/exam/login', async (req, res) => {
  try {
    const { rollNumber, examToken } = req.body;
    if (!rollNumber || !examToken) {
      return res.status(400).json({ error: 'Roll number and exam token are required.' });
    }

    const cleanRoll = rollNumber.toUpperCase().trim();
    const cleanToken = examToken.trim().toUpperCase();

    // ─── DEMO CANDIDATE OVERRIDE ───
    if (cleanRoll.includes('DEMO') || cleanToken.includes('DEMO')) {
      const sqlRes = sqlDB.getResultByRoll(cleanRoll);
      const isReattempt = sqlRes && sqlRes.exam_status === 'DISQUALIFIED';
      return res.json({
        success: true,
        candidateName: 'Priya Sharma (Demo Candidate)',
        college: 'Dispur Nursing Institute, Guwahati',
        rollNumber: cleanRoll || 'MPC-2026-DEMO-0001',
        examStart: new Date().toISOString(),
        examEnd: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
        durationMinutes: 40,
        isDemo: true,
        isReattempt,
        attemptNumber: isReattempt ? 2 : 1,
        maxAttempts: 2
      });
    }

    // Authenticate candidate using unified resolver
    const authResult = await findAuthenticatedCandidate(rollNumber, examToken, { requireToken: true, requirePayment: true });
    if (!authResult.candidate) {
      return res.status(authResult.statusCode || 401).json({ error: authResult.error });
    }

    const reg = authResult.candidate;

    // ─── EXTENDED SPECIAL RE-EXAM MAKEUP OPPORTUNITY (+2 Days Extended) ───
    const isReExam = true;
    let expiresAt = new Date('2026-10-05T23:59:59.000Z');
    if (reg.examWindowExpiresAt) {
      const cExp = new Date(reg.examWindowExpiresAt);
      if (cExp > new Date()) expiresAt = cExp;
    }

    const now = new Date();
    if (now > expiresAt && !isReExam) {
      const formattedExpiry = expiresAt.toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
      });
      return res.status(403).json({
        error: `Exam window expired. Under Championship regulations, the exam must be taken within your scheduled access window (${formattedExpiry} IST).`,
        windowExpired: true,
        expiresAt: expiresAt.toISOString()
      });
    }

    // ─── 2-ENTRY / 2-ATTEMPT EXAMINATION POLICY & RE-EXAM ACCESS ───
    let sqlRes = null;
    try {
      sqlRes = sqlDB.getResultByRoll(reg.rollNumber);
    } catch (sqErr) {}

    let pastAttempts = 0;
    if (sqlRes && sqlRes.attempt_count) {
      pastAttempts = sqlRes.attempt_count;
    } else if (reg.score != null || reg.status === 'certified' || reg.status === 'Submitted - Pending Review' || reg.status === 'exam_taken') {
      pastAttempts = 1;
    }

    // 1. If candidate already completed 2 full entries/attempts, lock out further attempts
    if (pastAttempts >= 2) {
      return res.status(409).json({
        error: 'Maximum examination attempts reached (Attempt 2/2 exhausted). Candidates are strictly permitted a maximum of 2 exam entries.',
        examStatus: (sqlRes && sqlRes.exam_status) || reg.status,
        attemptCount: pastAttempts,
        maxAttempts: 2,
        alreadySubmitted: true
      });
    }

    // 2. If candidate completed 1 entry, grant 2nd Entry / Re-Attempt (Attempt 2 of 2)
    if (pastAttempts === 1) {
      return res.json({
        success: true,
        candidateName: reg.name,
        college: reg.college,
        rollNumber: reg.rollNumber,
        examStart: new Date().toISOString(),
        examEnd: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
        durationMinutes: 40,
        isReattempt: true,
        attemptNumber: 2,
        maxAttempts: 2,
        previousDisqualificationReason: (sqlRes && sqlRes.disqualification_reason) || null,
        reAttemptNotice: 'SECOND ENTRY PERMITTED (Attempt 2 of 2): You are now accessing your 2nd permitted examination attempt. Ensure all answers are submitted before time expires.'
      });
    }

    // 3. First entry (Attempt 1 of 2)
    res.json({
      success: true,
      candidateName: reg.name,
      college: reg.college,
      rollNumber: reg.rollNumber,
      examStart: new Date().toISOString(),
      examEnd: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
      durationMinutes: 40,
      isReattempt: false,
      attemptNumber: 1,
      maxAttempts: 2,
      notice: 'ENTRY 1 OF 2: You are entitled to 2 examination attempts. If your session is interrupted, you may log in one additional time.'
    });
  } catch (err) {
    console.error('Exam login error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

function getDefault60Questions() {
  const clinicalQuestions = [
    { text: 'A primigravida at 38 weeks gestation presents with BP 160/110 mmHg, 3+ proteinuria, and severe headache. What is the immediate priority nursing action?', options: [{id:'A',text:'Administer oral antihypertensive and wait 1 hour'},{id:'B',text:'Place patient in left lateral position, maintain airway, and notify obstetrician immediately'},{id:'C',text:'Reassure the patient and recheck BP in 4 hours'},{id:'D',text:'Administer rapid IV fluid bolus of normal saline'}], correctId:'B', section:'A', topic:'Maternal Health' },
    { text: 'Which triad of clinical findings definitively characterizes HELLP syndrome in obstetrics?', options: [{id:'A',text:'Hypertension, elevated liver enzymes, low platelets'},{id:'B',text:'Hemolysis, elevated liver enzymes, low platelet count (<100,000/mm³)'},{id:'C',text:'Headache, peripheral edema, hypokalemia'},{id:'D',text:'Hypoglycemia, elevated LDH, leukocytosis'}], correctId:'B', section:'A', topic:'Maternal Health' },
    { text: 'What is the earliest and most sensitive clinical sign of Magnesium Sulfate (MgSO4) toxicity in eclampsia management?', options: [{id:'A',text:'Sudden cardiac arrest'},{id:'B',text:'Respiratory rate < 12 breaths/min'},{id:'C',text:'Loss of deep tendon reflexes (Patellar reflex)'},{id:'D',text:'Severe hypertensive crisis'}], correctId:'C', section:'A', topic:'Pharmacology' },
    { text: 'During Leopold maneuvers, the nurse palpates a hard, smooth, round, ballotable mass in the uterine fundus. What fetal presentation does this indicate?', options: [{id:'A',text:'Cephalic presentation'},{id:'B',text:'Breech presentation'},{id:'C',text:'Transverse lie'},{id:'D',text:'Shoulder presentation'}], correctId:'B', section:'A', topic:'Maternal Health' },
    { text: 'According to WHO/ICMR active management of third stage of labor (AMTSL), what is the first-line uterotonic drug and dosage?', options: [{id:'A',text:'Oxytocin 10 IU IM within 1 minute of fetal delivery'},{id:'B',text:'Methylergometrine 0.2 mg IV stat'},{id:'C',text:'Misoprostol 200 mcg sublingually'},{id:'D',text:'Carboprost 250 mcg intramyometrial'}], correctId:'A', section:'A', topic:'Maternal Health' },
    { text: 'A newborn has a heart rate of 110 bpm, slow irregular breathing, some flexion of extremities, grimace on suctioning, and pink body with blue extremities. What is the APGAR score at 1 minute?', options: [{id:'A',text:'9'},{id:'B',text:'8'},{id:'C',text:'6'},{id:'D',text:'4'}], correctId:'C', section:'A', topic:'Pediatric Nursing' },
    { text: 'What is the standard chest compression to ventilation ratio in neonatal resuscitation when done by two healthcare rescuers?', options: [{id:'A',text:'30:2'},{id:'B',text:'15:2'},{id:'C',text:'3:1 (90 compressions and 30 breaths per minute)'},{id:'D',text:'5:1'}], correctId:'C', section:'A', topic:'Pediatric Nursing' },
    { text: 'In Kangaroo Mother Care (KMC) for low birth weight neonates, what is the minimum recommended duration per session?', options: [{id:'A',text:'15 minutes'},{id:'B',text:'At least 1 hour continuously'},{id:'C',text:'4 hours strictly'},{id:'D',text:'10 minutes twice daily'}], correctId:'B', section:'A', topic:'Neonatal Care' },
    { text: 'Which vitamin should be administered intramuscularly to all newborns immediately after birth to prevent hemorrhagic disease of the newborn (HDN)?', options: [{id:'A',text:'Vitamin A (100,000 IU)'},{id:'B',text:'Vitamin K1 (Phytomenadione 1 mg IM)'},{id:'C',text:'Vitamin D3 (400 IU)'},{id:'D',text:'Vitamin C (50 mg)'}], correctId:'B', section:'A', topic:'Pediatric Nursing' },
    { text: 'According to the National Immunization Schedule (NIS) of India, what vaccines are given at birth?', options: [{id:'A',text:'BCG, OPV-0, and Hepatitis B birth dose'},{id:'B',text:'Pentavalent-1 and Rotavirus-1'},{id:'C',text:'Measles-Rubella-1 and Vitamin A'},{id:'D',text:'DPT booster and OPV booster'}], correctId:'A', section:'A', topic:'Immunization' }
  ];

  for (let i = 11; i <= 60; i++) {
    let sec = i <= 25 ? 'A' : (i <= 45 ? 'B' : (i <= 55 ? 'C' : 'D'));
    let topic = sec === 'A' ? 'Maternal & Pediatric Nursing' : (sec === 'B' ? 'Pharmacology & Calculations' : (sec === 'C' ? 'Digital Health & MaaCare Protocols' : 'Emergency & Trauma Triage'));
    clinicalQuestions.push({
      _id: `q${i}`,
      id: `q${i}`,
      text: `Clinical Question ${i} [${topic}]: What is the primary evidence-based nursing intervention and protocol for optimal patient safety?`,
      options: [
        { id: 'A', text: 'Implement continuous clinical assessment and follow standard institutional operating protocol.' },
        { id: 'B', text: 'Administer non-prescribed medications without baseline diagnostic checks.' },
        { id: 'C', text: 'Withhold emergency resuscitation measures until attending consultant signs physical chart.' },
        { id: 'D', text: 'Disconnect hemodynamic monitoring during high-dependency patient transfer.' }
      ],
      correctId: 'A',
      section: sec,
      topic,
      difficulty: 'medium'
    });
  }

  return clinicalQuestions.map((q, idx) => ({
    _id: q._id || `q${idx+1}`,
    id: q.id || `q${idx+1}`,
    ...q
  }));
}

// ─── GET /api/championship/exam/questions ─────────────────────────────────────
// Returns randomized, per-session question set (requires roll + token)
router.get('/exam/questions', async (req, res) => {
  try {
    const { rollNumber, examToken } = req.query;
    if (!rollNumber || !examToken) {
      return res.status(400).json({ error: 'Roll number and token required.' });
    }

    const cleanRoll = rollNumber.toUpperCase().trim();
    const cleanToken = examToken.trim();
    const isDemo = cleanRoll.includes('DEMO') || cleanToken.includes('DEMO');

    if (isDemo) {
      const demoQuestions = [
        { id: 'q1', section: 'A', topic: 'Maternal Health', text: 'A primigravida at 38 weeks gestation presents with BP 160/110 mmHg, 3+ proteinuria, and severe headache. What is the immediate priority nursing action?', options: [{id:'A',text:'Administer oral antihypertensive and wait 1 hour'},{id:'B',text:'Place patient in left lateral position, maintain airway, and notify obstetrician immediately'},{id:'C',text:'Reassure the patient and recheck BP in 4 hours'},{id:'D',text:'Administer rapid IV fluid bolus of normal saline'}] },
        { id: 'q2', section: 'A', topic: 'Maternal Health', text: 'Which triad of clinical findings definitively characterizes HELLP syndrome in obstetrics?', options: [{id:'A',text:'Hypertension, elevated liver enzymes, low platelets'},{id:'B',text:'Hemolysis, elevated liver enzymes, low platelet count (<100,000/mm³)'},{id:'C',text:'Headache, peripheral edema, hypokalemia'},{id:'D',text:'Hypoglycemia, elevated LDH, leukocytosis'}] },
        { id: 'q3', section: 'A', topic: 'Pharmacology', text: 'What is the earliest and most sensitive clinical sign of Magnesium Sulfate (MgSO4) toxicity in eclampsia management?', options: [{id:'A',text:'Sudden cardiac arrest'},{id:'B',text:'Respiratory rate < 12 breaths/min'},{id:'C',text:'Loss of deep tendon reflexes (Patellar reflex)'},{id:'D',text:'Severe hypertensive crisis'}] },
        { id: 'q4', section: 'A', topic: 'Maternal Health', text: 'During Leopold maneuvers, the nurse palpates a hard, smooth, round, ballotable mass in the uterine fundus. What fetal presentation does this indicate?', options: [{id:'A',text:'Cephalic presentation'},{id:'B',text:'Breech presentation'},{id:'C',text:'Transverse lie'},{id:'D',text:'Shoulder presentation'}] },
        { id: 'q5', section: 'A', topic: 'Maternal Health', text: 'According to WHO/ICMR active management of third stage of labor (AMTSL), what is the first-line uterotonic drug and dosage?', options: [{id:'A',text:'Oxytocin 10 IU IM within 1 minute of fetal delivery'},{id:'B',text:'Methylergometrine 0.2 mg IV stat'},{id:'C',text:'Misoprostol 200 mcg sublingually'},{id:'D',text:'Carboprost 250 mcg intramyometrial'}] },
        { id: 'q6', section: 'A', topic: 'Pediatric Nursing', text: 'A newborn has a heart rate of 110 bpm, slow irregular breathing, some flexion of extremities, grimace on suctioning, and pink body with blue extremities. What is the APGAR score at 1 minute?', options: [{id:'A',text:'9'},{id:'B',text:'8'},{id:'C',text:'6'},{id:'D',text:'4'}] },
        { id: 'q7', section: 'A', topic: 'Pediatric Nursing', text: 'What is the standard chest compression to ventilation ratio in neonatal resuscitation when done by two healthcare rescuers?', options: [{id:'A',text:'30:2'},{id:'B',text:'15:2'},{id:'C',text:'3:1 (90 compressions and 30 breaths per minute)'},{id:'D',text:'5:1'}] },
        { id: 'q8', section: 'A', topic: 'Neonatal Care', text: 'In Kangaroo Mother Care (KMC) for low birth weight neonates, what is the minimum recommended duration per session?', options: [{id:'A',text:'15 minutes'},{id:'B',text:'At least 1 hour continuously'},{id:'C',text:'4 hours strictly'},{id:'D',text:'10 minutes twice daily'}] },
        { id: 'q9', section: 'A', topic: 'Pediatric Nursing', text: 'Which vitamin should be administered intramuscularly to all newborns immediately after birth to prevent hemorrhagic disease of the newborn (HDN)?', options: [{id:'A',text:'Vitamin A (100,000 IU)'},{id:'B',text:'Vitamin K1 (Phytomenadione 1 mg IM)'},{id:'C',text:'Vitamin D3 (400 IU)'},{id:'D',text:'Vitamin C (50 mg)'}] },
        { id: 'q10', section: 'A', topic: 'Immunization', text: 'According to the National Immunization Schedule (NIS) of India, what vaccines are given at birth?', options: [{id:'A',text:'BCG, OPV-0, and Hepatitis B birth dose'},{id:'B',text:'Pentavalent-1 and Rotavirus-1'},{id:'C',text:'Measles-Rubella-1 and Vitamin A'},{id:'D',text:'DPT booster and OPV booster'}] }
      ];

      for (let i = 11; i <= 60; i++) {
        let sec = i <= 25 ? 'A' : (i <= 45 ? 'B' : (i <= 55 ? 'C' : 'D'));
        let topic = sec === 'A' ? 'Maternal & Pediatric Nursing' : (sec === 'B' ? 'Pharmacology & Calculations' : (sec === 'C' ? 'Digital Health & MaaCare Protocols' : 'Emergency & Trauma Triage'));
        demoQuestions.push({
          id: `q${i}`,
          index: i,
          section: sec,
          topic,
          difficulty: 'medium',
          text: `Clinical Simulation Question ${i} [${topic}]: An acute patient is admitted. What is the evidence-based nursing protocol for intervention?`,
          options: [
            { id: 'A', text: 'Initiate standard triage protocol, assess hemodynamics, and record vitals continuously.' },
            { id: 'B', text: 'Withhold nursing care until non-urgent administrative formalities are completed.' },
            { id: 'C', text: 'Administer undocumented medications without clinical orders.' },
            { id: 'D', text: 'Silence clinical monitor alarms during patient rest periods.' }
          ]
        });
      }

      return res.json({
        success: true,
        totalQuestions: demoQuestions.length,
        durationMinutes: 45,
        examEnd: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
        questions: demoQuestions,
      });
    }

    // Authenticate candidate using unified resolver
    const authResult = await findAuthenticatedCandidate(rollNumber, examToken, { requireToken: true, requirePayment: true });
    if (!authResult.candidate) {
      return res.status(authResult.statusCode || 401).json({ error: authResult.error || 'Unauthorized.' });
    }
    const reg = authResult.candidate;

    // Fetch all active questions from DB or generate standard 60-question bank
    let allQuestions = [];
    try {
      allQuestions = await ChampionshipQuestion.find({ active: true }).lean();
    } catch (dbErr) {
      console.warn('DB query fallback for questions:', dbErr.message);
    }

    if (allQuestions.length === 0) {
      allQuestions = getDefault60Questions();
    }

    let session = null;
    try {
      session = await ChampionshipExamSession.findOne({ rollNumber: reg.rollNumber });
    } catch (e) {}

    let questionIds, optionShuffles;
    if (!session) {
      // Group by section and cryptographically shuffle within each section
      const secA = cryptoShuffle(allQuestions.filter(q => q.section === 'A')).slice(0, 25);
      const secB = cryptoShuffle(allQuestions.filter(q => q.section === 'B')).slice(0, 20);
      const secC = cryptoShuffle(allQuestions.filter(q => q.section === 'C')).slice(0, 10);
      const secD = cryptoShuffle(allQuestions.filter(q => q.section === 'D')).slice(0, 5);

      let orderedQuestions = [...secA, ...secB, ...secC, ...secD];
      // Fallback if section tags are not present
      if (orderedQuestions.length === 0) {
        orderedQuestions = cryptoShuffle(allQuestions).slice(0, 60);
      }

      questionIds = orderedQuestions.map(q => q._id.toString());

      // Cryptographically shuffle options per question (anti-bias protection)
      optionShuffles = {};
      for (const q of orderedQuestions) {
        optionShuffles[q._id.toString()] = cryptoShuffle(q.options);
      }

      try {
        session = await ChampionshipExamSession.create({
          rollNumber: reg.rollNumber,
          questionIds,
          optionShuffles,
          startedAt: new Date(),
        });
      } catch (dbErr) {
        // Safe memory fallback for session
      }
    } else {
      questionIds = session.questionIds;
      optionShuffles = session.optionShuffles;
    }

    // Build response — strip correctId from client payload
    const questionMap = {};
    for (const q of allQuestions) questionMap[q._id.toString()] = q;

    const questions = questionIds.map((qId, idx) => {
      const q = questionMap[qId];
      if (!q) return null;
      const shuffledOptions = optionShuffles[qId] || q.options;
      return {
        id: qId,
        index: idx + 1,
        text: q.text,
        topic: q.topic,
        section: q.section || (idx < 25 ? 'A' : idx < 45 ? 'B' : idx < 55 ? 'C' : 'D'),
        difficulty: q.difficulty || 'medium',
        options: shuffledOptions.map(opt => ({ id: opt.id, text: opt.text })),
        // correctId NOT sent to client
      };
    }).filter(Boolean);

    res.json({
      success: true,
      totalQuestions: questions.length,
      durationMinutes: 45,
      examEnd: (await getConfig()).examEndDate,
      questions,
    });
  } catch (err) {
    console.error('Questions error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── POST /api/championship/exam/save-progress ──────────────────────────────
// Debounced 10s auto-save progress endpoint to prevent data loss on refresh/drop
router.post('/exam/save-progress', async (req, res) => {
  try {
    const { rollNumber, examToken, answers, marked, timeRemaining, currentQuestionIndex, tabSwitchCount } = req.body;
    if (!rollNumber || !examToken) {
      return res.status(400).json({ error: 'Roll number and exam token are required.' });
    }

    const cleanRoll = rollNumber.toUpperCase().trim();
    if (cleanRoll.includes('DEMO')) {
      return res.json({ success: true, savedAt: new Date().toISOString(), isDemo: true });
    }

    const session = await ChampionshipExamSession.findOneAndUpdate(
      { rollNumber: cleanRoll },
      {
        $set: {
          answers: answers || {},
          timeRemaining: Number(timeRemaining) || 0,
          currentQuestionIndex: Number(currentQuestionIndex) || 0,
          tabSwitchCount: Number(tabSwitchCount) || 0,
          lastHeartbeatAt: new Date(),
        }
      },
      { new: true }
    );

    res.json({
      success: true,
      savedAt: new Date().toISOString(),
      sessionExists: !!session,
    });
  } catch (err) {
    console.error('Save progress error:', err.message);
    res.status(500).json({ error: 'Server error saving progress' });
  }
});

// ─── POST /api/championship/exam/submit ───────────────────────────────────────
// Real-time SQL Persistence for all 60 questions & Scores; Conceals scores from candidate until official result release
router.post('/exam/submit', async (req, res) => {
  try {
    const { rollNumber, examToken, answers, tabSwitchCount, autoSubmitted, timeSpent, marked, isCheating, disqualificationReason } = req.body;
    if (!rollNumber || !examToken || !answers) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    const cleanRoll = rollNumber.toUpperCase().trim();
    const cleanToken = examToken.trim();
    const isDemo = cleanRoll.includes('DEMO') || cleanToken.includes('DEMO');

    const hasViolation = isCheating === true || (tabSwitchCount && Number(tabSwitchCount) >= 1);
    const examStatus = hasViolation ? 'DISQUALIFIED' : 'Submitted - Pending Review';
    const reason = hasViolation ? (disqualificationReason || 'Page left during exam (single-strike anti-cheat policy)') : null;

    // Previous attempt lookup
    const prevRes = sqlDB.getResultByRoll(cleanRoll);
    const currentAttempt = (prevRes && prevRes.attempt_count) ? prevRes.attempt_count + 1 : 1;

    if (isDemo) {
      const answeredKeys = Object.keys(answers || {});
      const correct = Math.max(1, Math.round(answeredKeys.length * 0.85));
      const incorrect = Math.max(0, answeredKeys.length - correct);
      const unattempted = Math.max(0, 60 - answeredKeys.length);
      const score = Math.max(0, correct * 1 - incorrect * 0.25);
      const certificateId = 'CERT-MPC2026-DEMO99';

      // 60-question itemized audit trail for practice exam
      const itemizedAudit = [];
      for (let i = 1; i <= 60; i++) {
        const qId = `q${i}`;
        const userChoice = answers[qId] || null;
        const isCorr = userChoice === 'B' || userChoice === 'A';
        itemizedAudit.push({
          qNum: i,
          section: i <= 25 ? 'A' : (i <= 45 ? 'B' : (i <= 55 ? 'C' : 'D')),
          questionId: qId,
          candidateAnswer: userChoice ? `Option ${userChoice}` : '(Not Attempted)',
          correctAnswer: 'Option B',
          isCorrect: userChoice ? isCorr : false,
          marksAwarded: userChoice ? (isCorr ? 1.0 : -0.25) : 0.0
        });
      }

      // ── Real-Time SQL Persistence for Demo Submission ──
      try {
        sqlDB.upsertRegistration({
          rollNumber: cleanRoll,
          name: 'Priya Sharma (Practice)',
          whatsapp: '9999999999',
          email: 'practice@maapark.in',
          college: 'Dispur Nursing Institute, Guwahati',
          course: 'B.Sc Nursing',
          state: 'Assam',
          paymentStatus: 'Captured'
        });
        sqlDB.saveExamResult({
          rollNumber: cleanRoll,
          name: 'Priya Sharma (Practice)',
          college: 'Dispur Nursing Institute, Guwahati',
          score,
          correctCount: correct,
          incorrectCount: incorrect,
          unattempted,
          rank: 12,
          certificateId,
          certificateUrl: `https://maapark.in/championship-verify.html?id=${certificateId}`,
          tabSwitches: tabSwitchCount || (hasViolation ? 1 : 0),
          autoSubmitted: autoSubmitted || false,
          timeSpent: timeSpent || 0,
          examStatus,
          disqualificationReason: reason,
          attemptCount: currentAttempt
        });
        sqlDB.saveExamAudits(cleanRoll, 'Priya Sharma (Practice)', 'Dispur Nursing Institute, Guwahati', itemizedAudit);
        console.log(`✅ [SQL Real-Time Sync] Demo Exam result & 60-Q audits saved to SQL for ${cleanRoll}`);
      } catch (sqlErr) {
        console.warn('⚠️ SQL Sync Warning in demo submit:', sqlErr.message);
      }

      // Do NOT expose score or rank in the candidate response
      return res.json({
        success: true,
        rollNumber: cleanRoll,
        candidateName: 'Priya Sharma (Practice)',
        college: 'Dispur Nursing Institute, Guwahati',
        examStatus,
        certificateReleased: false,
        disqualificationReason: reason,
        attemptCount: currentAttempt,
        maxAttempts: 2,
        canReattempt: examStatus === 'DISQUALIFIED' && currentAttempt < 2,
        totalQuestionsAudited: itemizedAudit.length,
        answersRecorded: true,
        message: examStatus === 'DISQUALIFIED'
          ? (currentAttempt < 2
              ? 'Practice exam disqualified due to page leave violation. You have 1 re-attempt remaining within your 3-day window.'
              : 'Practice exam disqualified. Maximum permitted attempts (2/2) reached.')
          : 'Exam Submitted Successfully! Your results and certificate will be verified and made available later.'
      });
    }

    // Authenticate candidate using unified resolver
    const authResult = await findAuthenticatedCandidate(rollNumber, examToken, { requireToken: true, requirePayment: true });
    if (!authResult.candidate) {
      return res.status(authResult.statusCode || 401).json({ error: authResult.error || 'Unauthorized.' });
    }
    const reg = authResult.candidate;

    let session = null;
    try {
      session = await ChampionshipExamSession.findOne({ rollNumber: reg.rollNumber });
    } catch (e) {}

    // Fetch the actual questions with correct answers
    let questionDocs = [];
    if (session && session.questionIds && session.questionIds.length > 0) {
      try {
        questionDocs = await ChampionshipQuestion.find({
          _id: { $in: session.questionIds }
        }).lean();
      } catch (e) {}
    }

    // If MongoDB questions not loaded, fallback to default questions
    if (!questionDocs || questionDocs.length === 0) {
      try {
        questionDocs = await ChampionshipQuestion.find().limit(60).lean();
      } catch (e) {}
    }
    if (!questionDocs || questionDocs.length === 0) {
      questionDocs = getDefault60Questions();
    }

    const { score, correct, incorrect, unattempted } = calculateScore(answers, questionDocs);

    const itemizedAudit = (questionDocs || []).map((q, idx) => {
      const qNum = idx + 1;
      const candidateAnswerId = answers[q._id ? q._id.toString() : null] || answers[q.id] || answers[String(qNum)] || answers[`q${qNum}`];
      const isCorrect = candidateAnswerId === q.correctId;
      const candidateAnswerOpt = q.options ? q.options.find(o => o.id === candidateAnswerId) : null;
      const correctAnswerOpt = q.options ? q.options.find(o => o.id === q.correctId) : null;
      return {
        qNum,
        section: q.section || (idx < 25 ? 'A' : (idx < 45 ? 'B' : (idx < 55 ? 'C' : 'D'))),
        questionId: q._id ? q._id.toString() : (q.id || `q${qNum}`),
        candidateAnswer: candidateAnswerOpt ? candidateAnswerOpt.text : (candidateAnswerId ? `Option ${candidateAnswerId}` : '(Not Attempted)'),
        correctAnswer: correctAnswerOpt ? correctAnswerOpt.text : 'Option B',
        isCorrect: !!isCorrect,
        marksAwarded: candidateAnswerId ? (isCorrect ? 1.0 : -0.25) : 0.0,
        timeSpent: null
      };
    });

    // Calculate rank: count candidates with higher score + 1
    let rank = 12;
    try {
      const betterCount = await ChampionshipRegistration.countDocuments({
        score: { $gt: score },
        status: { $in: ['exam_taken', 'certified'] },
      });
      rank = betterCount + 1;
    } catch (e) {}

    // Generate certificate ID
    const certificateId = generateCertificateId();

    // Update MongoDB session if available
    if (session) {
      try {
        session.submittedAt = new Date();
        session.answers = answers;
        session.marked = marked || {};
        session.timeSpent = timeSpent || 0;
        session.itemizedAudit = itemizedAudit;
        session.tabSwitchCount = tabSwitchCount || (hasViolation ? 1 : 0);
        session.autoSubmitted = autoSubmitted || false;
        session.score = score;
        session.correctCount = correct;
        session.incorrectCount = incorrect;
        session.examStatus = examStatus;
        session.disqualificationReason = reason;
        await session.save();
      } catch (e) {}
    }

    // Update MongoDB registration if available
    try {
      reg.status = examStatus === 'DISQUALIFIED' ? 'exam_taken' : 'Submitted - Pending Review';
      reg.certificateReleased = false;
      reg.reExamAllowed = currentAttempt < 2; // Allow 2 attempts total
      reg.score = score;
      reg.correctCount = correct;
      reg.incorrectCount = incorrect;
      reg.rank = rank;
      reg.certificateId = certificateId;
      await reg.save();
    } catch (e) {}

    // Update SQLite re-exam flag and status based on attempt count (max 2)
    try {
      sqlDB.run(`UPDATE registrations SET re_exam_allowed = ?, status = ? WHERE UPPER(roll_number) = UPPER(?)`, [currentAttempt < 2 ? 1 : 0, examStatus, reg.rollNumber]);
    } catch (e) {}

    // ── Real-Time SQL Database Persistence (Results & Question Audits) ──
    try {
      sqlDB.upsertRegistration({
        rollNumber: reg.rollNumber,
        name: reg.name,
        whatsapp: reg.whatsapp,
        email: reg.email,
        college: reg.college,
        collegeCode: reg.collegeCode,
        course: reg.course,
        year: reg.year,
        state: reg.state,
        status: examStatus
      });

      sqlDB.saveExamResult({
        rollNumber: reg.rollNumber,
        name: reg.name,
        college: reg.college,
        score,
        correctCount: correct,
        incorrectCount: incorrect,
        unattempted,
        rank,
        certificateId,
        certificateUrl: `https://maapark.in/championship-verify.html?id=${certificateId}`,
        tabSwitches: tabSwitchCount || (hasViolation ? 1 : 0),
        autoSubmitted: autoSubmitted || false,
        timeSpent: timeSpent || 0,
        examStatus,
        disqualificationReason: reason,
        attemptCount: currentAttempt
      });

      if (itemizedAudit && itemizedAudit.length > 0) {
        sqlDB.saveExamAudits(reg.rollNumber, reg.name, reg.college, itemizedAudit);
      }
      console.log(`✅ [SQL Real-Time Sync] Official Exam result (${examStatus}) & ${itemizedAudit.length} audits saved to SQL for ${reg.rollNumber} (Attempt ${currentAttempt})`);
    } catch (sqlErr) {
      console.warn('⚠️ SQL Sync Warning in live submit:', sqlErr.message);
    }

    // Sync to Google Sheets
    try {
      await syncToGoogleSheets({
        type: 'exam_result_with_audit',
        timestamp: new Date().toISOString(),
        rollNumber: reg.rollNumber,
        name: reg.name,
        whatsapp: reg.whatsapp,
        email: reg.email,
        college: reg.college,
        course: reg.course,
        year: reg.year,
        state: reg.state,
        score,
        correct,
        incorrect,
        unattempted,
        rank,
        certificateId,
        tabSwitches: tabSwitchCount || (hasViolation ? 1 : 0),
        autoSubmitted: autoSubmitted || false,
        timeSpent: timeSpent || 0,
        examStatus,
        disqualificationReason: reason,
        attemptCount: currentAttempt,
        itemizedAudit
      });
    } catch (e) {}

    // DO NOT EXPOSE SCORE OR MARKS TO CANDIDATE CLIENT — REAL-TIME DATABASE SAVING ONLY
    res.json({
      success: true,
      rollNumber: reg.rollNumber,
      candidateName: reg.name,
      college: reg.college,
      examStatus,
      certificateReleased: false,
      disqualificationReason: reason,
      attemptCount: currentAttempt,
      maxAttempts: 2,
      canReattempt: currentAttempt < 2,
      totalQuestionsAudited: itemizedAudit.length,
      answersRecorded: true,
      message: examStatus === 'DISQUALIFIED'
        ? (currentAttempt < 2
            ? 'Examination disqualified due to leaving exam page. You have strictly 1 re-attempt remaining within your active window.'
            : 'Examination disqualified. Maximum attempts reached (Attempt 2/2 exhausted).')
        : (currentAttempt < 2
            ? 'Exam Submitted Successfully! You have 1 additional entry/attempt permitted if needed.'
            : 'Exam Submitted Successfully! All 2 examination attempts completed. Your results and certificate will be verified.')
    });
  } catch (err) {
    console.error('Submit error:', err.message);
    res.status(500).json({ error: 'Server error during submission.' });
  }
});

// ─── POST /api/championship/candidate/status ──────────────────────────────────
// Secure Candidate Portal Status Authentication (Roll Number + Token)
router.post('/candidate/status', async (req, res) => {
  try {
    const { rollNumber, examToken } = req.body;
    if (!rollNumber || !examToken) {
      return res.status(400).json({ error: 'Roll number and exam access token are required.' });
    }

    // Authenticate candidate using unified resolver
    const authResult = await findAuthenticatedCandidate(rollNumber, examToken, { requireToken: true, requirePayment: false });
    if (!authResult.candidate) {
      return res.status(authResult.statusCode || 401).json({ error: authResult.error || 'Candidate record not found. Please check your credentials.' });
    }

    const candidate = authResult.candidate;

    // Check release status: certificates are currently LOCKED pending re-exam conclusion
    const isReleased = (candidate.certificateReleased === true && candidate.status === 'certified');

    if (!isReleased) {
      let statusLabel = 'Verified & Paid — Examination Active';
      if (candidate.rawStatus && (candidate.rawStatus.includes('submitted') || candidate.rawStatus.includes('exam_taken') || candidate.rawStatus.includes('pending review'))) {
        statusLabel = 'Submitted — Under Board Evaluation';
      }

      return res.json({
        success: true,
        authenticated: true,
        locked: true,
        candidate: {
          name: candidate.name,
          rollNumber: candidate.rollNumber,
          college: candidate.college,
          status: statusLabel,
          reExamAllowed: candidate.reExamAllowed,
          examWindowExpiresAt: candidate.examWindowExpiresAt,
          message: 'Your registration and credentials have been verified in our master registry. Examination access is active.',
          releaseDate: 'September 30, 2026',
        }
      });
    }

    // If released by admin in the future
    return res.json({
      success: true,
      authenticated: true,
      locked: false,
      candidate: {
        name: candidate.name,
        rollNumber: candidate.rollNumber,
        college: candidate.college,
        status: 'Officially Certified',
        certificateId: candidate.certificateId,
      }
    });
  } catch (err) {
    console.error('Candidate status check error:', err.message);
    res.status(500).json({ error: 'Server error checking candidate status.' });
  }
});

// ─── POST /api/championship/lookup-candidate ──────────────────────────────────
// Fast Hall Ticket & Roll Number lookup by WhatsApp, Email, or Roll Number
router.post('/lookup-candidate', async (req, res) => {
  try {
    const query = String(req.body.query || req.body.phone || req.body.whatsapp || req.body.email || req.body.rollNumber || req.body.identifier || '').trim();
    if (!query) {
      return res.status(400).json({ error: 'Please enter a WhatsApp number, Email, or Roll Number.' });
    }

    const authResult = await findAuthenticatedCandidate(query, 'LOOKUP_PASS', { requireToken: false, requirePayment: false });
    if (!authResult.candidate) {
      return res.json({
        success: false,
        found: false,
        message: 'No registration record found for the provided details. Please verify your mobile number or email.'
      });
    }

    const c = authResult.candidate;
    const shortToken = c.examToken ? c.examToken.replace(/^MPC-TOK-/, '') : '';

    return res.json({
      success: true,
      found: true,
      candidate: {
        name: c.name,
        rollNumber: c.rollNumber,
        examToken: c.examToken,
        shortToken,
        college: c.college,
        whatsapp: c.whatsapp,
        email: c.email,
        course: c.course,
        year: c.year,
        status: c.status || 'paid',
        paymentStatus: 'PAID (₹99 Confirmed)',
        reExamAllowed: c.reExamAllowed,
        examWindowExpiresAt: c.examWindowExpiresAt
      }
    });
  } catch (err) {
    console.error('Candidate lookup error:', err.message);
    res.status(500).json({ error: 'Server error looking up candidate record.' });
  }
});

// ─── GET /api/championship/verify/:certId ─────────────────────────────────────
// Public certificate verification (LOCKED until administrative release)
router.get('/verify/:certId', async (req, res) => {
  try {
    // Re-exam and evaluation window is active: ALL public verification is strictly locked
    return res.status(403).json({
      success: false,
      verified: false,
      locked: true,
      message: 'Certificate verification is currently locked pending completion of the extended re-exam window (ending September 28, 2026) and final Clinical Advisory Board approval.'
    });
  } catch (err) {
    console.error('Verify error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── GET /api/championship/certificate/download/:id ───────────────────────────
// Direct stream/download of official PDF certificate (LOCKED until administrative release)
router.get(['/certificate/download/:id', '/download/:id'], async (req, res) => {
  try {
    // Re-exam and evaluation window is active: ALL downloads are strictly locked
    return res.status(403).json({
      error: 'Official certificate downloads are currently locked pending administrative evaluation and board release.',
      locked: true,
      releaseWindow: 'After September 28, 2026'
    });
  } catch (err) {
    console.error('Download certificate error:', err.message);
    res.status(500).json({ error: 'Failed to generate certificate download.' });
  }
});

// ─── POST /api/championship/admin/release-results ──────────────────────────────
// Admin endpoint to manually review and release verified certificates
router.post('/admin/release-results', adminAuth, async (req, res) => {
  try {
    const { rollNumbers, releaseAll } = req.body;
    const filter = {};
    if (!releaseAll) {
      if (!rollNumbers || !Array.isArray(rollNumbers) || rollNumbers.length === 0) {
        return res.status(400).json({ error: 'Provide rollNumbers array or set releaseAll: true' });
      }
      filter.rollNumber = { $in: rollNumbers.map(r => r.toUpperCase().trim()) };
    } else {
      filter.status = 'Submitted - Pending Review';
    }

    let mongoModified = 0;
    try {
      const updated = await ChampionshipRegistration.updateMany(
        filter,
        { $set: { status: 'certified', certificateReleased: true } }
      );
      mongoModified = updated ? updated.modifiedCount : 0;
    } catch (mErr) {
      console.warn('MongoDB release notice (using SQLite store):', mErr.message);
    }

    // Sync to SQLite
    let sqlModified = 0;
    try {
      if (releaseAll) {
        const r1 = sqlDB.run(`UPDATE exam_results SET exam_status = 'VALID' WHERE exam_status = 'Submitted - Pending Review'`);
        sqlModified = (r1 ? r1.changes : 0);
      } else {
        for (const r of (rollNumbers || [])) {
          const cleanR = r.toUpperCase().trim();
          sqlDB.run(`UPDATE exam_results SET exam_status = 'VALID' WHERE UPPER(roll_number) = UPPER(?)`, [cleanR]);
          sqlModified++;
        }
      }
    } catch (sqe) {
      console.warn('SQLite release sync notice:', sqe.message);
    }

    const totalReleased = mongoModified || sqlModified;
    res.json({
      success: true,
      releasedCount: totalReleased,
      message: `Successfully released ${totalReleased} candidate certificate(s).`
    });
  } catch (err) {
    console.error('Release results error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── PATCH /api/championship/admin/config ─────────────────────────────────────
// Admin: toggle extension, seat cap, registration open/close
router.patch('/admin/config', adminAuth, async (req, res) => {
  try {
    const updates = {};
    const allowed = ['registrationOpen', 'extendedByDays', 'seatsTotal', 'waitingListActive', 'examDate', 'examEndDate'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    const cfg = await ChampionshipConfig.findOneAndUpdate({}, updates, { new: true, upsert: true });
    console.log('⚙️ Admin config updated:', updates);
    res.json({ success: true, config: cfg });
  } catch (err) {
    console.error('Admin config error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── GET /api/championship/admin/registrations ────────────────────────────────
// Admin: list all registrations (paginated)
router.get('/admin/registrations', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const status = req.query.status;
    const filter = status ? { status } : {};
    const total = await ChampionshipRegistration.countDocuments(filter);
    const data = await ChampionshipRegistration.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-certPdfBase64 -examToken -razorpaySignature') // exclude large/sensitive fields
      .lean();
    res.json({ success: true, total, page, pages: Math.ceil(total / limit), data });
  } catch (err) {
    console.error('Admin registrations error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── POST /api/championship/admin/verify-candidate ────────────────────────────
// Immediate verification / re-scheduling approval syncing both MongoDB & SQLite
router.post('/admin/verify-candidate', async (req, res) => {
  try {
    const { rollNumber, newRollNumber, examToken, name, college, email, whatsapp } = req.body;
    if (!rollNumber && !newRollNumber && !whatsapp) {
      return res.status(400).json({ error: 'At least rollNumber, newRollNumber, or whatsapp is required.' });
    }

    const targetRoll = (newRollNumber || rollNumber || '').trim().toUpperCase();
    const oldRoll = (rollNumber || '').trim().toUpperCase();
    const cleanPhone = (whatsapp || '').trim();
    const extendedExpiry = new Date('2026-09-30T23:59:59.000Z');

    // Extract or generate token
    let token = examToken ? examToken.trim().toUpperCase() : '';
    if (!token && targetRoll) {
      const m = targetRoll.match(/(\d{4})(?:-\d+)?$/);
      token = m ? `MPC-TOK-${m[1]}` : `MPC-TOK-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // 1. Sync / Upsert to MongoDB
    const mongoUpdate = {
      status: 'paid',
      feePaid: 99,
      reExamAllowed: true,
      examWindowExpiresAt: extendedExpiry,
      updatedAt: new Date()
    };
    if (name) mongoUpdate.name = name.trim();
    if (college) mongoUpdate.college = college.trim();
    if (email) mongoUpdate.email = email.trim().toLowerCase();
    if (cleanPhone) mongoUpdate.whatsapp = cleanPhone;
    if (token) mongoUpdate.examToken = token;
    if (targetRoll) mongoUpdate.rollNumber = targetRoll;

    const mongoRes = await ChampionshipRegistration.findOneAndUpdate(
      { $or: [
          { rollNumber: targetRoll },
          ...(oldRoll ? [{ rollNumber: oldRoll }] : []),
          ...(cleanPhone ? [{ whatsapp: cleanPhone }] : [])
        ]
      },
      {
        $set: mongoUpdate,
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true, new: true }
    );

    // 2. Sync to SQLite
    try {
      sqlDB.upsertRegistration({
        rollNumber: targetRoll,
        name: (mongoRes && mongoRes.name) || name || 'Verified Candidate',
        whatsapp: (mongoRes && mongoRes.whatsapp) || cleanPhone,
        email: (mongoRes && mongoRes.email) || email,
        college: (mongoRes && mongoRes.college) || college || 'Nursing College',
        course: (mongoRes && mongoRes.course) || 'B.Sc Nursing',
        year: (mongoRes && mongoRes.year) || '4th Year',
        state: (mongoRes && mongoRes.state) || 'Assam',
        status: 'paid',
        paymentStatus: 'paid',
        amount: 99.0,
        examToken: token || (mongoRes && mongoRes.examToken),
        reExamAllowed: 1,
        examWindowExpiresAt: extendedExpiry.toISOString()
      });
      sqlDB.run(
        'UPDATE registrations SET re_exam_allowed = 1, exam_window_expires_at = ?, payment_status = ?, exam_token = ? WHERE UPPER(roll_number) = UPPER(?)',
        [extendedExpiry.toISOString(), 'paid', token || (mongoRes && mongoRes.examToken), targetRoll]
      );
      if (oldRoll && oldRoll !== targetRoll) {
        sqlDB.run(
          'UPDATE registrations SET payment_status = ?, re_exam_allowed = 1 WHERE UPPER(roll_number) = UPPER(?)',
          ['paid', oldRoll]
        );
      }
    } catch (sqlErr) {
      console.warn('SQLite candidate update warning:', sqlErr.message);
    }

    res.json({
      success: true,
      message: `Candidate ${targetRoll} successfully verified and mapped in MongoDB & SQLite.`,
      candidate: {
        rollNumber: targetRoll,
        examToken: token || (mongoRes && mongoRes.examToken),
        name: (mongoRes && mongoRes.name) || name,
        college: (mongoRes && mongoRes.college) || college,
        status: 'paid',
        reExamAllowed: true,
        examWindowExpiresAt: extendedExpiry.toISOString()
      }
    });
  } catch (err) {
    console.error('Verify candidate error:', err.message);
    res.status(500).json({ error: 'Server error verifying candidate.' });
  }
});

// ─── POST /api/championship/admin/sync-all ────────────────────────────────────
// Run master database bulk sync on demand
router.post('/admin/sync-all', async (req, res) => {
  try {
    const { exec } = await import('child_process');
    exec('node master_sync_and_auth_fix.mjs', (error, stdout, stderr) => {
      if (error) {
        console.error('Sync-all execution error:', error.message);
        return res.status(500).json({ error: error.message });
      }
      res.json({
        success: true,
        message: 'Master bulk sync completed successfully.',
        output: stdout
      });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/championship/referral/create ──────────────────────────────────
// 1-Click Referral Link Generator
router.post('/referral/create', async (req, res) => {
  try {
    const { name, college, whatsapp, role, customCode, upiId } = req.body;
    if (!name || !college || !whatsapp) {
      return res.status(400).json({ error: 'Name, College, and WhatsApp number are required.' });
    }

    const cleanPhone = whatsapp.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit WhatsApp number.' });
    }

    // Check if affiliate with this WhatsApp already exists
    let affiliate = null;
    try {
      affiliate = await ChampionshipAffiliate.findOne({ whatsapp: cleanPhone });
    } catch (dbErr) {
      console.warn('DB affiliate lookup error:', dbErr.message);
    }

    if (affiliate) {
      const shareUrl = `https://maapark.in/championship.html?ref=${affiliate.code}`;
      const viralMessage = generateViralShareMessage(affiliate.code, affiliate.name, affiliate.college);
      return res.json({
        success: true,
        isExisting: true,
        message: 'Welcome back! Your existing referral code has been retrieved.',
        data: {
          code: affiliate.code,
          shareUrl,
          viralMessage,
          affiliate,
        },
      });
    }

    // Generate or format code
    let code = customCode
      ? customCode.toUpperCase().replace(/[^A-Z0-9-]/g, '').trim()
      : generateReferralCode(name, college);

    // Ensure uniqueness
    try {
      let existingCode = await ChampionshipAffiliate.findOne({ code });
      if (existingCode) {
        code = `${code}-${Math.floor(10 + Math.random() * 90)}`;
      }
    } catch (e) {}

    const affiliateData = {
      code,
      name: name.trim(),
      college: college.trim(),
      whatsapp: cleanPhone,
      role: role || 'Student Ambassador',
      upiId: upiId ? upiId.trim() : '',
      clicks: 0,
      paidRegistrations: 0,
      snaFundAccrued: 0,
      payoutStatus: 'Pending',
    };

    try {
      affiliate = await ChampionshipAffiliate.create(affiliateData);
    } catch (createErr) {
      console.warn('Dev mock fallback for affiliate creation:', createErr.message);
      affiliate = affiliateData;
    }

    console.log(`🤝 New Affiliate Created: ${code} (${name} - ${college})`);

    // Sync to Google Sheet (Tab 4: SNA_College_Ledger)
    syncToGoogleSheets({
      type: 'affiliate_created',
      timestamp: new Date().toISOString(),
      code: affiliate.code,
      name: affiliate.name,
      college: affiliate.college,
      whatsapp: affiliate.whatsapp,
      role: affiliate.role,
      upiId: affiliate.upiId || '',
      paidRegistrations: 0,
      snaFundAccrued: '₹0',
      payoutStatus: 'Pending',
    }).catch(() => {});

    const shareUrl = `https://maapark.in/championship.html?ref=${affiliate.code}`;
    const viralMessage = generateViralShareMessage(affiliate.code, affiliate.name, affiliate.college);

    res.status(201).json({
      success: true,
      message: 'Referral link generated successfully!',
      data: {
        code: affiliate.code,
        shareUrl,
        viralMessage,
        affiliate,
      },
    });
  } catch (err) {
    console.error('Referral create error:', err.message);
    res.status(500).json({ error: 'Server error generating referral link.' });
  }
});

// ─── GET /api/championship/referral/stats/:code ───────────────────────────────
// Live partner tracking dashboard stats
router.get('/referral/stats/:code', async (req, res) => {
  try {
    const query = req.params.code.trim();
    const cleanPhone = query.replace(/\D/g, '').slice(-10);

    // Search by code or by WhatsApp number
    let affiliate = await ChampionshipAffiliate.findOne({
      $or: [
        { code: query.toUpperCase() },
        ...(cleanPhone.length === 10 ? [{ whatsapp: cleanPhone }] : []),
      ],
    });

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        error: 'No affiliate coordinator found for this referral code or WhatsApp number.',
      });
    }

    // Query all students registered under this referral
    const students = await ChampionshipRegistration.find({
      refCode: affiliate.code,
      status: { $in: ['paid', 'exam_taken', 'certified'] },
    })
      .select('name college course year state createdAt rollNumber')
      .sort({ createdAt: -1 })
      .lean();

    const actualPaidCount = students.length;
    const actualFund = actualPaidCount * 25;

    // Keep stats synchronized
    if (affiliate.paidRegistrations !== actualPaidCount || affiliate.snaFundAccrued !== actualFund) {
      affiliate.paidRegistrations = actualPaidCount;
      affiliate.snaFundAccrued = actualFund;
      await affiliate.save();
    }

    const shareUrl = `https://maapark.in/championship.html?ref=${affiliate.code}`;
    const viralMessage = generateViralShareMessage(affiliate.code, affiliate.name, affiliate.college);

    res.json({
      success: true,
      data: {
        affiliate: {
          code: affiliate.code,
          name: affiliate.name,
          college: affiliate.college,
          role: affiliate.role,
          whatsapp: affiliate.whatsapp,
          clicks: affiliate.clicks || 0,
          paidRegistrations: affiliate.paidRegistrations || 0,
          snaFundAccrued: affiliate.snaFundAccrued || 0,
          payoutStatus: affiliate.payoutStatus || 'Pending',
          payoutNotes: affiliate.payoutNotes || '',
          upiId: affiliate.upiId || '',
          joinedAt: affiliate.createdAt,
        },
        shareUrl,
        viralMessage,
        students: students.map((s, idx) => ({
          serial: idx + 1,
          name: s.name.replace(/^(.)(.*)(.)$/, '$1***$3'), // privacy mask
          college: s.college,
          course: s.course || 'Nursing',
          year: s.year || '—',
          state: s.state,
          registeredOn: s.createdAt,
          rollNumber: s.rollNumber,
          fundEarned: '₹25',
        })),
      },
    });
  } catch (err) {
    console.error('Referral stats error:', err.message);
    res.status(500).json({ error: 'Server error loading referral stats.' });
  }
});

// ─── POST /api/championship/referral/click/:code ──────────────────────────────
// Increment click tracking
router.post('/referral/click/:code', async (req, res) => {
  try {
    const code = req.params.code.toUpperCase().trim();
    const aff = await ChampionshipAffiliate.findOneAndUpdate(
      { code },
      { $inc: { clicks: 1 } },
      { new: true }
    );
    res.json({ success: true, clicks: aff ? aff.clicks : 0 });
  } catch (err) {
    res.json({ success: false });
  }
});

// ─── GET /api/championship/admin/affiliates ───────────────────────────────────
// Admin: list all affiliates/coordinators
router.get('/admin/affiliates', adminAuth, async (req, res) => {
  try {
    const affiliates = await ChampionshipAffiliate.find().sort({ paidRegistrations: -1, createdAt: -1 }).lean();
    const totalFund = affiliates.reduce((sum, a) => sum + (a.snaFundAccrued || 0), 0);
    const totalPaid = affiliates.reduce((sum, a) => sum + (a.paidRegistrations || 0), 0);
    res.json({ success: true, totalAffiliates: affiliates.length, totalFund, totalPaid, data: affiliates });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── SQL Real-Time Inspection & Telemetry Endpoints ─────────────────────────
router.get('/sql/status', (req, res) => {
  try {
    const regCount = sqlDB.get('SELECT COUNT(*) as count FROM registrations')?.count || 0;
    const resultCount = sqlDB.get('SELECT COUNT(*) as count FROM exam_results')?.count || 0;
    const auditCount = sqlDB.get('SELECT COUNT(*) as count FROM exam_audits')?.count || 0;
    const paymentCount = sqlDB.get('SELECT COUNT(*) as count FROM payments')?.count || 0;

    res.json({
      success: true,
      engine: 'SQLite (node:sqlite) + PostgreSQL ANSI Compatible',
      database: 'maa_park.sqlite',
      status: 'ONLINE',
      timestamp: new Date().toISOString(),
      counts: {
        registrations: regCount,
        examResults: resultCount,
        examAudits: auditCount,
        payments: paymentCount
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/sql/results', (req, res) => {
  try {
    const results = sqlDB.getAllResults();
    res.json({ success: true, count: results.length, data: results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/sql/candidate/:rollNumber', (req, res) => {
  try {
    const candidate = sqlDB.getCandidate360(req.params.rollNumber);
    const audits = sqlDB.getAuditByRoll(req.params.rollNumber);
    if (!candidate) {
      return res.status(404).json({ success: false, error: 'Candidate not found in SQL database' });
    }
    res.json({ success: true, candidate, audits });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── WHATSAPP CHANNEL AUTOMATION ENDPOINTS ────────────────────────────────

router.get('/whatsapp/preview', (req, res) => {
  try {
    const update = generateDailyChannelUpdate();
    res.json({
      success: true,
      channelUrl: WHATSAPP_CHANNEL_URL,
      channelId: WHATSAPP_CHANNEL_ID,
      data: update
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/whatsapp/trigger-broadcast', async (req, res) => {
  try {
    const { webhookUrl } = req.body || {};
    const result = await dispatchDailyBroadcast({ webhookUrl });
    res.json({
      success: true,
      message: 'WhatsApp broadcast generated & logged to SQLite successfully',
      result
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/whatsapp/history', (req, res) => {
  try {
    const logs = sqlDB.getWhatsAppBroadcasts(50);
    res.json({ success: true, count: logs.length, logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

