import fs from 'fs';

const d = JSON.parse(fs.readFileSync('all_sheet_data.json', 'utf8'));
console.log('Total registrations in sheet:', d.registrations.length);

const candidateMap = new Map();

d.registrations.forEach((r, idx) => {
  const roll = (r['Roll Number'] || '').trim().toUpperCase();
  const name = (r['Full Name'] || '').trim();
  const phone = (r['WhatsApp'] || '').trim();
  const email = (r['Email'] || '').trim().toLowerCase();
  const status = (r['Status'] || r['Payment Status'] || '').trim();
  const pId = (r['Razorpay Payment ID'] || '').trim();
  const fee = (r['Fee Paid (₹)'] || '').trim();

  // Clean phone key
  const normPhone = phone.replace(/\D/g, '').slice(-10);
  const key = normPhone || email || roll;

  if (!candidateMap.has(key)) {
    candidateMap.set(key, []);
  }
  candidateMap.get(key).push({
    idx: idx + 1,
    roll,
    name,
    phone,
    email,
    college: r['College'],
    status,
    pId,
    fee
  });
});

console.log(`Unique candidate keys: ${candidateMap.size}`);
for (const [key, records] of candidateMap.entries()) {
  console.log(`\n--- Candidate: ${key} (${records.length} records) ---`);
  records.forEach(rec => {
    console.log(`  [Row ${rec.idx}] Roll: ${rec.roll} | Name: ${rec.name} | Phone: ${rec.phone} | Status: ${rec.status} | Fee: ${rec.fee} | PId: ${rec.pId}`);
  });
}
