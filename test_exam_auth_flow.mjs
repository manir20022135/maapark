import 'dotenv/config';
import express from 'express';
import { connectDB } from './database.js';
import championshipRouter from './championship-routes.js';

async function testAuthFlow() {
  console.log('🧪 Starting Comprehensive Exam Authentication Test...');
  await connectDB();

  const app = express();
  app.use(express.json());
  app.use('/api/championship', championshipRouter);

  const server = app.listen(3099, () => {
    console.log('Test server listening on port 3099');
  });

  const BASE_URL = 'http://127.0.0.1:3099/api/championship';

  async function postJson(endpoint, body) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    return { status: res.status, ok: res.ok, data };
  }

  async function getJson(endpoint) {
    const res = await fetch(`${BASE_URL}${endpoint}`);
    const data = await res.json();
    return { status: res.status, ok: res.ok, data };
  }

  try {
    console.log('\n--- TEST 1: Exact Roll & Token Login (Baia Monlang Kasar) ---');
    const t1 = await postJson('/exam/login', {
      rollNumber: 'MPC-2026-AIONE-5732',
      examToken: 'MPC-TOK-5732'
    });
    console.log(`Status: ${t1.status}, Candidate: ${t1.data.candidateName}, Roll: ${t1.data.rollNumber}, Success: ${t1.data.success}`);
    if (!t1.ok || !t1.data.success) throw new Error('Test 1 failed: ' + JSON.stringify(t1.data));

    console.log('\n--- TEST 2: Lowercase & Whitespace Tolerant Login ---');
    const t2 = await postJson('/exam/login', {
      rollNumber: '  mpc-2026-aione-5732  ',
      examToken: '  mpc-tok-5732  '
    });
    console.log(`Status: ${t2.status}, Candidate: ${t2.data.candidateName}, Success: ${t2.data.success}`);
    if (!t2.ok || !t2.data.success) throw new Error('Test 2 failed: ' + JSON.stringify(t2.data));

    console.log('\n--- TEST 3: Short 4-digit Token Login ("5732") ---');
    const t3 = await postJson('/exam/login', {
      rollNumber: 'MPC-2026-AIONE-5732',
      examToken: '5732'
    });
    console.log(`Status: ${t3.status}, Candidate: ${t3.data.candidateName}, Success: ${t3.data.success}`);
    if (!t3.ok || !t3.data.success) throw new Error('Test 3 failed: ' + JSON.stringify(t3.data));

    console.log('\n--- TEST 4: Fetch Exam Questions ---');
    const t4 = await getJson('/exam/questions?rollNumber=MPC-2026-AIONE-5732&examToken=MPC-TOK-5732');
    console.log(`Status: ${t4.status}, Questions Count: ${t4.data.totalQuestions}, Success: ${t4.data.success}`);
    if (!t4.ok || !t4.data.success || t4.data.totalQuestions !== 60) throw new Error('Test 4 failed: ' + JSON.stringify(t4.data));

    console.log('\n--- TEST 5: Candidate Status Portal (/candidate/status) ---');
    const t5 = await postJson('/candidate/status', {
      rollNumber: 'MPC-2026-AIONE-5732',
      examToken: 'MPC-TOK-5732'
    });
    console.log(`Status: ${t5.status}, Auth: ${t5.data.authenticated}, Candidate:`, t5.data.candidate);
    if (!t5.ok || !t5.data.authenticated) throw new Error('Test 5 failed: ' + JSON.stringify(t5.data));

    console.log('\n--- TEST 6: Mobile Number Fallback Login ---');
    const t6 = await postJson('/exam/login', {
      rollNumber: '7085352692',
      examToken: 'MPC-TOK-5732'
    });
    console.log(`Status: ${t6.status}, Candidate: ${t6.data.candidateName}, Success: ${t6.data.success}`);
    if (!t6.ok || !t6.data.success) throw new Error('Test 6 failed: ' + JSON.stringify(t6.data));

    console.log('\n--- TEST 7: Previous Pending Roll Number Fallback ---');
    const t7 = await postJson('/exam/login', {
      rollNumber: 'PENDING-MPC-2026-AIONE-9248',
      examToken: 'MPC-TOK-9248'
    });
    console.log(`Status: ${t7.status}, Candidate: ${t7.data.candidateName}, Success: ${t7.data.success}`);
    if (!t7.ok || !t7.data.success) throw new Error('Test 7 failed: ' + JSON.stringify(t7.data));

    console.log('\n--- TEST 8: Other Verified Student (Bhaswati Baishya) ---');
    const t8 = await postJson('/exam/login', {
      rollNumber: 'MPC-2026-RCN-8638',
      examToken: 'MPC-TOK-8638'
    });
    console.log(`Status: ${t8.status}, Candidate: ${t8.data.candidateName}, Success: ${t8.data.success}`);
    if (!t8.ok || !t8.data.success) throw new Error('Test 8 failed: ' + JSON.stringify(t8.data));

    console.log('\n--- TEST 9: Admin Verify Candidate API ---');
    const { ChampionshipRegistration } = await import('./database.js');
    await ChampionshipRegistration.deleteMany({ rollNumber: { $regex: 'TEST-' } });
    const sqlDB = (await import('./database_sql.js')).default;
    sqlDB.run("DELETE FROM registrations WHERE roll_number LIKE '%TEST-%'");
    sqlDB.run("DELETE FROM exam_results WHERE roll_number LIKE '%TEST-%'");

    const testId = Math.floor(1000 + Math.random() * 9000);
    const testRoll = `MPC-2026-TEST-${testId}`;
    const testPending = `PENDING-MPC-2026-TEST-${testId}`;

    const t9 = await postJson('/admin/verify-candidate', {
      rollNumber: testPending,
      newRollNumber: testRoll,
      name: 'Test Approved Student',
      college: 'Gauhati Medical College',
      whatsapp: '9876543210'
    });
    console.log(`Status: ${t9.status}, Candidate:`, t9.data.candidate);
    if (!t9.ok || !t9.data.success) throw new Error('Test 9 failed: ' + JSON.stringify(t9.data));

    // Now test login with newly approved student
    const t9Login = await postJson('/exam/login', {
      rollNumber: testRoll,
      examToken: t9.data.candidate.examToken
    });
    console.log(`New Student Login Status: ${t9Login.status}, Name: ${t9Login.data.candidateName}, Success: ${t9Login.data.success}`);
    console.log('\n--- TEST 10: 2-Entry / 2-Attempt Examination Policy ---');
    // Login attempt 1
    const t10_login1 = await postJson('/exam/login', {
      rollNumber: testRoll,
      examToken: t9.data.candidate.examToken
    });
    console.log(`Attempt 1 Status: ${t10_login1.status}, AttemptNumber: ${t10_login1.data.attemptNumber}, MaxAttempts: ${t10_login1.data.maxAttempts}`);
    if (t10_login1.data.attemptNumber !== 1) throw new Error('Expected attemptNumber: 1');

    // Submit Attempt 1
    const t10_sub1 = await postJson('/exam/submit', {
      rollNumber: testRoll,
      examToken: t9.data.candidate.examToken,
      answers: { q1: 'B', q2: 'B' },
      timeSpent: 120
    });
    console.log(`Submit 1 Status: ${t10_sub1.status}, AttemptCount: ${t10_sub1.data.attemptCount}, CanReattempt: ${t10_sub1.data.canReattempt}`);
    if (!t10_sub1.data.canReattempt) throw new Error('Expected canReattempt: true after attempt 1');

    // Login attempt 2 (Must be PERMITTED)
    const t10_login2 = await postJson('/exam/login', {
      rollNumber: testRoll,
      examToken: t9.data.candidate.examToken
    });
    console.log(`Attempt 2 Status: ${t10_login2.status}, Success: ${t10_login2.data.success}, AttemptNumber: ${t10_login2.data.attemptNumber}, isReattempt: ${t10_login2.data.isReattempt}`);
    if (!t10_login2.ok || !t10_login2.data.success || t10_login2.data.attemptNumber !== 2) {
      throw new Error('Test 10 failed: 2nd attempt was not permitted!');
    }

    // Submit Attempt 2
    const t10_sub2 = await postJson('/exam/submit', {
      rollNumber: testRoll,
      examToken: t9.data.candidate.examToken,
      answers: { q1: 'B', q2: 'B', q3: 'B' },
      timeSpent: 150
    });
    console.log(`Submit 2 Status: ${t10_sub2.status}, AttemptCount: ${t10_sub2.data.attemptCount}, CanReattempt: ${t10_sub2.data.canReattempt}`);
    if (t10_sub2.data.canReattempt) throw new Error('Expected canReattempt: false after attempt 2');

    // Login attempt 3 (Must be BLOCKED with 409)
    const t10_login3 = await postJson('/exam/login', {
      rollNumber: testRoll,
      examToken: t9.data.candidate.examToken
    });
    console.log(`Attempt 3 Status: ${t10_login3.status} (Expected 409), Error: ${t10_login3.data.error}`);
    if (t10_login3.status !== 409) throw new Error('Expected 409 on 3rd attempt');

    // Clean up temporary candidate
    await ChampionshipRegistration.deleteMany({ rollNumber: { $regex: 'TEST-' } });
    sqlDB.run("DELETE FROM registrations WHERE roll_number LIKE '%TEST-%'");
    sqlDB.run("DELETE FROM exam_results WHERE roll_number LIKE '%TEST-%'");
    console.log('✅ Cleaned up temporary test record.');

    console.log('\n🎉 ALL 10 TESTS PASSED! 2-ENTRY POLICY IS 100% OPERATIONAL!');
  } finally {
    server.close();
  }
}

testAuthFlow().then(() => process.exit(0)).catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
