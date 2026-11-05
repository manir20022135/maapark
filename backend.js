// backend.js
// Maa Park — Express.js REST API for AWS EC2
// Database: MongoDB Atlas via Mongoose (replaces InsForge/PostgreSQL)
// 
// SETUP:
//   1. Copy .env.example to .env and fill in your values
//   2. npm install
//   3. node backend.js
//
// ENDPOINTS:
//   POST /api/collaborate     → Save a collaboration inquiry
//   GET  /api/collaborate     → List all messages (admin use)
//   GET  /api/team            → List all team members
//   POST /api/team            → Add a team member (admin use)
//   GET  /health              → Health check

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB, CollaborationMessage, TeamMember } from './database.js';
import championshipRouter from './championship-routes.js';
import growthRouter from './growth-loop-routes.js';
import ambassadorRouter from './ambassador-routes.js';
import { initDailyScheduler, WHATSAPP_CHANNEL_URL } from './whatsapp-channel-bot.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────────────────────

// Allow requests from your S3/CloudFront website URL
// In production, replace '*' with your actual domain, e.g.:
// 'https://your-bucket.s3-website-us-east-1.amazonaws.com'
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['*'];

app.use(cors({
  origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
  methods: ['GET', 'POST', 'PATCH'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json());
app.use(express.static('.'));

// ─── Clean Frontend Route Aliases ─────────────────────────────────────────────
app.get(['/championship', '/championship/partner'], (req, res) => {
  res.sendFile(path.join(__dirname, 'championship.html'));
});

app.get(['/championship/exam', '/championship/exam-room'], (req, res) => {
  res.sendFile(path.join(__dirname, 'championship-exam.html'));
});

// ── Growth Loop Routes ────────────────────────────────────────────────────────
app.get(['/quiz', '/championship/quiz'], (req, res) => {
  res.sendFile(path.join(__dirname, 'quiz-teaser.html'));
});

app.use('/api/growth', growthRouter);

app.get(['/verify/:id', '/championship/verify/:id', '/championship/verify'], (req, res) => {
  res.sendFile(path.join(__dirname, 'championship-verify.html'));
});

app.get(['/whatsapp-manager', '/championship/whatsapp', '/whatsapp'], (req, res) => {
  res.sendFile(path.join(__dirname, 'whatsapp-manager.html'));
});

app.get(['/api/certificate/download/:id', '/certificate/download/:id'], (req, res) => {
  res.redirect(`/api/championship/certificate/download/${encodeURIComponent(req.params.id)}`);
});

app.use('/api/championship', championshipRouter);

// ── Brand Ambassador & App Promotion Campaign Routes ─────────────────────────
app.get(['/ambassador', '/ambassador.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'ambassador.html'));
});

app.get(['/admin/ambassadors', '/admin/ambassador', '/admin-ambassadors.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'admin-ambassadors.html'));
});

app.get(['/ambassador/terms', '/ambassador/privacy', '/ambassador/refund', '/ambassador/policies', '/ambassador-policies.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'ambassador-policies.html'));
});

app.use('/api/ambassador', ambassadorRouter);

// ─── Health Check ─────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok', project: 'Maa Park', timestamp: new Date().toISOString() });
});

// ─── Collaboration Messages ───────────────────────────────────────────────────

/**
 * POST /api/collaborate
 * Body: { name, email, message }
 * Saves a new collaboration inquiry from the website's contact form.
 */
app.post('/api/collaborate', async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // Basic validation
    if (!name || !email || !message) {
      return res.status(400).json({
        error: 'Missing required fields: name, email, and message are required.'
      });
    }

    const doc = await CollaborationMessage.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      message: message.trim(),
      status: 'new',
    });

    console.log(`📬 New collaboration message from ${doc.name} (${doc.email})`);

    res.status(201).json({
      success: true,
      message: 'Your message has been received. We will get back to you soon!',
      id: doc._id,
    });
  } catch (err) {
    console.error('❌ Error saving collaboration message:', err.message);

    // Handle Mongoose validation errors
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ error: messages.join(', ') });
    }

    res.status(500).json({ error: 'Server error. Please try again later.' });
  }
});

/**
 * GET /api/collaborate
 * Returns all collaboration messages (for admin use).
 * In production, add authentication middleware before this route.
 */
app.get('/api/collaborate', async (req, res) => {
  try {
    const messages = await CollaborationMessage.find()
      .sort({ created_at: -1 })  // newest first
      .lean();

    res.json({ success: true, count: messages.length, data: messages });
  } catch (err) {
    console.error('❌ Error fetching messages:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── Team Members ─────────────────────────────────────────────────────────────

/**
 * GET /api/team
 * Returns all team members (publicly accessible).
 */
app.get('/api/team', async (req, res) => {
  try {
    const members = await TeamMember.find().sort({ created_at: 1 }).lean();
    res.json({ success: true, count: members.length, data: members });
  } catch (err) {
    console.error('❌ Error fetching team members:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * POST /api/team
 * Body: { name, role, bio, image_url, skills[] }
 * Adds a new team member (admin use — add auth in production).
 */
app.post('/api/team', async (req, res) => {
  try {
    const { name, role, bio, image_url, skills } = req.body;

    if (!name || !role) {
      return res.status(400).json({ error: 'name and role are required.' });
    }

    const member = await TeamMember.create({ name, role, bio, image_url, skills: skills || [] });

    res.status(201).json({ success: true, data: member });
  } catch (err) {
    console.error('❌ Error creating team member:', err.message);

    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ error: messages.join(', ') });
    }

    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

// ─── Start Server ─────────────────────────────────────────────────────────────

async function start() {
  // Start HTTP listener immediately so localhost frontend and static files are always accessible
  app.listen(PORT, () => {
    console.log(`🚀 Maa Park Local Server running on port ${PORT}`);
    console.log(`   🌐 Landing Page: http://localhost:${PORT}/championship.html`);
    console.log(`   📝 Exam Room:    http://localhost:${PORT}/championship-exam.html`);
    console.log(`   🔍 Verification: http://localhost:${PORT}/championship-verify.html`);
    console.log(`   🏠 Main Site:    http://localhost:${PORT}/index.html`);
    console.log(`   🎯 Quiz Teaser:  http://localhost:${PORT}/quiz`);
    console.log(`   🌟 Ambassador:   http://localhost:${PORT}/ambassador`);
    console.log(`   👑 Amb Admin:    http://localhost:${PORT}/admin/ambassadors`);
    console.log(`   🔗 Growth API:   http://localhost:${PORT}/api/growth/social-proof`);
    console.log(`   💚 Health check: http://localhost:${PORT}/health`);
  });

  // Attempt database connection in background
  try {
    await connectDB();
    console.log('✅ MongoDB Atlas connected successfully');
  } catch (err) {
    console.warn('⚠️ MongoDB connection warning (check IP whitelist in Atlas if using live DB):', err.message);
  }

  // Initialize Automated Daily WhatsApp Channel Scheduler
  try {
    initDailyScheduler();
    console.log(`✅ Automated WhatsApp Channel Scheduler active for ${WHATSAPP_CHANNEL_URL}`);
  } catch (err) {
    console.warn('⚠️ WhatsApp scheduler notice:', err.message);
  }
}

start();
