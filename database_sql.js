// database_sql.js
// Modern, zero-dependency SQL Database Client for Maa Park Backend
// Utilizes Node.js native SQLite Engine (node:sqlite) with Prepared Statements & Connection Pooling

import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'maa_park.sqlite');

class DatabaseClient {
  constructor(dbPath = DB_PATH) {
    this.db = new DatabaseSync(dbPath);
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS whatsapp_broadcast_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        broadcast_date TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        stats_snapshot TEXT,
        question_id TEXT,
        dispatch_status TEXT DEFAULT 'SENT',
        webhook_url TEXT,
        response_payload TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  // Generic Query Runners
  query(sql, params = []) {
    const stmt = this.db.prepare(sql);
    return stmt.all(...params);
  }

  get(sql, params = []) {
    const stmt = this.db.prepare(sql);
    return stmt.get(...params);
  }

  run(sql, params = []) {
    const stmt = this.db.prepare(sql);
    return stmt.run(...params);
  }

  // ─── High-Level Entity Methods ───────────────────────────────────────────

  // Registrations
  getAllRegistrations(limit = 100, offset = 0) {
    return this.query(
      'SELECT * FROM registrations ORDER BY id DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
  }

  getRegistrationByRoll(rollNumber) {
    return this.get(
      'SELECT * FROM registrations WHERE UPPER(roll_number) = UPPER(?)',
      [rollNumber]
    );
  }

  getRegistrationByPhone(phone) {
    const norm = phone.replace(/\D/g, '').slice(-10);
    return this.get(
      "SELECT * FROM registrations WHERE whatsapp LIKE ? ORDER BY CASE WHEN roll_number NOT LIKE 'PENDING-%' THEN 0 ELSE 1 END, id DESC LIMIT 1",
      [`%${norm}`]
    );
  }

  getRegistrationByEmail(email) {
    if (!email || typeof email !== 'string') return null;
    return this.get(
      "SELECT * FROM registrations WHERE LOWER(email) = LOWER(?) ORDER BY CASE WHEN roll_number NOT LIKE 'PENDING-%' THEN 0 ELSE 1 END, id DESC LIMIT 1",
      [email.trim()]
    );
  }

  getRegistrationByToken(token) {
    if (!token || typeof token !== 'string') return null;
    const clean = token.trim().toUpperCase();
    return this.get(
      "SELECT * FROM registrations WHERE UPPER(exam_token) = ? OR UPPER(exam_token) LIKE ? ORDER BY CASE WHEN roll_number NOT LIKE 'PENDING-%' THEN 0 ELSE 1 END, id DESC LIMIT 1",
      [clean, `%${clean}%`]
    );
  }


  // Exam Results & Scorecards
  getAllResults() {
    return this.query('SELECT * FROM v_merit_list');
  }

  getResultByRoll(rollNumber) {
    return this.get(
      'SELECT * FROM exam_results WHERE UPPER(roll_number) = UPPER(?)',
      [rollNumber]
    );
  }

  getExamAudits(rollNumber) {
    return this.query(
      'SELECT * FROM exam_audits WHERE UPPER(roll_number) = UPPER(?) ORDER BY question_number ASC',
      [rollNumber]
    );
  }

  updateExamStatus(rollNumber, status, reason = null) {
    return this.run(
      'UPDATE exam_results SET exam_status = ?, disqualification_reason = ? WHERE UPPER(roll_number) = UPPER(?)',
      [status, reason, rollNumber]
    );
  }

  // Payments
  getAllPayments() {
    return this.query('SELECT * FROM payments ORDER BY id DESC');
  }

  getPaymentById(paymentId) {
    return this.get('SELECT * FROM payments WHERE payment_id = ?', [paymentId]);
  }

  // College Affiliates & Funds
  getCollegeSummary() {
    return this.query('SELECT * FROM v_college_summary');
  }

  getAffiliates() {
    return this.query('SELECT * FROM college_affiliates ORDER BY id ASC');
  }

  // Candidate 360 Full Profile
  getCandidate360(rollNumber) {
    return this.get(
      'SELECT * FROM v_candidate_360 WHERE UPPER(roll_number) = UPPER(?)',
      [rollNumber]
    );
  }

  // Candidate Question Audits
  getAuditByRoll(rollNumber) {
    return this.query(
      'SELECT * FROM exam_audits WHERE UPPER(roll_number) = UPPER(?) ORDER BY question_number ASC',
      [rollNumber]
    );
  }

  // ─── Real-Time Write Methods ─────────────────────────────────────────────

  // Upsert Registration
  upsertRegistration(reg) {
    const sql = `
      INSERT INTO registrations (
        roll_number, full_name, whatsapp, email, college, college_code,
        course, year_level, state, pricing_tier, fee_paid_inr, referral_code,
        payment_status, razorpay_order_id, razorpay_payment_id, exam_window_expires_at, exam_token
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now', '+3 days')), ?)
      ON CONFLICT(roll_number) DO UPDATE SET
        full_name = excluded.full_name,
        whatsapp = excluded.whatsapp,
        email = excluded.email,
        college = excluded.college,
        college_code = excluded.college_code,
        course = excluded.course,
        year_level = excluded.year_level,
        state = excluded.state,
        payment_status = excluded.payment_status,
        razorpay_payment_id = COALESCE(excluded.razorpay_payment_id, registrations.razorpay_payment_id),
        exam_window_expires_at = COALESCE(registrations.exam_window_expires_at, excluded.exam_window_expires_at),
        exam_token = COALESCE(excluded.exam_token, registrations.exam_token)
    `;
    return this.run(sql, [
      reg.rollNumber,
      reg.name || reg.fullName || 'Candidate',
      reg.whatsapp || '',
      reg.email || '',
      reg.college || '',
      reg.collegeCode || null,
      reg.course || null,
      reg.year || reg.yearLevel || null,
      reg.state || 'Assam',
      reg.pricingTier || 'Tier 1',
      reg.amount || 99.00,
      reg.referralCode || null,
      reg.paymentStatus || reg.status || 'paid',
      reg.razorpayOrderId || null,
      reg.razorpayPaymentId || null,
      reg.examWindowExpiresAt || null,
      reg.examToken || null
    ]);
  }

  // Save Exam Result
  saveExamResult(res) {
    const sql = `
      INSERT INTO exam_results (
        roll_number, full_name, college, score, correct_count, incorrect_count,
        unattempted_count, percentage, state_rank, certificate_id, certificate_url,
        tab_switches, auto_submitted, time_spent_seconds, time_spent_formatted,
        exam_status, disqualification_reason, attempt_count, submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(roll_number) DO UPDATE SET
        score = excluded.score,
        correct_count = excluded.correct_count,
        incorrect_count = excluded.incorrect_count,
        unattempted_count = excluded.unattempted_count,
        percentage = excluded.percentage,
        state_rank = excluded.state_rank,
        certificate_id = excluded.certificate_id,
        certificate_url = excluded.certificate_url,
        tab_switches = excluded.tab_switches,
        auto_submitted = excluded.auto_submitted,
        time_spent_seconds = excluded.time_spent_seconds,
        time_spent_formatted = excluded.time_spent_formatted,
        exam_status = excluded.exam_status,
        disqualification_reason = excluded.disqualification_reason,
        attempt_count = COALESCE(exam_results.attempt_count, 1) + 1,
        submitted_at = CURRENT_TIMESTAMP
    `;
    const score = Number(res.score || 0);
    const correct = Number(res.correctCount || res.correct || 0);
    const incorrect = Number(res.incorrectCount || res.incorrect || 0);
    const unattempted = Number(res.unattempted || 0);
    const total = (correct + incorrect + unattempted) || 60;
    const pct = ((correct / total) * 100).toFixed(2);
    const timeSec = Number(res.timeSpent || res.timeSpentSeconds || 0);
    const timeFormatted = `${Math.floor(timeSec / 60)}m ${timeSec % 60}s`;

    return this.run(sql, [
      res.rollNumber,
      res.name || res.fullName || 'Candidate',
      res.college || '',
      score,
      correct,
      incorrect,
      unattempted,
      pct,
      String(res.rank || res.stateRank || '--'),
      res.certificateId || null,
      res.certificateUrl || `https://maapark.in/championship-verify.html?id=${res.certificateId}`,
      Number(res.tabSwitches || res.tabSwitchCount || 0),
      res.autoSubmitted ? 1 : 0,
      timeSec,
      timeFormatted,
      res.examStatus || 'VALID',
      res.disqualificationReason || null,
      Number(res.attemptCount || 1)
    ]);
  }

  // Save Itemized Exam Audits
  saveExamAudits(rollNumber, candidateName, college, audits = []) {
    if (!Array.isArray(audits) || audits.length === 0) return;
    try {
      this.run('DELETE FROM exam_audits WHERE UPPER(roll_number) = UPPER(?)', [rollNumber]);
      const stmt = this.db.prepare(`
        INSERT INTO exam_audits (
          roll_number, candidate_name, college, question_number,
          section, question_id, candidate_answer, correct_answer,
          is_correct, marks_awarded, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      for (const a of audits) {
        stmt.run(
          rollNumber,
          candidateName || '',
          college || '',
          a.qNum || a.questionNumber || 0,
          a.section || 'A',
          String(a.questionId || ''),
          String(a.candidateAnswer || ''),
          String(a.correctAnswer || ''),
          a.isCorrect ? 1 : 0,
          a.isCorrect ? 1.0 : (a.candidateAnswer ? -0.25 : 0.0)
        );
      }
    } catch (err) {
      console.error('SQL saveExamAudits error:', err.message);
    }
  }

  // Save Payment
  savePayment(payment) {
    const sql = `
      INSERT INTO payments (
        payment_id, order_id, amount_inr, customer_phone, customer_email,
        roll_number, candidate_name, college, payment_status, payment_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(payment_id) DO UPDATE SET
        payment_status = excluded.payment_status,
        order_id = COALESCE(excluded.order_id, payments.order_id)
    `;
    return this.run(sql, [
      payment.paymentId,
      payment.orderId || null,
      payment.amount || 99.00,
      payment.phone || null,
      payment.email || null,
      payment.rollNumber || null,
      payment.candidateName || null,
      payment.college || null,
      payment.status || 'Captured',
      payment.date || new Date().toISOString()
    ]);
  }

  // ─── WhatsApp Channel Broadcast Logs ──────────────────────────────────
  logWhatsAppBroadcast(entry) {
    const sql = `
      INSERT INTO whatsapp_broadcast_logs (
        broadcast_date, title, content, stats_snapshot,
        question_id, dispatch_status, webhook_url, response_payload
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    return this.run(sql, [
      entry.date || new Date().toISOString().slice(0, 10),
      entry.title || 'Daily Championship Broadcast',
      entry.content || '',
      typeof entry.stats === 'object' ? JSON.stringify(entry.stats) : (entry.stats || ''),
      entry.questionId || null,
      entry.status || 'SENT',
      entry.webhookUrl || null,
      typeof entry.response === 'object' ? JSON.stringify(entry.response) : (entry.response || null)
    ]);
  }

  getWhatsAppBroadcasts(limit = 20) {
    return this.query(
      'SELECT * FROM whatsapp_broadcast_logs ORDER BY id DESC LIMIT ?',
      [limit]
    );
  }

  getLatestWhatsAppBroadcast() {
    return this.get(
      'SELECT * FROM whatsapp_broadcast_logs ORDER BY id DESC LIMIT 1'
    );
  }
}

export const sqlDB = new DatabaseClient();
export default sqlDB;
