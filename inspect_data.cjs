const fs = require('fs');
const data = JSON.parse(fs.readFileSync('all_sheet_data.json', 'utf8'));

console.log('=== SUMMARY OF DATA ===');
console.log('Total Registrations:', data.registrations.length);
console.log('Total Scorecards:', data.scorecards.length);
console.log('Total Affiliates:', data.affiliates.length);

console.log('\n--- ALL SCORECARDS / EXAM TAKERS ---');
data.scorecards.forEach((s, idx) => {
  console.log(`${idx + 1}. Roll: ${s['Roll Number']} | Name: ${s['Full Name']} | Score/Course col: ${s['Course']} | Correct/Year: ${s['Year/Level']} | Incorrect/State: ${s['State']} | Tab Switches: ${s['Tab Switches']} | Auto Submitted: ${s['Auto Submitted']} | Verif: ${s['Payment ID / UTR']}`);
});

console.log('\n--- ALL REGISTRATIONS ---');
data.registrations.forEach((r, idx) => {
  const roll = r['Roll Number'] || '--';
  const name = r['Full Name'] || '--';
  const phone = r['WhatsApp'] || '--';
  const college = r['College'] || '--';
  const fee = r['Fee Paid (₹)'] || '--';
  const status = r['Status'] || r['Payment Status'] || '--';
  const pId = r['Razorpay Payment ID'] || r['Payment ID'] || '--';
  console.log(`${idx + 1}. [${roll}] ${name} | ${phone} | ${college} | ${fee} | ${status} | ${pId}`);
});

console.log('\n--- ALL AFFILIATES ---');
data.affiliates.forEach((a, idx) => {
  console.log(`${idx + 1}. Code: ${a['Referral Code']} | Coord: ${a['Coordinator Name']} | Role: ${a['Role']} | College: ${a['College Name']} | Regs: ${a['Total Registrations']} | Fund: ${a['SNA Fund Accrued (@ ₹15)']}`);
});
