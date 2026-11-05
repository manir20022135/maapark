import fs from 'fs';

const list = JSON.parse(fs.readFileSync('student_access_keys.json', 'utf8'));

function getCandidateScore(c) {
  let score = 0;
  const roll = (c.rollNumber || '').toUpperCase();
  const status = (c.status || '').toLowerCase();

  // Prefer official confirmed roll number over PENDING prefix
  if (!roll.startsWith('PENDING') && roll.startsWith('MPC-2026')) {
    score += 100;
  }
  // Prefer non-duplicate suffix (e.g. MPC-2026-RCN-1089 over MPC-2026-RCN-1089-3)
  if (!/-\d+$/.test(roll)) {
    score += 50;
  }
  // Payment confirmed / UTR / transaction ID
  if (status.includes('paid') || status.includes('captured') || status.includes('rzp') || status.includes('manual') || /^\d{10,}/.test(status) || status.includes('@')) {
    score += 40;
  }
  // Has phone number
  if (c.whatsapp && c.whatsapp.trim().length >= 10) {
    score += 20;
  }
  return score;
}

// Group by student phone / email / name
const uniqueMap = new Map();

for (const s of list) {
  const phone = (s.whatsapp || '').replace(/\D/g, '').slice(-10);
  const key = phone || (s.email || '').toLowerCase().trim() || s.name;

  if (!uniqueMap.has(key)) {
    uniqueMap.set(key, s);
  } else {
    const existing = uniqueMap.get(key);
    if (getCandidateScore(s) > getCandidateScore(existing)) {
      uniqueMap.set(key, s);
    }
  }
}

const uniqueList = Array.from(uniqueMap.values())
  .filter(s => s.name && !s.name.includes('(Test Candidate)') && s.rollNumber !== 'MPC-TEST-SQL-001')
  .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

console.log('Clean unique registered students count:', uniqueList.length);
fs.writeFileSync('unique_students_access_keys.json', JSON.stringify(uniqueList, null, 2));

// Generate unique CSV
const headers = ['S.No', 'Student Name', 'WhatsApp Number', 'Official Roll Number', 'Access Key (Exam Token)', 'College / Institute', 'Course', 'Status'];
const rows = uniqueList.map((s, idx) => [
  idx + 1,
  `"${(s.name || '').replace(/"/g, '""')}"`,
  `"${s.whatsapp || ''}"`,
  `"${s.rollNumber || ''}"`,
  `"${s.accessKey || ''}"`,
  `"${(s.college || '').replace(/"/g, '""')}"`,
  `"${(s.course || '').replace(/"/g, '""')}"`,
  `"${s.status || 'paid'}"`
].join(','));

fs.writeFileSync('unique_students_access_keys.csv', [headers.join(','), ...rows].join('\n'));
console.log('✅ Generated unique_students_access_keys.csv');
