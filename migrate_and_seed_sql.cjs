// migrate_and_seed_sql.cjs
// Automated Migration & Data Population Engine for Maa Park SQL Database
// Supports Node.js native SQLite database & generates portable seeds.sql for PostgreSQL / EC2

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = path.join(__dirname, 'maa_park.sqlite');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');
const SEEDS_PATH = path.join(__dirname, 'seeds.sql');
const DATA_PATH = path.join(__dirname, 'all_sheet_data.json');

// 16 Razorpay Transaction Records
const razorpayTransactions = [
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

function escapeSQL(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val;
  if (typeof val === 'boolean') return val ? '1' : '0';
  return `'${String(val).replace(/'/g, "''")}'`;
}

async function migrate() {
  console.log('🚀 Starting Maa Park SQL Modernization Engine...\n');

  // Remove existing sqlite db to recreate clean
  if (fs.existsSync(DB_PATH)) {
    try { fs.unlinkSync(DB_PATH); } catch (e) {}
  }

  const db = new DatabaseSync(DB_PATH);
  console.log(`📦 Created clean SQLite database at: ${DB_PATH}`);

  // Read schema
  const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(schemaSql);
  console.log('✅ Applied schema.sql successfully (5 Tables + 3 Views created).');

  // Read Sheet Data
  if (!fs.existsSync(DATA_PATH)) {
    throw new Error(`Data file not found: ${DATA_PATH}`);
  }
  const sheetData = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

  const sqlDump = [];
  sqlDump.push('-- ==========================================================');
  sqlDump.push('-- MAA PARK TECHNOLOGIES — AUTOMATED SQL SEEDS DUMP');
  sqlDump.push('-- Generated on: ' + new Date().toISOString());
  sqlDump.push('-- Compatible with PostgreSQL (EC2 / RDS) and SQLite');
  sqlDump.push('-- ==========================================================\n');

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Insert College Affiliates
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n📥 Seeding College Affiliates...');
  const insertAffiliateStmt = db.prepare(`
    INSERT INTO college_affiliates (
      referral_code, coordinator_name, role, college_name, whatsapp, upi_id,
      total_registrations, fund_accrued_inr, payout_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let affCount = 0;
  for (const aff of (sheetData.affiliates || [])) {
    const code = (aff['Referral Code'] || '').trim().toUpperCase();
    if (!code) continue;

    const coord = aff['Coordinator Name'] || 'Unknown Coordinator';
    const role = aff['Role'] || 'Student Ambassador';
    const college = aff['College Name'] || 'Nursing College';
    const whatsapp = aff['WhatsApp Number'] || '';
    const upi = aff['UPI ID'] || '';
    const totalRegs = parseInt(aff['Total Registrations']) || 0;
    const fundRaw = String(aff['SNA Fund Accrued (@ ₹15)'] || '0').replace(/[^\d.]/g, '');
    const fund = parseFloat(fundRaw) || (totalRegs * 15.0);
    const payout = aff['Payout Status'] || 'Pending';

    insertAffiliateStmt.run(code, coord, role, college, whatsapp, upi, totalRegs, fund, payout);
    sqlDump.push(`INSERT INTO college_affiliates (referral_code, coordinator_name, role, college_name, whatsapp, upi_id, total_registrations, fund_accrued_inr, payout_status) VALUES (${escapeSQL(code)}, ${escapeSQL(coord)}, ${escapeSQL(role)}, ${escapeSQL(college)}, ${escapeSQL(whatsapp)}, ${escapeSQL(upi)}, ${totalRegs}, ${fund}, ${escapeSQL(payout)});`);
    affCount++;
  }
  console.log(`  -> Inserted ${affCount} College Affiliates.`);

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Insert Registrations Master
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n📥 Seeding Registrations Master (81 Rows)...');
  const insertRegStmt = db.prepare(`
    INSERT INTO registrations (
      roll_number, full_name, whatsapp, email, college, college_code,
      course, year_level, state, pricing_tier, fee_paid_inr, referral_code,
      sna_welfare_inr, razorpay_order_id, razorpay_payment_id, payment_status,
      registered_at, raw_metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let regCount = 0;
  const seenRolls = new Set();

  for (let idx = 0; idx < (sheetData.registrations || []).length; idx++) {
    const r = sheetData.registrations[idx];
    let roll = (r['Roll Number'] || '').trim().toUpperCase();
    const name = (r['Full Name'] || 'Candidate ' + (idx + 1)).trim();
    const phone = (r['WhatsApp'] || '').trim();
    const email = (r['Email'] || '').trim().toLowerCase();
    const college = (r['College'] || 'Nursing Institution').trim();
    const course = r['Course'] || 'B.Sc Nursing';
    const year = r['Year/Level'] || '4th Year';
    const state = r['State'] || 'Assam';
    const tier = r['Pricing Tier'] || 'Tier 1';
    const fee = parseFloat(String(r['Fee Paid (₹)'] || '99').replace(/[^\d.]/g, '')) || 99.0;
    const refCode = (r['Referral Code'] || '').trim().toUpperCase() || null;
    const sna = parseFloat(String(r['SNA Welfare (₹)'] || '15').replace(/[^\d.]/g, '')) || 15.0;
    const orderId = r['Razorpay Order ID'] || null;
    const paymentId = r['Razorpay Payment ID'] || null;
    let status = (r['Status'] || r['Payment Status'] || 'pending').trim().toLowerCase();

    // Fallback unique roll number if missing
    if (!roll || roll === '--') {
      roll = `MPC-2026-REG-${String(idx + 1).padStart(4, '0')}`;
    }
    if (seenRolls.has(roll)) {
      roll = `${roll}-${idx + 1}`;
    }
    seenRolls.add(roll);

    const timestamp = r['Timestamp'] || new Date().toISOString();

    insertRegStmt.run(
      roll, name, phone, email, college, null,
      course, year, state, tier, fee, refCode,
      sna, orderId, paymentId, status,
      timestamp, JSON.stringify(r)
    );

    sqlDump.push(`INSERT INTO registrations (roll_number, full_name, whatsapp, email, college, course, year_level, state, pricing_tier, fee_paid_inr, referral_code, sna_welfare_inr, razorpay_order_id, razorpay_payment_id, payment_status, registered_at) VALUES (${escapeSQL(roll)}, ${escapeSQL(name)}, ${escapeSQL(phone)}, ${escapeSQL(email)}, ${escapeSQL(college)}, ${escapeSQL(course)}, ${escapeSQL(year)}, ${escapeSQL(state)}, ${escapeSQL(tier)}, ${fee}, ${escapeSQL(refCode)}, ${sna}, ${escapeSQL(orderId)}, ${escapeSQL(paymentId)}, ${escapeSQL(status)}, ${escapeSQL(timestamp)}) ON CONFLICT (roll_number) DO NOTHING;`);
    regCount++;
  }
  console.log(`  -> Inserted ${regCount} Registrations.`);

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Insert Exam Results & Final Scorecards
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n📥 Seeding Exam Results & Scorecards...');
  const insertResultStmt = db.prepare(`
    INSERT INTO exam_results (
      roll_number, full_name, college, score, correct_count, incorrect_count,
      unattempted_count, percentage, state_rank, certificate_id, certificate_url,
      tab_switches, auto_submitted, time_spent_seconds, time_spent_formatted,
      exam_status, disqualification_reason, submitted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let resCount = 0;
  for (const s of (sheetData.scorecards || [])) {
    const roll = (s['Roll Number'] || s['Roll Number '] || '').trim().toUpperCase();
    if (!roll) continue;

    const name = s['Full Name'] || s['Full Name '] || 'Candidate';
    const college = s['College'] || s['College '] || 'Nursing College';
    const score = parseFloat(s['Course'] || s['Total Score (/60)'] || '0') || 0.0;
    const correct = parseInt(s['Year/Level'] || s['Correct (+1)'] || '0') || 0;
    const incorrect = parseInt(s['State'] || s['Incorrect (-0.25)'] || '0') || 0;
    const unattempted = parseInt(s['Fee Paid (₹)'] || s['Unattempted'] || '0') || 0;
    const percRaw = String(s['Payment Status'] || s['Percentage (%)'] || '0').replace(/[^\d.]/g, '');
    const percentage = parseFloat(percRaw) || 0.0;
    const rank = s['Referral Code'] || s['State Rank'] || '--';
    const certId = s['Payment ID / UTR'] || s['Certificate ID'] || null;
    const certUrl = s['https://maapark.in/championship-verify.html?id=CERT-MPC2026-DEMO99 https://maapark.in/championship-verify.html?id=CERT-MPC2026-42BD44 https://maapark.in/championship-verify.html?id=CERT-MPC2026-CFE42C'] || null;
    const tabSw = parseInt(s['Tab Switches'] || '0') || 0;
    const autoSub = (s['Auto Submitted'] === 'YES' || s['Auto Submitted'] === true) ? 1 : 0;
    const timeSpent = s['Time Spent (s)'] || '0 mins';
    const timestamp = s['Timestamp'] || new Date().toISOString();

    let examStatus = 'VALID';
    let disqReason = null;

    if (roll === 'MPC-2026-DEMO-0001' || tabSw >= 3) {
      examStatus = 'DISQUALIFIED';
      disqReason = `Screen switch violation limit exceeded (${tabSw} tab switches logged).`;
    } else if (roll === 'MPC-2026-RCON-1586') {
      examStatus = 'MANUAL_VERIFIED';
      disqReason = 'Paper scorecard marked for audit re-evaluation.';
    } else {
      examStatus = 'VALID';
    }

    insertResultStmt.run(
      roll, name, college, score, correct, incorrect,
      unattempted, percentage, rank, certId, certUrl,
      tabSw, autoSub, 0, timeSpent,
      examStatus, disqReason, timestamp
    );

    sqlDump.push(`INSERT INTO exam_results (roll_number, full_name, college, score, correct_count, incorrect_count, unattempted_count, percentage, state_rank, certificate_id, certificate_url, tab_switches, auto_submitted, time_spent_formatted, exam_status, disqualification_reason, submitted_at) VALUES (${escapeSQL(roll)}, ${escapeSQL(name)}, ${escapeSQL(college)}, ${score}, ${correct}, ${incorrect}, ${unattempted}, ${percentage}, ${escapeSQL(rank)}, ${escapeSQL(certId)}, ${escapeSQL(certUrl)}, ${tabSw}, ${autoSub}, ${escapeSQL(timeSpent)}, ${escapeSQL(examStatus)}, ${escapeSQL(disqReason)}, ${escapeSQL(timestamp)}) ON CONFLICT (roll_number) DO UPDATE SET score = EXCLUDED.score, exam_status = EXCLUDED.exam_status;`);
    resCount++;
  }

  // Also add Anna Jayson's specific recorded result for complete modernization
  const annaRoll = 'MPC-2026-ACON-4163';
  try {
    insertResultStmt.run(
      annaRoll, 'Anna Jayson', 'Amrita College of Nursing',
      0.0, 0, 0, 60, 0.0, 'DQ', 'CERT-MPC2026-ANNA-DQ', null,
      1, 1, 120, '2 mins', 'DISQUALIFIED',
      'Mobile edge-swipe / pinch-to-zoom multi-touch gesture false alarm triggered by anti-cheat proctor.',
      '2026-09-10T14:20:00.000Z'
    );
    sqlDump.push(`INSERT INTO exam_results (roll_number, full_name, college, score, correct_count, incorrect_count, unattempted_count, percentage, state_rank, certificate_id, tab_switches, auto_submitted, time_spent_formatted, exam_status, disqualification_reason, submitted_at) VALUES (${escapeSQL(annaRoll)}, 'Anna Jayson', 'Amrita College of Nursing', 0.0, 0, 0, 60, 0.0, 'DQ', 'CERT-MPC2026-ANNA-DQ', 1, 1, '2 mins', 'DISQUALIFIED', 'Mobile edge-swipe / pinch-to-zoom multi-touch gesture false alarm triggered by anti-cheat proctor.', '2026-09-10T14:20:00.000Z') ON CONFLICT (roll_number) DO NOTHING;`);
    resCount++;
  } catch (e) {}

  console.log(`  -> Inserted ${resCount} Exam Results.`);

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Insert Itemized Question Audits (29 Records)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n📥 Seeding Itemized Exam Audits (29 Records)...');
  const insertAuditStmt = db.prepare(`
    INSERT INTO exam_audits (
      roll_number, candidate_name, college, question_number,
      section, question_id, candidate_answer, correct_answer,
      is_correct, marks_awarded, timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let auditCount = 0;
  for (const a of (sheetData.audits || [])) {
    const roll = (a['Roll Number'] || '').trim().toUpperCase();
    const name = a['Candidate Name'] || '';
    const college = a['College'] || '';
    const qNo = parseInt(a['Q No.']) || (auditCount + 1);
    const section = a['Section'] || 'A';
    const qId = a['Question ID'] || `q${qNo}`;
    const candAns = a['Candidate Answer'] || '';
    const corrAns = a['Correct Answer'] || '';
    const isCorr = (a['Is Correct'] === 'YES' || a['Is Correct'] === true || a['Is Correct'] === '1') ? 1 : 0;
    const marks = parseFloat(a['Marks']) || (isCorr ? 1.0 : -0.25);
    const timestamp = a['Timestamp'] || new Date().toISOString();

    insertAuditStmt.run(roll, name, college, qNo, section, qId, candAns, corrAns, isCorr, marks, timestamp);
    sqlDump.push(`INSERT INTO exam_audits (roll_number, candidate_name, college, question_number, section, question_id, candidate_answer, correct_answer, is_correct, marks_awarded, timestamp) VALUES (${escapeSQL(roll)}, ${escapeSQL(name)}, ${escapeSQL(college)}, ${qNo}, ${escapeSQL(section)}, ${escapeSQL(qId)}, ${escapeSQL(candAns)}, ${escapeSQL(corrAns)}, ${isCorr}, ${marks}, ${escapeSQL(timestamp)});`);
    auditCount++;
  }
  console.log(`  -> Inserted ${auditCount} Itemized Audits.`);

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Insert Razorpay Payments (16 Transactions)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n📥 Seeding Razorpay & Direct Payment Transactions (16 Records)...');
  const insertPaymentStmt = db.prepare(`
    INSERT INTO payments (
      payment_id, order_id, amount_inr, currency, customer_phone,
      customer_email, roll_number, candidate_name, college,
      payment_status, payment_date, raw_payload
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let payCount = 0;
  for (const p of razorpayTransactions) {
    const pId = p.id;
    const amt = parseFloat(p.amount) || 99.0;
    const phone = p.phone;
    const email = p.email;
    const name = p.candidate || null;
    const college = p.college || null;
    const status = p.status || 'Captured';
    const date = p.date || '';

    insertPaymentStmt.run(
      pId, null, amt, 'INR', phone,
      email, null, name, college,
      status, date, JSON.stringify(p)
    );

    sqlDump.push(`INSERT INTO payments (payment_id, amount_inr, currency, customer_phone, customer_email, candidate_name, college, payment_status, payment_date, raw_payload) VALUES (${escapeSQL(pId)}, ${amt}, 'INR', ${escapeSQL(phone)}, ${escapeSQL(email)}, ${escapeSQL(name)}, ${escapeSQL(college)}, ${escapeSQL(status)}, ${escapeSQL(date)}, ${escapeSQL(JSON.stringify(p))}) ON CONFLICT (payment_id) DO UPDATE SET payment_status = EXCLUDED.payment_status;`);
    payCount++;
  }
  console.log(`  -> Inserted ${payCount} Payments.`);

  // Write seeds.sql for PostgreSQL / EC2
  fs.writeFileSync(SEEDS_PATH, sqlDump.join('\n'), 'utf8');
  console.log(`\n💾 Exported complete SQL migration file: ${SEEDS_PATH} (${sqlDump.length} lines)`);

  console.log('\n================================================================');
  console.log('🎉 ALL DATA FULLY MIGRATED & STORED IN RELATIONAL SQL DATABASE!');
  console.log('================================================================\n');

  // Print Summary Stats from SQLite Views
  const summaryStmt = db.prepare('SELECT * FROM v_merit_list');
  const meritRows = summaryStmt.all();
  console.log('📊 LIVE MERIT LIST FROM SQL VIEW `v_merit_list`:');
  console.table(meritRows);

  const collegeStmt = db.prepare('SELECT * FROM v_college_summary LIMIT 5');
  const collegeRows = collegeStmt.all();
  console.log('\n🏥 TOP 5 COLLEGES FROM SQL VIEW `v_college_summary`:');
  console.table(collegeRows);
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
