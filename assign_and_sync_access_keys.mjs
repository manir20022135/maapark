import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import sqlDB from './database_sql.js';
import { connectDB, ChampionshipRegistration } from './database.js';

function extractOrGenerateToken(rollNumber) {
  if (!rollNumber) return 'MPC-TOK-2026';
  const clean = rollNumber.trim().toUpperCase();
  if (clean.includes('DEMO')) return 'DEMO-EXAM-TOKEN-2026';
  
  // Look for 4 digits at end of roll or before a suffix
  // e.g. MPC-2026-RCN-4812 -> 4812
  // e.g. MPC-2026-RCN-1089-3 -> 1089
  const m = clean.match(/(\d{4})(?:-\d+)?$/);
  if (m) {
    return `MPC-TOK-${m[1]}`;
  }
  
  // Any 3-4 digit match
  const m2 = clean.match(/(\d{3,4})/g);
  if (m2 && m2.length > 0) {
    const lastNum = m2[m2.length - 1];
    return `MPC-TOK-${lastNum.padStart(4, '0')}`;
  }

  // Fallback
  return `MPC-TOK-${Math.floor(1000 + Math.random() * 9000)}`;
}

async function main() {
  console.log('🚀 Connecting to MongoDB Atlas & SQLite...');
  await connectDB();

  // 1. Ensure SQLite has exam_token column
  try {
    const cols = sqlDB.query('PRAGMA table_info(registrations)');
    const hasTokenCol = cols.some(c => c.name === 'exam_token');
    if (!hasTokenCol) {
      console.log('Adding exam_token column to SQLite registrations table...');
      sqlDB.run('ALTER TABLE registrations ADD COLUMN exam_token VARCHAR(64)');
      console.log('✅ exam_token column added to SQLite.');
    }
  } catch (err) {
    console.error('Error checking/adding SQLite column:', err.message);
  }

  // 2. Fetch all MongoDB registrations
  const mongoRegs = await ChampionshipRegistration.find({}).sort({ createdAt: 1 });
  console.log(`Found ${mongoRegs.length} MongoDB registrations.`);

  const studentList = [];

  for (const reg of mongoRegs) {
    let token = reg.examToken;
    if (!token || token.trim() === '') {
      token = extractOrGenerateToken(reg.rollNumber);
      await ChampionshipRegistration.updateOne(
        { _id: reg._id },
        { $set: { examToken: token } }
      );
    }

    // Also update SQLite
    if (reg.rollNumber) {
      try {
        sqlDB.run(
          'UPDATE registrations SET exam_token = ? WHERE UPPER(roll_number) = UPPER(?)',
          [token, reg.rollNumber.trim()]
        );
      } catch (e) {
        console.warn('SQLite update error for', reg.rollNumber, e.message);
      }
    }

    studentList.push({
      rollNumber: reg.rollNumber,
      accessKey: token,
      name: reg.name,
      whatsapp: reg.whatsapp,
      email: reg.email,
      college: reg.college,
      course: reg.course || 'B.Sc Nursing',
      year: reg.year || 'Final Year',
      status: reg.status || 'paid',
      source: 'MongoDB'
    });
  }

  // 3. Check SQLite registrations that might not be in MongoDB
  const sqlRegs = sqlDB.query('SELECT * FROM registrations');
  const seenRolls = new Set(studentList.map(s => s.rollNumber ? s.rollNumber.toUpperCase() : ''));

  for (const sReg of sqlRegs) {
    const roll = sReg.roll_number ? sReg.roll_number.toUpperCase().trim() : '';
    let token = sReg.exam_token;
    if (!token) {
      token = extractOrGenerateToken(roll);
      sqlDB.run(
        'UPDATE registrations SET exam_token = ? WHERE roll_number = ?',
        [token, sReg.roll_number]
      );
    }

    if (!seenRolls.has(roll)) {
      seenRolls.add(roll);
      studentList.push({
        rollNumber: sReg.roll_number,
        accessKey: token,
        name: sReg.full_name,
        whatsapp: sReg.whatsapp,
        email: sReg.email,
        college: sReg.college,
        course: sReg.course || 'B.Sc Nursing',
        year: sReg.year_level || 'Final Year',
        status: sReg.payment_status || 'paid',
        source: 'SQLite'
      });
    }
  }

  console.log(`\n✅ Total students processed with Access Keys: ${studentList.length}`);

  // 4. Save to JSON
  fs.writeFileSync('student_access_keys.json', JSON.stringify(studentList, null, 2));

  // 5. Generate CSV
  const csvHeaders = ['S.No', 'Full Name', 'WhatsApp', 'Roll Number', 'Access Key (Exam Token)', 'College', 'Course', 'Status'];
  const csvRows = studentList.map((s, idx) => {
    return [
      idx + 1,
      `"${(s.name || '').replace(/"/g, '""')}"`,
      `"${s.whatsapp || ''}"`,
      `"${s.rollNumber || ''}"`,
      `"${s.accessKey || ''}"`,
      `"${(s.college || '').replace(/"/g, '""')}"`,
      `"${(s.course || '').replace(/"/g, '""')}"`,
      `"${s.status || ''}"`
    ].join(',');
  });
  const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');
  fs.writeFileSync('student_access_keys.csv', csvContent);
  console.log('✅ Generated student_access_keys.csv');

  // 6. Generate a lightweight, beautiful searchable HTML Sheet for quick copy-paste
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Maa Park Championship 2026 — Student Roll Numbers & Access Keys</title>
  <style>
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
    .header { margin-bottom: 20px; }
    h1 { color: #38bdf8; margin: 0 0 6px 0; font-size: 24px; }
    p { color: #94a3b8; margin: 0 0 16px 0; font-size: 14px; }
    .search-box {
      width: 100%; max-width: 500px; padding: 12px 16px; border-radius: 8px;
      border: 1px solid #334155; background: #1e293b; color: #fff; font-size: 15px; margin-bottom: 20px;
    }
    .search-box:focus { outline: none; border-color: #38bdf8; }
    table { width: 100%; border-collapse: collapse; background: #1e293b; border-radius: 8px; overflow: hidden; }
    th { background: #0f172a; color: #94a3b8; text-align: left; padding: 12px 14px; font-size: 13px; text-transform: uppercase; border-bottom: 1px solid #334155; }
    td { padding: 12px 14px; border-bottom: 1px solid #334155; font-size: 14px; color: #e2e8f0; }
    tr:hover { background: #243248; }
    .roll { font-family: monospace; font-weight: 700; color: #38bdf8; background: #0b1120; padding: 4px 8px; border-radius: 4px; display: inline-block; }
    .token { font-family: monospace; font-weight: 800; color: #10b981; background: #064e3b; padding: 4px 8px; border-radius: 4px; display: inline-block; }
    .btn-copy { background: #334155; color: #fff; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; margin-left: 6px; }
    .btn-copy:hover { background: #475569; }
    .badge-paid { background: #065f46; color: #34d399; padding: 2px 8px; border-radius: 999px; font-size: 12px; font-weight: 600; }
    .badge-pending { background: #854d0e; color: #fde047; padding: 2px 8px; border-radius: 999px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Maa Park National Championship 2026 — Master Student Access Keys</h1>
    <p>Official list of Roll Numbers & Exam Access Keys. Use the search box below to find any student instantly by Name, Phone, or Roll Number.</p>
    <input type="text" id="search" class="search-box" placeholder="Search by Student Name, WhatsApp Phone, or Roll Number..." onkeyup="filterTable()">
  </div>

  <table id="studentsTable">
    <thead>
      <tr>
        <th>#</th>
        <th>Student Name</th>
        <th>WhatsApp</th>
        <th>Roll Number</th>
        <th>Access Key (Exam Token)</th>
        <th>College</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${studentList.map((s, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td><strong>${s.name || '--'}</strong></td>
        <td>${s.whatsapp || '--'}</td>
        <td>
          <span class="roll">${s.rollNumber || '--'}</span>
          <button class="btn-copy" onclick="copyText('${s.rollNumber}')">Copy</button>
        </td>
        <td>
          <span class="token">${s.accessKey || '--'}</span>
          <button class="btn-copy" onclick="copyText('${s.accessKey}')">Copy</button>
        </td>
        <td>${s.college || '--'}</td>
        <td><span class="${(s.status || '').toLowerCase().includes('pending') ? 'badge-pending' : 'badge-paid'}">${s.status || 'paid'}</span></td>
      </tr>
      `).join('')}
    </tbody>
  </table>

  <script>
    function copyText(txt) {
      navigator.clipboard.writeText(txt).then(() => {
        alert('Copied to clipboard: ' + txt);
      });
    }
    function filterTable() {
      const q = document.getElementById('search').value.toLowerCase();
      const rows = document.querySelectorAll('#studentsTable tbody tr');
      rows.forEach(r => {
        const text = r.innerText.toLowerCase();
        r.style.display = text.includes(q) ? '' : 'none';
      });
    }
  </script>
</body>
</html>`;

  fs.writeFileSync('student_access_keys.html', htmlContent);
  console.log('✅ Generated student_access_keys.html');
}

main().then(() => process.exit(0)).catch(e => { console.error('Execution failed:', e); process.exit(1); });
