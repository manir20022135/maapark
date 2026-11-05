// championship-gsheets.gs
// Google Apps Script — Deploy as Web App (Execute as Me, Access: Anyone)
// Handles 4 sheets:
// Tab 1: Master_Registrations
// Tab 2: Itemized_Exam_Audit
// Tab 3: Final_Scorecards
// Tab 4: SNA_College_Ledger

const SPREADSHEET_ID = '1vdkNKF0h8fEXMJgkHAJntLmtlDVjg81tGxjG3ctMLrg';

function getSpreadsheet() {
  try {
    return SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch(e) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
}

/**
 * 🚀 RUN THIS FUNCTION DIRECTLY IN APPS SCRIPT TO INSTANTLY POPULATE ALL 4 TABLES!
 */
function testPopulateDemoData() {
  const ss = getSpreadsheet();
  setupAllTables(ss);

  // 1. Add Demo Candidate: Priya Sharma
  appendRegistration(ss, {
    timestamp: '25/08/2026 12:00 IST',
    rollNumber: 'MPC-2026-DEMO-0001',
    name: 'Priya Sharma (Demo Candidate)',
    whatsapp: '9876543210',
    email: 'priya.demo@maapark.in',
    college: 'Dispur Nursing Institute (DNI), Guwahati',
    course: 'B.Sc Nursing',
    year: '4th Year',
    state: 'Assam',
    tier: 'Tier 1: Early Bird',
    feePaid: '₹99',
    refCode: 'DNI-GUW',
    orderId: 'order_DEMO_MPC2026',
    paymentId: 'pay_DEMO_999888777'
  });

  // 2. Add Candidate 2: Ananya Das
  appendRegistration(ss, {
    timestamp: '25/08/2026 12:15 IST',
    rollNumber: 'MPC-2026-RCN-1089',
    name: 'Ananya Das',
    whatsapp: '9864012345',
    email: 'ananya.das@gmail.com',
    college: 'Regional College of Nursing (RCN), Guwahati',
    course: 'B.Sc Nursing',
    year: 'Final Year',
    state: 'Assam',
    tier: 'Tier 1: Early Bird',
    feePaid: '₹99',
    refCode: 'RCN-GUW',
    orderId: 'order_MPCRCN_001',
    paymentId: 'pay_MPCRCN_991'
  });

  // 3. Add Affiliate Colleges
  appendAffiliate(ss, {
    timestamp: '25/08/2026 11:30 IST',
    code: 'RCN-GUW',
    name: 'Prof. (Dr.) Hemeswari Bhuyan',
    role: 'Principal & Chief Clinical Advisor',
    college: 'Regional College of Nursing (RCN), Guwahati',
    whatsapp: '9876543210',
    upiId: 'hemeswari@upi',
    paidRegistrations: 12,
    snaFundAccrued: '₹180',
    payoutStatus: 'Active'
  });

  appendAffiliate(ss, {
    timestamp: '25/08/2026 11:45 IST',
    code: 'DNI-GUW',
    name: 'Dr. J. P. Sarma',
    role: 'Academic Director',
    college: 'Dispur Nursing Institute (DNI), Guwahati',
    whatsapp: '9435012345',
    upiId: 'dni.guwahati@upi',
    paidRegistrations: 8,
    snaFundAccrued: '₹120',
    payoutStatus: 'Active'
  });

  // 4. Add Scorecards & Itemized Audit
  appendScorecard(ss, {
    timestamp: '25/08/2026 12:45 IST',
    rollNumber: 'MPC-2026-DEMO-0001',
    name: 'Priya Sharma (Demo Candidate)',
    college: 'Dispur Nursing Institute (DNI), Guwahati',
    state: 'Assam',
    course: 'B.Sc Nursing',
    score: 56.75,
    correct: 58,
    incorrect: 5,
    unattempted: 2,
    rank: 1,
    certificateId: 'CERT-MPC2026-DEMO99',
    tabSwitches: 0,
    autoSubmitted: false,
    timeSpent: 2280,
    itemizedAudit: [
      { qNum: 1, section: 'A', questionId: 'q1', candidateAnswer: 'Place patient in left lateral position, maintain airway, and notify obstetrician immediately', correctAnswer: 'Place patient in left lateral position, maintain airway, and notify obstetrician immediately', isCorrect: true },
      { qNum: 2, section: 'A', questionId: 'q2', candidateAnswer: 'Hemolysis, elevated liver enzymes, low platelet count (<100,000/mm³)', correctAnswer: 'Hemolysis, elevated liver enzymes, low platelet count (<100,000/mm³)', isCorrect: true },
      { qNum: 3, section: 'A', questionId: 'q3', candidateAnswer: 'Loss of deep tendon reflexes (Patellar reflex)', correctAnswer: 'Loss of deep tendon reflexes (Patellar reflex)', isCorrect: true },
      { qNum: 4, section: 'A', questionId: 'q4', candidateAnswer: 'Breech presentation', correctAnswer: 'Breech presentation', isCorrect: true },
      { qNum: 5, section: 'A', questionId: 'q5', candidateAnswer: 'Oxytocin 10 IU IM within 1 minute of fetal delivery', correctAnswer: 'Oxytocin 10 IU IM within 1 minute of fetal delivery', isCorrect: true }
    ]
  });
  
  if (data_itemized = [
    { qNum: 1, section: 'A', questionId: 'q1', candidateAnswer: 'Place patient in left lateral position, maintain airway, and notify obstetrician immediately', correctAnswer: 'Place patient in left lateral position, maintain airway, and notify obstetrician immediately', isCorrect: true },
    { qNum: 2, section: 'A', questionId: 'q2', candidateAnswer: 'Hemolysis, elevated liver enzymes, low platelet count (<100,000/mm³)', correctAnswer: 'Hemolysis, elevated liver enzymes, low platelet count (<100,000/mm³)', isCorrect: true },
    { qNum: 3, section: 'A', questionId: 'q3', candidateAnswer: 'Loss of deep tendon reflexes (Patellar reflex)', correctAnswer: 'Loss of deep tendon reflexes (Patellar reflex)', isCorrect: true },
    { qNum: 4, section: 'A', questionId: 'q4', candidateAnswer: 'Breech presentation', correctAnswer: 'Breech presentation', isCorrect: true },
    { qNum: 5, section: 'A', questionId: 'q5', candidateAnswer: 'Oxytocin 10 IU IM within 1 minute of fetal delivery', correctAnswer: 'Oxytocin 10 IU IM within 1 minute of fetal delivery', isCorrect: true }
  ]) {
    appendItemizedAudit(ss, {
      timestamp: '25/08/2026 12:45 IST',
      rollNumber: 'MPC-2026-DEMO-0001',
      name: 'Priya Sharma (Demo Candidate)',
      college: 'Dispur Nursing Institute (DNI), Guwahati',
      itemizedAudit: data_itemized
    });
  }

  Logger.log('✅ All 4 Tables populated successfully with Demo Data!');
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = getSpreadsheet();
    
    // Ensure all 4 tables exist and are formatted
    setupAllTables(ss);
    
    switch(data.type) {
      case 'registration':
      case 'webhook_registration': {
        appendRegistration(ss, data);
        if (data.refCode) {
          updateSNALedgerOnRegistration(ss, data);
        }
        break;
      }
      case 'affiliate_created': {
        appendAffiliate(ss, data);
        break;
      }
      case 'exam_result':
      case 'exam_result_with_audit': {
        appendScorecard(ss, data);
        if (data.itemizedAudit && Array.isArray(data.itemizedAudit)) {
          appendItemizedAudit(ss, data);
        }
        break;
      }
      case 'disqualified': {
        appendScorecard(ss, {
          timestamp: data.timestamp || new Date().toISOString(),
          rollNumber: data.rollNumber,
          name: data.name,
          college: data.college || '-',
          state: data.state || '-',
          course: data.course || '-',
          score: 0,
          correct: 0,
          incorrect: 0,
          unattempted: 60,
          rank: 'DISQUALIFIED',
          certificateId: 'N/A — DISQUALIFIED',
          tabSwitches: 'CHEATING_VIOLATION',
          autoSubmitted: true,
          timeSpent: 0
        });
        break;
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok', type: data.type })).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function setupAllTables(ss) {
  // Tab 1: Master_Registrations
  const masterHeaders = [
    'Timestamp', 'Roll Number', 'Full Name', 'WhatsApp', 'Email',
    'College', 'Course', 'Year/Level', 'State',
    'Pricing Tier', 'Fee Paid (₹)', 'Payment Status', 'Referral Code', 'SNA Welfare (₹)',
    'Razorpay Order ID', 'Razorpay Payment ID', 'Score (/60)', 'State Rank', 'Certificate ID', 'Verify URL', 'Exam Status'
  ];
  getOrCreateSheet(ss, 'Master_Registrations', masterHeaders, '#0d9488');

  // Tab 2: Final_Scorecards
  const scorecardHeaders = [
    'Timestamp', 'Roll Number', 'Full Name', 'College', 'State', 'Course',
    'Total Score (/60)', 'Correct (+1)', 'Incorrect (-0.25)', 'Unattempted',
    'Percentage (%)', 'State Rank', 'Certificate ID',
    'Tab Violations', 'Auto Submitted', 'Time Spent', 'Online Verification Link'
  ];
  getOrCreateSheet(ss, 'Final_Scorecards', scorecardHeaders, '#0284c7');

  // Tab 3: Itemized_Exam_Audit
  const auditHeaders = [
    'Timestamp', 'Roll Number', 'Candidate Name', 'College',
    'Q No.', 'Section', 'Question ID', 'Candidate Answer', 'Correct Answer', 'Is Correct', 'Marks Awarded'
  ];
  getOrCreateSheet(ss, 'Itemized_Exam_Audit', auditHeaders, '#1e293b');

  // Tab 4: SNA_College_Ledger
  const snaHeaders = [
    'Created At', 'Referral Code', 'Coordinator Name', 'Role',
    'College Name', 'WhatsApp Number', 'UPI ID',
    'Total Registrations', 'SNA Fund Accrued (@ ₹15)', 'Payout Status'
  ];
  getOrCreateSheet(ss, 'SNA_College_Ledger', snaHeaders, '#8b5cf6');

  // Remove default blank 'Sheet1' if other sheets exist
  try {
    const blankSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('Sheet 1');
    if (blankSheet && ss.getSheets().length > 1) {
      ss.deleteSheet(blankSheet);
    }
  } catch(e) {}
}

function getOrCreateSheet(ss, name, headers, headerColor) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  if (sheet.getLastRow() === 0) {
    const hRange = sheet.getRange(1, 1, 1, headers.length);
    hRange.setValues([headers]);
    hRange.setBackground(headerColor || '#0d9488').setFontColor('#ffffff').setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.setRowHeight(1, 35);
  }
  return sheet;
}

// 1. TAB 1: Master_Registrations (Panoramic Candidate Lifecycle Table)
function appendRegistration(ss, data) {
  const headers = [
    'Timestamp', 'Roll Number', 'Full Name', 'WhatsApp', 'Email',
    'College', 'Course', 'Year/Level', 'State',
    'Pricing Tier', 'Fee Paid (₹)', 'Payment Status', 'Referral Code', 'SNA Welfare (₹)',
    'Razorpay Order ID', 'Razorpay Payment ID', 'Score (/60)', 'State Rank', 'Certificate ID', 'Verify URL', 'Exam Status'
  ];
  const sheet = getOrCreateSheet(ss, 'Master_Registrations', headers, '#0d9488');
  sheet.appendRow([
    data.timestamp || new Date().toISOString(),
    data.rollNumber || '',
    data.name || '',
    data.whatsapp || '',
    data.email || '',
    data.college || '',
    data.course || '',
    data.year || '',
    data.state || '',
    data.tier || 'Tier 1: Early Bird',
    data.feePaid || '₹99',
    'PAID & CONFIRMED',
    data.refCode || 'DIRECT',
    data.snaWelfare || (data.refCode ? '₹15' : '₹0'),
    data.orderId || '',
    data.paymentId || '',
    data.score || '-',
    data.rank ? '#' + data.rank : '-',
    data.certificateId || '-',
    data.certificateId ? 'https://maapark.in/championship-verify.html?id=' + data.certificateId : '-',
    data.certificateId ? 'CERTIFIED' : 'REGISTERED (PENDING EXAM)'
  ]);
}

// 2. TAB 2: Itemized_Exam_Audit (Detailed Per-Question Audit)
function appendItemizedAudit(ss, data) {
  const headers = [
    'Timestamp', 'Roll Number', 'Candidate Name', 'College',
    'Q No.', 'Section', 'Question ID', 'Candidate Answer', 'Correct Answer', 'Is Correct', 'Marks Awarded'
  ];
  const sheet = getOrCreateSheet(ss, 'Itemized_Exam_Audit', headers, '#1e293b');
  const ts = data.timestamp || new Date().toISOString();
  const rows = data.itemizedAudit.map(item => [
    ts,
    data.rollNumber || '',
    data.name || '',
    data.college || '',
    item.qNum || '',
    item.section || '',
    item.questionId || '',
    item.candidateAnswer || 'Not Attempted',
    item.correctAnswer || '',
    item.isCorrect ? 'CORRECT' : (item.candidateAnswer ? 'INCORRECT' : 'UNATTEMPTED'),
    item.isCorrect ? '+1.0' : (item.candidateAnswer ? '-0.25' : '0.0')
  ]);
  if (rows.length > 0) sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, headers.length).setValues(rows);
}

// 3. TAB 3: Final_Scorecards (Merit & Certification Table)
function appendScorecard(ss, data) {
  const headers = [
    'Timestamp', 'Roll Number', 'Full Name', 'College', 'State', 'Course',
    'Total Score (/60)', 'Correct (+1)', 'Incorrect (-0.25)', 'Unattempted',
    'Percentage (%)', 'State Rank', 'Certificate ID',
    'Tab Violations', 'Auto Submitted', 'Time Spent', 'Online Verification Link'
  ];
  const sheet = getOrCreateSheet(ss, 'Final_Scorecards', headers, '#0284c7');
  const pct = data.score != null ? ((data.score / 60) * 100).toFixed(2) + '%' : '';
  const timeMin = data.timeSpent ? (data.timeSpent / 60).toFixed(1) + ' mins' : '0 mins';
  const verifyLink = data.certificateId ? 'https://maapark.in/championship-verify.html?id=' + data.certificateId : '-';

  sheet.appendRow([
    data.timestamp || new Date().toISOString(),
    data.rollNumber || '',
    data.name || '',
    data.college || '',
    data.state || '',
    data.course || '',
    data.score ?? 0,
    data.correct ?? 0,
    data.incorrect ?? 0,
    data.unattempted ?? 0,
    pct,
    data.rank ? '#' + data.rank : '-',
    data.certificateId || '',
    data.tabSwitches || 0,
    data.autoSubmitted ? 'YES' : 'NO',
    timeMin,
    verifyLink
  ]);

  // Also update Master_Registrations row with score and certificate info
  updateMasterRegistrationOnExam(ss, data);
}

function updateMasterRegistrationOnExam(ss, data) {
  const master = ss.getSheetByName('Master_Registrations');
  if (!master) return;
  const values = master.getDataRange().getValues();
  const roll = (data.rollNumber || '').toUpperCase().trim();

  for (let i = 1; i < values.length; i++) {
    if (values[i][1] && values[i][1].toString().toUpperCase().trim() === roll) {
      master.getRange(i + 1, 17).setValue(data.score ?? 0);
      master.getRange(i + 1, 18).setValue(data.rank ? '#' + data.rank : '-');
      master.getRange(i + 1, 19).setValue(data.certificateId || '-');
      master.getRange(i + 1, 20).setValue(data.certificateId ? 'https://maapark.in/championship-verify.html?id=' + data.certificateId : '-');
      master.getRange(i + 1, 21).setValue('COMPLETED & CERTIFIED');
      break;
    }
  }
}

// TAB 4: SNA_College_Ledger
function appendAffiliate(ss, data) {
  const headers = [
    'Created At', 'Referral Code', 'Coordinator Name', 'Role',
    'College Name', 'WhatsApp Number', 'UPI ID',
    'Total Registrations', 'SNA Fund Accrued (@ ₹15)', 'Payout Status'
  ];
  const sheet = getOrCreateSheet(ss, 'SNA_College_Ledger', headers, '#8b5cf6');
  sheet.appendRow([
    data.timestamp || new Date().toISOString(),
    data.code || '',
    data.name || '',
    data.role || '',
    data.college || '',
    data.whatsapp || '',
    data.upiId || '',
    0,
    '₹0',
    'Pending'
  ]);
}

function updateSNALedgerOnRegistration(ss, data) {
  const headers = [
    'Created At', 'Referral Code', 'Coordinator Name', 'Role',
    'College Name', 'WhatsApp Number', 'UPI ID',
    'Total Registrations', 'SNA Fund Accrued (@ ₹15)', 'Payout Status'
  ];
  const sheet = getOrCreateSheet(ss, 'SNA_College_Ledger', headers, '#8b5cf6');
  const values = sheet.getDataRange().getValues();
  const refCode = (data.refCode || '').toUpperCase().trim();
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][1] && values[i][1].toString().toUpperCase().trim() === refCode) {
      const currentCount = parseInt(values[i][7]) || 0;
      const newCount = currentCount + 1;
      const newFund = `₹${newCount * 15}`;
      sheet.getRange(i + 1, 8).setValue(newCount);
      sheet.getRange(i + 1, 9).setValue(newFund);
      return;
    }
  }
}

