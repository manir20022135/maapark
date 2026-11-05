const db = require('./database_sql.js').default;

async function generateReport() {
  const { ChampionshipRegistration, connectDB } = await import('./database.js');
  await connectDB();

  const mongoDocs = await ChampionshipRegistration.find({}).lean();
  const sqlDocs = db.query('SELECT * FROM registrations');
  const examResults = db.query('SELECT * FROM exam_results');
  const resultMap = new Map();
  examResults.forEach(r => resultMap.set(r.roll_number.toUpperCase(), r));

  const candidateMap = new Map();
  function addCandidate(roll, name, token, phone, email, college) {
    if (!roll) return;
    const cleanRoll = roll.trim().toUpperCase();
    const cleanPhone = phone ? phone.replace(/\D/g, '').slice(-10) : '';
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const cleanToken = token ? token.trim().toUpperCase() : 'MAAPARK2026';
    const key = cleanPhone || cleanEmail || cleanRoll.replace(/^PENDING-/, '').replace(/-\d+$/, '');

    if (!candidateMap.has(key)) {
      candidateMap.set(key, { rollNumber: cleanRoll, allRolls: [cleanRoll], name, token: cleanToken, phone: cleanPhone, email: cleanEmail, college });
    } else {
      const existing = candidateMap.get(key);
      if (!existing.allRolls.includes(cleanRoll)) existing.allRolls.push(cleanRoll);
      if (existing.rollNumber.startsWith('PENDING-') && !cleanRoll.startsWith('PENDING-')) existing.rollNumber = cleanRoll;
      if (cleanToken && (!existing.token || existing.token === 'MAAPARK2026')) existing.token = cleanToken;
      if (name && existing.name === 'Registered Candidate') existing.name = name;
    }
  }

  mongoDocs.forEach(m => addCandidate(m.rollNumber, m.name, m.examToken, m.whatsapp, m.email, m.college));
  sqlDocs.forEach(s => addCandidate(s.roll_number, s.full_name, s.exam_token, s.whatsapp, s.email, s.college));

  const list = Array.from(candidateMap.values());
  const BASE_URL = 'http://localhost:3000/api/championship';

  console.log('| Roll No / Candidate ID | Candidate Name | Login Status | Exam Status | Error / Issue Details | Recommended Next Action |');
  console.log('| :--- | :--- | :--- | :--- | :--- | :--- |');

  for (const c of list) {
    const res = await fetch(`${BASE_URL}/exam/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rollNumber: c.rollNumber, examToken: c.token })
    });
    const data = await res.json();
    let loginStatus = res.ok ? 'SUCCESS (200)' : `STATUS ${res.status}`;
    let examStatus = 'Not Started';
    let err = 'None';
    let rec = 'Send credentials to candidate for examination entry.';

    const prevResult = resultMap.get(c.rollNumber) || resultMap.get(c.allRolls.find(r => resultMap.has(r)));

    if (res.status === 409) {
      loginStatus = 'LOCKED (409)';
      examStatus = 'Completed (2/2 Attempts Exhausted)';
      err = 'Maximum examination attempts reached (Attempt 2/2 exhausted)';
      rec = 'Official result & 60 audits locked in database; release on Sep 28.';
    } else if (res.ok) {
      if (prevResult && prevResult.exam_status === 'DISQUALIFIED') {
        examStatus = 'Re-Exam Authorized (Attempt 2/2)';
        rec = 'Prior interruption cleared; candidate permitted to complete re-exam.';
      } else if (prevResult && (prevResult.exam_status === 'VALID' || prevResult.exam_status === 'MANUAL_VERIFIED' || prevResult.exam_status === 'Submitted - Pending Review')) {
        examStatus = 'Previous Attempt Submitted (Re-Exam Active)';
        rec = 'Attempt 1 score saved in registry; optional 2nd attempt available.';
      } else if (data.attemptNumber === 1) {
        examStatus = 'Not Started (Attempt 1 of 2)';
        rec = 'Candidate verified & paid. Ready for immediate exam entry.';
      } else {
        examStatus = `Re-Exam Permitted (Attempt ${data.attemptNumber})`;
        rec = 'Access granted for re-exam window.';
      }
    } else {
      err = data.error || 'Login rejected';
      rec = 'Verify candidate registration in master registry.';
    }

    console.log(`| ${c.rollNumber} | ${c.name || 'Registered Candidate'} | ${loginStatus} | ${examStatus} | ${err} | ${rec} |`);
  }
}

generateReport().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
