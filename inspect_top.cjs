const fs = require('fs');
const data = JSON.parse(fs.readFileSync('all_sheet_data.json', 'utf8'));
data.registrations.slice(0, 31).forEach((r, idx) => {
  const roll = r['Roll Number'] || '--';
  const name = r['Full Name'] || '--';
  const phone = r['WhatsApp'] || '--';
  const college = r['College'] || '--';
  const fee = r['Fee Paid (₹)'] || '--';
  const status = r['Status'] || r['Payment Status'] || '--';
  const pId = r['Razorpay Payment ID'] || r['Payment ID'] || '--';
  console.log((idx + 1) + '. [' + roll + '] ' + name + ' | ' + phone + ' | ' + college + ' | ' + fee + ' | ' + status + ' | ' + pId);
});