function doGet(e) {
  // If no query param, return service info
  if (!e || !e.parameter || (!e.parameter.phone && !e.parameter.email && !e.parameter.all)) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'ok',
      service: 'Maa Park Championship 2026 Sheets Engine',
      tabs: ['Master_Registrations', 'Itemized_Exam_Audit', 'Final_Scorecards', 'SNA_College_Ledger'],
      usage: '?phone=9876543210 OR ?email=abc@gmail.com OR ?all=1 (admin only)'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName('Master_Registrations');
  if (!sheet || sheet.getLastRow() < 2) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'not_found', message: 'No registrations yet' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const values = sheet.getDataRange().getValues();
  const headers = values[0]; // Row 1 = headers
  // Column indices (0-based): 0=Timestamp,1=RollNumber,2=Name,3=WhatsApp,4=Email,
  //   5=College,6=Course,7=Year,8=State,9=Tier,10=FeePaid,11=PaymentStatus,
  //   12=RefCode,13=SNA,14=OrderId,15=PaymentId,...

  // Return ALL registrations for admin
  if (e.parameter.all === '1') {
    const allRows = values.slice(1).map(row => ({
      timestamp:     row[0],
      rollNumber:    row[1],
      name:          row[2],
      whatsapp:      row[3],
      email:         row[4],
      college:       row[5],
      course:        row[6],
      year:          row[7],
      state:         row[8],
      tier:          row[9],
      feePaid:       row[10],
      paymentStatus: row[11],
      refCode:       row[12],
      paymentId:     row[15]
    }));
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok', count: allRows.length, registrations: allRows }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const queryPhone = (e.parameter.phone || '').replace(/\D/g, '').slice(-10);
  const queryEmail = (e.parameter.email || '').toLowerCase().trim();

  const results = [];
  for (let i = 1; i < values.length; i++) {
    const rowPhone = (values[i][3] || '').replace(/\D/g, '').slice(-10);
    const rowEmail = (values[i][4] || '').toLowerCase().trim();
    const matched = (queryPhone && rowPhone === queryPhone) || (queryEmail && rowEmail === queryEmail);
    if (matched) {
      results.push({
        rollNumber:    values[i][1] || '',
        name:          values[i][2] || '',
        whatsapp:      values[i][3] || '',
        email:         values[i][4] || '',
        college:       values[i][5] || '',
        feePaid:       values[i][10] || '',
        paymentStatus: values[i][11] || '',
        paymentId:     values[i][15] || '',
        timestamp:     values[i][0] || ''
      });
    }
  }

  if (results.length === 0) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'not_found',
      message: 'No registration found for this phone/email. If you just registered, please allow 1-2 minutes.'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ status: 'ok', count: results.length, registrations: results }))
    .setMimeType(ContentService.MimeType.JSON);
}
