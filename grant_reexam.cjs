// grant_reexam.cjs
// Script to enable a One-Time Re-Exam window for candidates who missed the original exam slot.
// CommonJS module compatible with Node.js (.cjs)

require('dotenv').config();
const mongoose = require('mongoose');
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

async function run() {
  console.log('================================================================');
  console.log('🎓 Maa Park — One-Time Championship Re-Exam Grant Utility');
  console.log('================================================================\n');

  // Extended window: Valid for 5 days, ending strictly on September 25, 2026 (23:59:59 IST)
  const extendedExpiry = new Date('2026-09-25T23:59:59+05:30');
  console.log(`📅 Re-Exam Window Active Until: ${extendedExpiry.toISOString()}`);

  let mongoCount = 0;
  let sqliteCount = 0;

  // 1. MongoDB Atlas Update
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, { dbName: 'maa_park' });
      console.log('✅ Connected to MongoDB Atlas');

      const Registration = mongoose.models.ChampionshipRegistration || mongoose.model(
        'ChampionshipRegistration',
        new mongoose.Schema(
          {
            rollNumber: String,
            name: String,
            status: String,
            score: Number,
            reExamAllowed: Boolean,
            examWindowExpiresAt: Date,
          },
          { collection: 'championship_registrations' }
        )
      );

      const ExamSession = mongoose.models.ChampionshipExamSession || mongoose.model(
        'ChampionshipExamSession',
        new mongoose.Schema(
          {
            rollNumber: String,
            submittedAt: Date,
            score: Number,
          },
          { collection: 'championship_exam_sessions' }
        )
      );

      // Find candidates who have paid/registered but NOT completed a valid exam
      const unattempted = await Registration.find({
        status: { $in: ['paid', 'registered'] },
        $or: [{ score: { $exists: false } }, { score: null }],
      });

      console.log(`📋 Found ${unattempted.length} candidate(s) in MongoDB eligible for Re-Exam.`);

      for (const cand of unattempted) {
        // Clear any stale unsubmitted session so candidate starts fresh
        await ExamSession.deleteOne({ rollNumber: cand.rollNumber, submittedAt: null });

        cand.status = 'paid';
        cand.reExamAllowed = true;
        cand.examWindowExpiresAt = extendedExpiry;
        await cand.save();
        mongoCount++;
        console.log(`   ✔ [MongoDB] Enabled Re-Exam: ${cand.rollNumber} — ${cand.name}`);
      }
    } catch (mongoErr) {
      console.warn('⚠️ MongoDB Notice:', mongoErr.message);
    }
  } else {
    console.log('ℹ️ MONGODB_URI not configured, skipping MongoDB step.');
  }

  // 2. SQLite Database Update (maa_park.sqlite)
  try {
    const dbPath = path.join(__dirname, 'maa_park.sqlite');
    const db = new DatabaseSync(dbPath);
    db.exec('PRAGMA journal_mode = WAL;');

    // Add columns if they do not exist
    try {
      db.exec('ALTER TABLE registrations ADD COLUMN re_exam_allowed BOOLEAN DEFAULT 0;');
    } catch (e) {}
    try {
      db.exec('ALTER TABLE registrations ADD COLUMN exam_window_expires_at TIMESTAMP;');
    } catch (e) {}

    // Find candidates who registered/paid but have no valid score in exam_results
    const eligibleSql = db
      .prepare(`
        SELECT r.roll_number, r.full_name
        FROM registrations r
        LEFT JOIN exam_results e ON UPPER(r.roll_number) = UPPER(e.roll_number)
        WHERE (r.payment_status = 'Captured' OR r.payment_status = 'paid' OR r.payment_status = 'pending')
          AND (e.id IS NULL OR e.exam_status = 'DISQUALIFIED' OR e.score IS NULL);
      `)
      .all();

    console.log(`\n📋 Found ${eligibleSql.length} candidate(s) in SQLite eligible for Re-Exam.`);

    const updateStmt = db.prepare(`
      UPDATE registrations 
      SET re_exam_allowed = 1,
          exam_window_expires_at = ?
      WHERE UPPER(roll_number) = UPPER(?);
    `);

    for (const c of eligibleSql) {
      updateStmt.run(extendedExpiry.toISOString(), c.roll_number);
      sqliteCount++;
      console.log(`   ✔ [SQLite] Enabled Re-Exam: ${c.roll_number} — ${c.full_name}`);
    }
  } catch (sqlErr) {
    console.warn('⚠️ SQLite Notice:', sqlErr.message);
  }

  console.log('\n================================================================');
  console.log(`🎉 SUCCESS: Re-Exam permissions activated!`);
  console.log(`   MongoDB candidates updated: ${mongoCount}`);
  console.log(`   SQLite candidates updated:  ${sqliteCount}`);
  console.log('================================================================\n');

  if (mongoose.connection && mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
  }
  process.exit(0);
}

run();
