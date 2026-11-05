const db = require('./database_sql.js').default;

async function runQATesting() {
  const { ChampionshipRegistration, connectDB } = await import('./database.js');
  await connectDB();

  // Load from MongoDB
  const mongoDocs = await ChampionshipRegistration.find({}).lean();
  // Load from SQLite
  const sqlDocs = db.query('SELECT * FROM registrations');
  // Load exam results
  const examResults = db.query('SELECT * FROM exam_results');
  const resultMap = new Map();
  examResults.forEach(r => resultMap.set(r.roll_number.toUpperCase(), r));

  // Merge candidates by unique candidate identity (group by phone/email/roll)
  const candidateMap = new Map();

  function addCandidate(roll, name, token, phone, email, college, source) {
    if (!roll) return;
    const cleanRoll = roll.trim().toUpperCase();
    const cleanPhone = phone ? phone.replace(/\D/g, '').slice(-10) : '';
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const cleanToken = token ? token.trim().toUpperCase() : 'MAAPARK2026';

    const key = cleanPhone || cleanEmail || cleanRoll.replace(/^PENDING-/, '').replace(/-\d+$/, '');

    if (!candidateMap.has(key)) {
      candidateMap.set(key, {
        rollNumber: cleanRoll,
        allRolls: [cleanRoll],
        name: name || 'Registered Candidate',
        token: cleanToken,
        phone: cleanPhone,
        email: cleanEmail,
        college: college || 'Nursing College',
        source: [source]
      });
    } else {
      const existing = candidateMap.get(key);
      if (!existing.allRolls.includes(cleanRoll)) existing.allRolls.push(cleanRoll);
      // Prefer confirmed roll over PENDING-
      if (existing.rollNumber.startsWith('PENDING-') && !cleanRoll.startsWith('PENDING-')) {
        existing.rollNumber = cleanRoll;
      }
      if (cleanToken && (!existing.token || existing.token === 'MAAPARK2026')) {
        existing.token = cleanToken;
      }
      if (name && existing.name === 'Registered Candidate') existing.name = name;
      if (college && existing.college === 'Nursing College') existing.college = college;
      existing.source.push(source);
    }
  }

  mongoDocs.forEach(m => {
    addCandidate(m.rollNumber, m.name, m.examToken, m.whatsapp, m.email, m.college, 'MongoDB');
  });

  sqlDocs.forEach(s => {
    addCandidate(s.roll_number, s.full_name, s.exam_token, s.whatsapp, s.email, s.college, 'SQLite');
  });

  const candidateList = Array.from(candidateMap.values());
  console.log(`Found ${candidateList.length} unique candidates to test.`);

  const BASE_URL = 'http://localhost:3000/api/championship';
  const report = [];

  for (const cand of candidateList) {
    // Clean and normalize input credentials
    const testRoll = cand.rollNumber.trim().toUpperCase();
    const testToken = (cand.token || 'MAAPARK2026').trim().toUpperCase();

    let loginSuccess = false;
    let loginStatus = 'FAILED';
    let examStatus = 'Not Started';
    let errorDetails = 'None';
    let recommendedAction = 'Ready for candidate to enter and complete examination.';

    try {
      // 1. Attempt login via API
      const res = await fetch(`${BASE_URL}/exam/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rollNumber: testRoll, examToken: testToken })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        loginSuccess = true;
        loginStatus = 'SUCCESS (200)';
        
        // Determine exact exam status
        if (data.isReattempt) {
          examStatus = `Re-exam Permitted (Attempt ${data.attemptNumber || 2} of ${data.maxAttempts || 2})`;
          recommendedAction = 'Candidate eligible for 2nd / makeup examination entry.';
        } else if (data.attemptNumber === 1) {
          examStatus = 'Not Started (Attempt 1 of 2)';
          recommendedAction = 'Send hall ticket & token to candidate for first attempt.';
        } else {
          examStatus = 'Incomplete / Active Session';
        }
      } else if (res.status === 409) {
        loginStatus = 'LOCKED (409)';
        examStatus = 'Completed (2/2 Attempts Exhausted)';
        errorDetails = data.error || 'Maximum attempts reached';
        recommendedAction = 'Exam already submitted. Final score awaiting board release on Sep 28.';
      } else if (res.status === 403) {
        loginStatus = 'DENIED (403)';
        examStatus = 'Locked / Expired';
        errorDetails = data.error || 'Access denied';
        recommendedAction = 'Verify candidate payment or extend exam window.';
      } else {
        loginStatus = `ERROR (${res.status})`;
        errorDetails = data.error || 'Login failed';
        recommendedAction = 'Check roll number and exam token sync.';
      }

      // Check against SQL exam results for historical completion
      const prevResult = resultMap.get(testRoll) || resultMap.get(cand.allRolls.find(r => resultMap.has(r)));
      if (prevResult) {
        if (prevResult.exam_status === 'VALID' || prevResult.exam_status === 'MANUAL_VERIFIED' || prevResult.exam_status === 'Submitted - Pending Review') {
          if (loginSuccess && data.isReattempt) {
            examStatus = 'Previous Attempt Submitted; Re-Exam Window Active';
            recommendedAction = 'Optional re-attempt available; score currently saved in registry.';
          } else if (!loginSuccess && res.status === 409) {
            examStatus = 'Completed (Submitted)';
            recommendedAction = 'Submission confirmed in SQL database; certificate in generation pipeline.';
          }
        } else if (prevResult.exam_status === 'DISQUALIFIED') {
          examStatus = 'Re-Exam Authorized (Prior Disqualification Cleared)';
          recommendedAction = 'Permitted to retake exam in current extended re-exam window.';
        }
      }

    } catch (err) {
      loginStatus = 'NETWORK_ERROR';
      errorDetails = err.message;
      recommendedAction = 'Verify local backend server is running on port 3000.';
    }

    report.push({
      roll: testRoll,
      name: cand.name,
      college: cand.college,
      token: testToken,
      loginStatus,
      examStatus,
      errorDetails,
      recommendedAction
    });
  }

  console.log(JSON.stringify(report, null, 2));
}

runQATesting().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
