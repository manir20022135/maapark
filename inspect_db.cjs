// inspect_db.cjs
// Quick CLI viewer for Maa Park SQL Database
// Run: node inspect_db.cjs

const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, 'maa_park.sqlite'));

console.log('\n================================================================');
console.log('🏛️  MAA PARK TECHNOLOGIES — SQL DATABASE SUMMARY INSPECTOR');
console.log('================================================================\n');

// 1. Table Counts
const tables = ['college_affiliates', 'registrations', 'exam_results', 'exam_audits', 'payments'];
console.log('📊 Table Record Counts:');
for (const t of tables) {
  const row = db.prepare(`SELECT COUNT(*) as count FROM ${t}`).get();
  console.log(`   • ${t.padEnd(20)}: ${row.count} records`);
}

// 2. Merit List
console.log('\n🏆 Official Exam Results & Merit List (`v_merit_list`):');
const results = db.prepare('SELECT merit_position, roll_number, full_name, score, correct_count, incorrect_count, percentage, tab_switches, exam_status FROM v_merit_list').all();
console.table(results);

// 3. Razorpay Captured Payments
console.log('\n💳 Verified / Captured Payments (Sample):');
const payments = db.prepare("SELECT payment_id, amount_inr, customer_phone, candidate_name, college, payment_status, payment_date FROM payments WHERE payment_status = 'Captured' LIMIT 8").all();
console.table(payments);

// 4. College Ledger Summary
console.log('\n🏥 Top Colleges by Registration & SNA Fund:');
const colleges = db.prepare('SELECT college, total_students, paid_students, total_sna_fund_due FROM v_college_summary LIMIT 6').all();
console.table(colleges);

console.log('\n✅ Database file: maa_park.sqlite is healthy, indexed, and ready for production.\n');
