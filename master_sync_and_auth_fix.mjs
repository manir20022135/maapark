import 'dotenv/config';
import fs from 'fs';
import sqlDB from './database_sql.js';
import { connectDB, ChampionshipRegistration } from './database.js';

function extractOrGenerateToken(rollNumber) {
  if (!rollNumber) return 'MPC-TOK-2026';
  const clean = rollNumber.trim().toUpperCase();
  if (clean.includes('DEMO')) return 'DEMO-EXAM-TOKEN-2026';
  
  const m = clean.match(/(\d{4})(?:-\d+)?$/);
  if (m) {
    return `MPC-TOK-${m[1]}`;
  }
  const m2 = clean.match(/(\d{3,4})/g);
  if (m2 && m2.length > 0) {
    return `MPC-TOK-${m2[m2.length - 1].padStart(4, '0')}`;
  }
  return `MPC-TOK-${Math.floor(1000 + Math.random() * 9000)}`;
}

async function runMasterSync() {
  console.log('🚀 Running Master Database Bulk-Sync & Auth Mapping...');
  await connectDB();

  // Read latest sheet data
  const dataPath = 'all_sheet_data.json';
  if (!fs.existsSync(dataPath)) {
    throw new Error('all_sheet_data.json not found');
  }
  const sheetData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const registrations = sheetData.registrations || [];
  console.log(`📥 Total registrations in sheet: ${registrations.length}`);

  // Extended window until Sep 30, 2026
  const extendedExpiry = new Date('2026-09-30T23:59:59.000Z');

  let updatedMongo = 0;
  let updatedSql = 0;

  // Track verified candidate mapping by phone and roll
  const phoneToVerifiedRoll = new Map();

  // Pass 1: Identify all confirmed/verified roll numbers for each phone
  for (const r of registrations) {
    const roll = (r['Roll Number'] || '').trim().toUpperCase();
    const phone = (r['WhatsApp'] || '').replace(/\D/g, '').slice(-10);
    const fee = String(r['Fee Paid (₹)'] || '');
    const status = (r['Status'] || r['Payment Status'] || '').toLowerCase();
    const pId = (r['Razorpay Payment ID'] || '').toLowerCase();

    const isVerified = (!roll.startsWith('PENDING') && roll.startsWith('MPC-2026')) ||
                       fee.includes('99') ||
                       status.includes('paid') ||
                       status.includes('rzp') ||
                       pId.includes('pay') ||
                       pId.includes('ord-claim') ||
                       pId.includes('oksbi') ||
                       /^\d{10,}/.test(status);

    if (phone && isVerified && !roll.startsWith('PENDING') && roll.startsWith('MPC-2026')) {
      phoneToVerifiedRoll.set(phone, roll);
    }
  }

  console.log(`📌 Found ${phoneToVerifiedRoll.size} confirmed phone-to-roll mappings:`, Object.fromEntries(phoneToVerifiedRoll));

  // Pass 2: Process all registrations into MongoDB and SQLite
  for (let i = 0; i < registrations.length; i++) {
    const r = registrations[i];
    let roll = (r['Roll Number'] || '').trim().toUpperCase();
    if (!roll || roll === '--') continue;

    const name = (r['Full Name'] || 'Candidate').trim();
    const phone = (r['WhatsApp'] || '').trim();
    const normPhone = phone.replace(/\D/g, '').slice(-10);
    const email = (r['Email'] || '').trim().toLowerCase();
    const college = (r['College'] || 'Nursing Institution').trim();
    const course = r['Course'] || 'B.Sc Nursing';
    const year = r['Year/Level'] || '4th Year';
    const state = r['State'] || 'Assam';
    const rawStatus = (r['Status'] || r['Payment Status'] || '').trim();
    const pId = (r['Razorpay Payment ID'] || '').trim();
    const fee = String(r['Fee Paid (₹)'] || '');

    // Check if verified
    const isPaidOrVerified = (!roll.startsWith('PENDING') && roll.startsWith('MPC-2026')) ||
                            fee.includes('99') ||
                            rawStatus.toLowerCase().includes('paid') ||
                            rawStatus.toLowerCase().includes('rzp') ||
                            pId.toLowerCase().includes('pay') ||
                            pId.toLowerCase().includes('ord-claim') ||
                            pId.toLowerCase().includes('oksbi') ||
                            /^\d{10,}/.test(rawStatus) ||
                            phoneToVerifiedRoll.has(normPhone);

    const targetStatus = isPaidOrVerified ? 'paid' : 'pending';
    const token = extractOrGenerateToken(roll);

    // 1. Update MongoDB Atlas
    try {
      const updateDoc = {
        name,
        whatsapp: phone,
        email,
        college,
        course,
        year,
        state,
        status: targetStatus,
        feePaid: isPaidOrVerified ? 99 : 0,
        examToken: token,
        reExamAllowed: true,
        examWindowExpiresAt: extendedExpiry,
        razorpayPaymentId: pId || null,
        updatedAt: new Date()
      };

      await ChampionshipRegistration.updateOne(
        { rollNumber: roll },
        {
          $set: updateDoc,
          $setOnInsert: { rollNumber: roll, createdAt: new Date(r['Timestamp'] || Date.now()) }
        },
        { upsert: true }
      );
      updatedMongo++;

      // If this phone has a verified roll and current roll is PENDING-, link or also ensure the verified roll exists
      if (phoneToVerifiedRoll.has(normPhone)) {
        const verifiedRoll = phoneToVerifiedRoll.get(normPhone);
        const verifiedToken = extractOrGenerateToken(verifiedRoll);
        await ChampionshipRegistration.updateOne(
          { rollNumber: verifiedRoll },
          {
            $set: {
              name,
              whatsapp: phone,
              email,
              college,
              course,
              year,
              state,
              status: 'paid',
              feePaid: 99,
              examToken: verifiedToken,
              reExamAllowed: true,
              examWindowExpiresAt: extendedExpiry,
              updatedAt: new Date()
            },
            $setOnInsert: { rollNumber: verifiedRoll, createdAt: new Date() }
          },
          { upsert: true }
        );
      }
    } catch (mErr) {
      console.warn(`MongoDB update warning for ${roll}:`, mErr.message);
    }

    // 2. Update SQLite Database
    try {
      sqlDB.upsertRegistration({
        rollNumber: roll,
        name,
        whatsapp: phone,
        email,
        college,
        course,
        year,
        state,
        status: targetStatus,
        paymentStatus: isPaidOrVerified ? 'paid' : 'pending',
        amount: isPaidOrVerified ? 99.0 : 0.0,
        razorpayPaymentId: pId || null,
        examToken: token,
        reExamAllowed: 1,
        examWindowExpiresAt: extendedExpiry.toISOString()
      });
      sqlDB.run(
        'UPDATE registrations SET re_exam_allowed = 1, exam_window_expires_at = ?, payment_status = ? WHERE UPPER(roll_number) = UPPER(?)',
        [extendedExpiry.toISOString(), isPaidOrVerified ? 'paid' : 'pending', roll]
      );
      updatedSql++;
    } catch (sErr) {
      console.warn(`SQLite update warning for ${roll}:`, sErr.message);
    }
  }

  console.log(`\n✅ MongoDB Sync: ${updatedMongo} records updated/upserted`);
  console.log(`✅ SQLite Sync: ${updatedSql} records updated/upserted`);

  // Verify Baia Monlang Kasar specifically
  const baiaMongo = await ChampionshipRegistration.findOne({ rollNumber: 'MPC-2026-AIONE-5732' }).lean();
  console.log('\n🔍 Verification check for Baia Monlang Kasar in MongoDB:');
  console.log(baiaMongo ? {
    roll: baiaMongo.rollNumber,
    name: baiaMongo.name,
    status: baiaMongo.status,
    token: baiaMongo.examToken,
    reExam: baiaMongo.reExamAllowed,
    expiresAt: baiaMongo.examWindowExpiresAt
  } : 'NOT FOUND IN MONGO');

  const baiaSql = sqlDB.getRegistrationByRoll('MPC-2026-AIONE-5732');
  console.log('🔍 Verification check for Baia Monlang Kasar in SQLite:');
  console.log(baiaSql ? {
    roll: baiaSql.roll_number,
    name: baiaSql.full_name,
    status: baiaSql.payment_status,
    token: baiaSql.exam_token,
    reExam: baiaSql.re_exam_allowed,
    expiresAt: baiaSql.exam_window_expires_at
  } : 'NOT FOUND IN SQLITE');
}

runMasterSync().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
