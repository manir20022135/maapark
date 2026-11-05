const fs = require('fs');
const data = JSON.parse(fs.readFileSync('all_sheet_data.json', 'utf8'));

console.log('=== SCORECARDS RAW DATA ===');
console.log(JSON.stringify(data.scorecards, null, 2));

console.log('\n=== AUDIT PARTICIPANTS ===');
const rolls = {};
data.scorecards.forEach(s => {
  const r = s['Roll Number'] || s['Roll Number '];
  rolls[r] = {
    roll: r,
    name: s['Full Name'] || s['Full Name '],
    college: s['College'] || s['College '],
    phone: s['WhatsApp'] || s['WhatsApp '],
    tabSwitches: s['Tab Switches'] || 0,
    score: s['Course'] || s['Total Score (/60)'] || 0,
    correct: s['Year/Level'] || s['Correct (+1)'] || 0,
    incorrect: s['State'] || s['Incorrect (-0.25)'] || 0,
    unattempted: s['Fee Paid (₹)'] || s['Unattempted'] || 0,
    percentage: s['Payment Status'] || s['Percentage (%)'] || '0%',
    rank: s['Referral Code'] || s['State Rank'] || '--',
    certId: s['Payment ID / UTR'] || s['Certificate ID'] || '--',
    autoSubmitted: s['Auto Submitted'] || 'NO'
  };
});
console.log(JSON.stringify(rolls, null, 2));
