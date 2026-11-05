// database.js
// MongoDB connection and Mongoose models for Maa Park backend
// Replaces InsForge/PostgreSQL with MongoDB Atlas

import mongoose from 'mongoose';

// ─── Connect to MongoDB ───────────────────────────────────────────────────────

let isConnected = false;

// Set mongoose defaults
mongoose.set('bufferCommands', false);

// Connection event listeners for zero-downtime monitoring
mongoose.connection.on('connected', () => {
  isConnected = true;
  console.log('✅ MongoDB connection pool established.');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.warn('⚠️ MongoDB disconnected. Attempting automatic reconnection...');
});

mongoose.connection.on('reconnected', () => {
  isConnected = true;
  console.log('🔄 MongoDB reconnected successfully.');
});

export async function connectDB() {
  if (isConnected) return;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set. Please add it to your .env file.');
  }

  try {
    await mongoose.connect(uri, {
      dbName: 'maa_park',
      maxPoolSize: 50,
      minPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      heartbeatFrequencyMS: 10000,
    });
    isConnected = true;
    console.log('✅ Connected to MongoDB Atlas (maa_park database with pool size 50)');
  } catch (err) {
    console.error('❌ MongoDB initial connection failed:', err.message);
    throw err;
  }
}

// ─── Schema: Collaboration Messages ─────────────────────────────────────────
// Equivalent to the PostgreSQL `collaboration_messages` table

const collaborationMessageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [255, 'Name cannot exceed 255 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['new', 'read', 'replied', 'archived'],
      default: 'new',
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, // mirrors SQL column names
    collection: 'collaboration_messages', // explicit collection name
  }
);

// ─── Schema: Team Members ────────────────────────────────────────────────────
// Equivalent to the PostgreSQL `team_members` table

const teamMemberSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      trim: true,
    },
    bio: {
      type: String,
      trim: true,
    },
    image_url: {
      type: String,
      trim: true,
    },
    skills: {
      type: [String], // Array of skill strings — mirrors PostgreSQL TEXT[]
      default: [],
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'team_members',
  }
);

// ─── Models ──────────────────────────────────────────────────────────────────
// Use mongoose.models check to prevent OverwriteModelError on hot-reloads

export const CollaborationMessage =
  mongoose.models.CollaborationMessage ||
  mongoose.model('CollaborationMessage', collaborationMessageSchema);

export const TeamMember =
  mongoose.models.TeamMember ||
  mongoose.model('TeamMember', teamMemberSchema);

// ─── Schema: ChampionshipConfig ─────────────────────────────────────────────

const championshipConfigSchema = new mongoose.Schema(
  {
    seatsTotal: { type: Number, default: 500 },
    seatsFilled: { type: Number, default: 0 },
    registrationOpen: { type: Boolean, default: true },
    examDate: { type: Date, default: new Date('2026-09-13T13:30:00.000Z') },
    examEndDate: { type: Date, default: new Date('2026-09-13T14:15:00.000Z') },
    registrationStart: { type: Date, default: new Date('2026-08-20T00:00:00.000Z') },
    registrationEnd: { type: Date, default: new Date('2026-09-13T13:00:00.000Z') },
    extendedByDays: { type: Number, default: 0 },
    waitingListActive: { type: Boolean, default: false },
  },
  { collection: 'championship_config' }
);

// ─── Schema: ChampionshipRegistration ───────────────────────────────────────

const championshipRegistrationSchema = new mongoose.Schema(
  {
    rollNumber: { type: String, unique: true, sparse: true },
    name: { type: String, required: true, trim: true },
    whatsapp: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    college: { type: String, required: true, trim: true },
    collegeCode: { type: String, trim: true, uppercase: true },
    state: { type: String, required: true, trim: true },
    course: { type: String, trim: true },
    year: { type: String, trim: true },
    nursingCouncilRegNo: { type: String, trim: true },
    refCode: { type: String, trim: true, uppercase: true },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    status: {
      type: String,
      enum: ['pending', 'paid', 'exam_taken', 'certified', 'Submitted - Pending Review'],
      default: 'pending'
    },
    examToken: String,
    certificateId: { type: String, unique: true, sparse: true },
    certificateReleased: { type: Boolean, default: false },
    score: Number,
    correctCount: Number,
    incorrectCount: Number,
    rank: Number,
    certPdfBase64: String,
    tier: { type: Number, default: 1 },
    feePaid: { type: Number, default: 99 },
    snaWelfareLedgered: { type: Boolean, default: false },
    reExamAllowed: { type: Boolean, default: false },
    examWindowExpiresAt: Date,
  },
  { timestamps: true, collection: 'championship_registrations' }
);

// ─── Schema: ChampionshipQuestion ───────────────────────────────────────────

const championshipQuestionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    options: [{ id: String, text: String }],
    correctId: { type: String, required: true },
    section: { type: String, enum: ['A', 'B', 'C', 'D'], required: true },
    topic: String,
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    active: { type: Boolean, default: true },
    explanation: String,
  },
  { timestamps: true, collection: 'championship_questions' }
);

// ─── Schema: ChampionshipExamSession ────────────────────────────────────────

const championshipExamSessionSchema = new mongoose.Schema(
  {
    rollNumber: { type: String, required: true, unique: true },
    questionIds: [String],
    optionShuffles: mongoose.Schema.Types.Mixed,
    startedAt: Date,
    submittedAt: Date,
    answers: mongoose.Schema.Types.Mixed,
    marked: { type: mongoose.Schema.Types.Mixed, default: {} },
    timeSpent: { type: Number, default: 0 },
    itemizedAudit: [mongoose.Schema.Types.Mixed],
    tabSwitchCount: { type: Number, default: 0 },
    autoSubmitted: { type: Boolean, default: false },
    score: Number,
    correctCount: Number,
    incorrectCount: Number,
  },
  { timestamps: true, collection: 'championship_exam_sessions' }
);

// ─── Schema: ChampionshipAffiliate ──────────────────────────────────────────

const championshipAffiliateSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    college: { type: String, required: true, trim: true },
    whatsapp: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ['Student Ambassador', 'Faculty Coordinator', 'Principal', 'SNA Representative', 'Other'],
      default: 'Student Ambassador',
    },
    upiId: { type: String, trim: true },
    clicks: { type: Number, default: 0 },
    paidRegistrations: { type: Number, default: 0 },
    snaFundAccrued: { type: Number, default: 0 },
    payoutStatus: { type: String, enum: ['Pending', 'Processing', 'Settled'], default: 'Pending' },
    payoutNotes: String,
  },
  { timestamps: true, collection: 'championship_affiliates' }
);

export const ChampionshipConfig =
  mongoose.models.ChampionshipConfig ||
  mongoose.model('ChampionshipConfig', championshipConfigSchema);

export const ChampionshipRegistration =
  mongoose.models.ChampionshipRegistration ||
  mongoose.model('ChampionshipRegistration', championshipRegistrationSchema);

export const ChampionshipQuestion =
  mongoose.models.ChampionshipQuestion ||
  mongoose.model('ChampionshipQuestion', championshipQuestionSchema);

export const ChampionshipExamSession =
  mongoose.models.ChampionshipExamSession ||
  mongoose.model('ChampionshipExamSession', championshipExamSessionSchema);

export const ChampionshipAffiliate =
  mongoose.models.ChampionshipAffiliate ||
  mongoose.model('ChampionshipAffiliate', championshipAffiliateSchema);
