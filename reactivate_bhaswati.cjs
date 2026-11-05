// reactivate_bhaswati.cjs
// Re-activates candidate Bhaswati Baishya in SQLite and MongoDB, resetting any disqualified status

const { DatabaseSync } = require('node:sqlite');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

console.log('🔄 Re-activating Bhaswati Baishya...');

// 1. SQLite maa_park.sqlite
try {
  const db = new DatabaseSync(path.join(__dirname, 'maa_park.sqlite'));
  
  // Remove any disqualified / completed record from exam_results
  const delResults = db.prepare("DELETE FROM exam_results WHERE UPPER(roll_number) LIKE '%1586%' OR UPPER(roll_number) LIKE '%8638%' OR UPPER(full_name) LIKE '%BHASWATI%'").run();
  console.log(`✅ SQLite exam_results cleared: ${delResults.changes} row(s) deleted.`);
  
  // Clear any audit records
  const delAudits = db.prepare("DELETE FROM exam_audits WHERE UPPER(roll_number) LIKE '%1586%' OR UPPER(roll_number) LIKE '%8638%'").run();
  console.log(`✅ SQLite exam_audits cleared: ${delAudits.changes} row(s) deleted.`);

  // Update registrations
  const updReg = db.prepare(`
    UPDATE registrations 
    SET payment_status = 'paid', 
        re_exam_allowed = 1, 
        whatsapp = '8638032878',
        exam_window_expires_at = '2026-10-05T23:59:59.000Z'
    WHERE UPPER(roll_number) LIKE '%1586%' OR UPPER(email) LIKE '%BHASWATI%' OR UPPER(full_name) LIKE '%BHASWATI%'
  `).run();
  console.log(`✅ SQLite registrations updated: ${updReg.changes} row(s) updated.`);

  const currentReg = db.prepare("SELECT roll_number, full_name, whatsapp, email, payment_status, re_exam_allowed, exam_token FROM registrations WHERE UPPER(full_name) LIKE '%BHASWATI%'").all();
  console.log('Current SQLite rows for Bhaswati:', currentReg);
} catch (err) {
  console.error('❌ SQLite error:', err);
}

// 2. MongoDB Atlas
const MONGODB_URI = 'mongodb+srv://user_db:Password123@cluster0.p1bfeee.mongodb.net/maapark?retryWrites=true&w=majority';
mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 }).then(async () => {
  console.log('✅ Connected to MongoDB Atlas');
  try {
    const coll = mongoose.connection.db.collection('championshipregistrations');
    const res = await coll.updateMany(
      {
        $or: [
          { rollNumber: /1586/i },
          { email: /bhaswatibaishya/i },
          { name: /Bhaswati/i }
        ]
      },
      {
        $set: {
          status: 'paid',
          reExamAllowed: true,
          isDisqualified: false,
          disqualified: false,
          disqualificationReason: null,
          examStatus: 'not_started',
          attemptCount: 0,
          examWindowExpiresAt: new Date('2026-10-05T23:59:59.000Z'),
          phone: '8638032878',
          whatsapp: '8638032878'
        },
        $unset: {
          submittedAt: "",
          score: "",
          percentage: "",
          tabSwitches: ""
        }
      }
    );
    console.log(`✅ MongoDB championshipregistrations updated: matched ${res.matchedCount}, modified ${res.modifiedCount}`);
  } catch (mErr) {
    console.warn('MongoDB update note:', mErr.message);
  }
  process.exit(0);
}).catch(err => {
  console.warn('MongoDB connection note (offline or DNS):', err.message);
  process.exit(0);
});
