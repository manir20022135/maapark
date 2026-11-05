// sync_to_atlas.cjs
// Synchronizes SQLite / Sheets data directly into MongoDB Atlas / EC2 MongoDB
// Run: node sync_to_atlas.cjs

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config();
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, 'all_sheet_data.json');
const URI = 'mongodb://hussainmanirul9_db_user:AsDVHjQ76on2wmXy@ac-ak5x6ko-shard-00-00.084erjb.mongodb.net:27017,ac-ak5x6ko-shard-00-01.084erjb.mongodb.net:27017,ac-ak5x6ko-shard-00-02.084erjb.mongodb.net:27017/maa_park?replicaSet=atlas-jxrcq0-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0';

async function sync() {
  console.log('🔄 Connecting to MongoDB Atlas with TLS bypass...\n');

  const client = new MongoClient(URI, {
    serverSelectionTimeoutMS: 15000,
    tls: true,
    tlsAllowInvalidCertificates: true,
    tlsAllowInvalidHostnames: true,
  });

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas successfully!\n');

    const db = client.db('maa_park');

    if (!fs.existsSync(DATA_PATH)) {
      throw new Error(`Data file not found: ${DATA_PATH}`);
    }
    const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

    // 1. Sync Registrations
    const regCol = db.collection('championship_registrations');
    console.log(`📥 Syncing ${data.registrations.length} registrations to MongoDB collection 'championship_registrations'...`);
    let regCount = 0;
    for (let idx = 0; idx < data.registrations.length; idx++) {
      const r = data.registrations[idx];
      let roll = (r['Roll Number'] || '').trim().toUpperCase();
      if (!roll || roll === '--') roll = `MPC-2026-REG-${String(idx + 1).padStart(4, '0')}`;

      await regCol.updateOne(
        { rollNumber: roll },
        {
          $set: {
            rollNumber: roll,
            name: (r['Full Name'] || '').trim(),
            whatsapp: (r['WhatsApp'] || '').trim(),
            email: (r['Email'] || '').trim().toLowerCase(),
            college: (r['College'] || '').trim(),
            course: r['Course'] || 'B.Sc Nursing',
            year: r['Year/Level'] || '4th Year',
            state: r['State'] || 'Assam',
            feePaid: parseFloat(String(r['Fee Paid (₹)'] || '99').replace(/[^\d.]/g, '')) || 99,
            refCode: (r['Referral Code'] || '').trim().toUpperCase() || null,
            status: (r['Status'] || r['Payment Status'] || 'pending').toLowerCase(),
            razorpayOrderId: r['Razorpay Order ID'] || null,
            razorpayPaymentId: r['Razorpay Payment ID'] || null,
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date(r['Timestamp'] || Date.now()) }
        },
        { upsert: true }
      );
      regCount++;
    }
    console.log(`✅ ${regCount} Registrations upserted into MongoDB.`);

    // 2. Sync Affiliates
    const affCol = db.collection('championship_affiliates');
    console.log(`\n📥 Syncing ${data.affiliates.length} affiliates to MongoDB collection 'championship_affiliates'...`);
    let affCount = 0;
    for (const a of data.affiliates) {
      const code = (a['Referral Code'] || '').trim().toUpperCase();
      if (!code) continue;
      await affCol.updateOne(
        { code },
        {
          $set: {
            code,
            name: a['Coordinator Name'] || '',
            college: a['College Name'] || '',
            whatsapp: a['WhatsApp Number'] || '',
            upiId: a['UPI ID'] || '',
            totalRegistrations: parseInt(a['Total Registrations']) || 0,
            snaFundAccrued: parseFloat(String(a['SNA Fund Accrued (@ ₹15)'] || '0').replace(/[^\d.]/g, '')) || 0,
            payoutStatus: a['Payout Status'] || 'Active',
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date(a['Created At'] || Date.now()) }
        },
        { upsert: true }
      );
      affCount++;
    }
    console.log(`✅ ${affCount} Affiliates upserted into MongoDB.`);

    // 3. Sync Scorecards
    const sessCol = db.collection('championship_exam_sessions');
    console.log(`\n📥 Syncing ${data.scorecards.length} scorecards to MongoDB collection 'championship_exam_sessions'...`);
    let scoreCount = 0;
    for (const s of data.scorecards) {
      const roll = (s['Roll Number'] || s['Roll Number '] || '').trim().toUpperCase();
      if (!roll) continue;
      await sessCol.updateOne(
        { rollNumber: roll },
        {
          $set: {
            rollNumber: roll,
            score: parseFloat(s['Course'] || s['Total Score (/60)'] || '0') || 0,
            correctCount: parseInt(s['Year/Level'] || s['Correct (+1)'] || '0') || 0,
            incorrectCount: parseInt(s['State'] || s['Incorrect (-0.25)'] || '0') || 0,
            tabSwitchCount: parseInt(s['Tab Switches'] || '0') || 0,
            autoSubmitted: s['Auto Submitted'] === 'YES',
            certificateId: s['Payment ID / UTR'] || s['Certificate ID'] || null,
            updatedAt: new Date(),
          },
          $setOnInsert: { submittedAt: new Date(s['Timestamp'] || Date.now()) }
        },
        { upsert: true }
      );
      scoreCount++;
    }
    console.log(`✅ ${scoreCount} Exam Scorecards upserted into MongoDB.`);

    // 4. Sync Payments
    const payCol = db.collection('championship_payments');
    console.log(`\n📥 Syncing Razorpay & payment transactions to MongoDB collection 'championship_payments'...`);
    const razorpayList = [
      { id: 'pay_Ta2sIvJ1wZ7aIC', amount: '99', phone: '9971664621', email: 'annajaysonpcb@oksbi', date: 'Sep 10, 2026', status: 'Captured', candidate: 'Anna Jayson', college: 'Amrita College of Nursing' },
      { id: 'pay_TVVk75Y9TmPaTc', amount: '99', phone: '9007866960', email: 'alankita.das@gmail.com', date: 'Aug 29, 2026', status: 'Captured', candidate: 'Alankita Das', college: 'Sikkim Manipal College of Nursing' },
      { id: 'pay_TVVeGzJvWbbDzj', amount: '99', phone: '9007866960', email: 'alankita.das@gmail.com', date: 'Aug 29, 2026', status: 'Captured', candidate: 'Alankita Das (Duplicate)', college: 'Sikkim Manipal College of Nursing' },
      { id: 'pay_TVEGkJ89Oew8BZ', amount: '99', phone: '9863187436', email: 'void@razorpay.com', date: 'Aug 28, 2026', status: 'Failed', candidate: '', college: '' },
      { id: 'pay_TVDO0dnG6Fosf9', amount: '99', phone: '7629893520', email: 'patiancheansilsg@gmail.com', date: 'Aug 28, 2026', status: 'Captured', candidate: 'Nikita Daimari', college: 'Dispur Nursing Institute' },
      { id: 'pay_TV23gcSQ3ilW0j', amount: '99', phone: '9101726509', email: 'void@razorpay.com', date: 'Aug 28, 2026', status: 'Captured', candidate: 'Verified Student', college: 'Dispur Nursing Institute' },
      { id: 'pay_TUe9qhcmqnvNAe', amount: '99', phone: '9365965167', email: 'void@razorpay.com', date: 'Aug 27, 2026', status: 'Captured', candidate: 'Rubiya Yasmin', college: 'Dispur Nursing Institute' },
      { id: 'pay_TUVLJ99EDZthy3', amount: '99', phone: '9859090635', email: 'kushal91b@gmail.com', date: 'Aug 27, 2026', status: 'Captured', candidate: 'Rubi Begam', college: 'Dispur Nursing Institute' },
      { id: 'pay_TUT3aiL0udzBck', amount: '99', phone: '6000931509', email: 'void@razorpay.com', date: 'Aug 26, 2026', status: 'Failed', candidate: 'Momi Das', college: 'Dispur Nursing Institute' },
      { id: 'pay_TUP8sfU2B03E2i', amount: '99', phone: '7085352692', email: 'void@razorpay.com', date: 'Aug 26, 2026', status: 'Captured', candidate: 'Baia Monlang Kasar', college: 'Asian Institute of Nursing Education' },
      { id: 'pay_TULV4RtDk0K9Hk', amount: '99', phone: '9395273750', email: 'void@razorpay.com', date: 'Aug 26, 2026', status: 'Captured', candidate: 'Arpitha Deb', college: 'Regional College of Nursing' },
      { id: 'pay_TULD9hju4FQhk7', amount: '99', phone: '8472938620', email: 'void@razorpay.com', date: 'Aug 26, 2026', status: 'Captured', candidate: 'Abu Shaid Ahsanul Haque', college: 'Hayat Institute of Nursing Education' },
      { id: 'pay_TULAbw0P1VN0qI', amount: '99', phone: '8472938620', email: 'void@razorpay.com', date: 'Aug 26, 2026', status: 'Failed', candidate: 'Abu Shaid (Retry)', college: 'Hayat Institute of Nursing Education' },
      { id: 'pay_TULA8cyT6FIMTR', amount: '99', phone: '8472938620', email: 'void@razorpay.com', date: 'Aug 26, 2026', status: 'Failed', candidate: 'Abu Shaid (Retry 2)', college: 'Hayat Institute of Nursing Education' },
      { id: 'pay_TUKbXGCuaj8ZGt', amount: '99', phone: '6001220466', email: 'void@razorpay.com', date: 'Aug 26, 2026', status: 'Captured', candidate: 'Heisnam Sangita Devi', college: 'CPMS College of Nursing' },
      { id: 'pay_TUJUhuZEAJiumX', amount: '99', phone: '7577883676', email: 'void@razorpay.com', date: 'Aug 26, 2026', status: 'Failed', candidate: 'Julfikar Ali (Test)', college: 'Royal School of Nursing' },
    ];
    for (const p of razorpayList) {
      await payCol.updateOne(
        { paymentId: p.id },
        {
          $set: {
            paymentId: p.id,
            amount: parseFloat(p.amount) || 99,
            currency: 'INR',
            phone: p.phone,
            email: p.email,
            candidateName: p.candidate || null,
            college: p.college || null,
            status: p.status,
            paymentDate: p.date,
            updatedAt: new Date()
          },
          $setOnInsert: { createdAt: new Date() }
        },
        { upsert: true }
      );
    }
    console.log(`✅ ${razorpayList.length} Payment records synced to MongoDB.`);

    // 5. Sync Itemized Question Audits
    const auditCol = db.collection('championship_itemized_audits');
    console.log(`\n📥 Syncing ${(data.audits || []).length} itemized exam audits to MongoDB...`);
    for (const a of (data.audits || [])) {
      const roll = (a['Roll Number'] || '').trim().toUpperCase();
      const qNo = parseInt(a['Q No.']) || 0;
      await auditCol.updateOne(
        { rollNumber: roll, questionNumber: qNo },
        {
          $set: {
            rollNumber: roll,
            candidateName: a['Candidate Name'] || '',
            college: a['College'] || '',
            questionNumber: qNo,
            section: a['Section'] || 'A',
            questionId: a['Question ID'] || `q${qNo}`,
            candidateAnswer: a['Candidate Answer'] || '',
            correctAnswer: a['Correct Answer'] || '',
            isCorrect: a['Is Correct'] === 'YES' || a['Is Correct'] === true,
            marks: parseFloat(a['Marks']) || 0,
            timestamp: new Date(a['Timestamp'] || Date.now()),
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );
    }
    console.log(`✅ ${(data.audits || []).length} Question audits synced to MongoDB.`);

    // Check final counts in Atlas
    console.log('\n📊 VERIFYING DOCUMENT COUNTS IN MONGODB ATLAS:');
    const cols = await db.listCollections().toArray();
    for (const c of cols) {
      const cnt = await db.collection(c.name).countDocuments();
      console.log(`   • ${c.name.padEnd(30)}: ${cnt} documents`);
    }

    console.log('\n🎉 ALL DATA HAS BEEN SAVED TO MONGODB ATLAS SUCCESSFULLY!\n');
    await client.close();
  } catch (err) {
    console.error('❌ MongoDB Atlas connection error:', err.message);
  }
}

sync();
