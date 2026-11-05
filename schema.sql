-- =====================================================================
-- MAA PARK TECHNOLOGIES — NATIONAL CHAMPIONSHIP 2026 DATABASE SCHEMA
-- Relational Schema for Candidates, Registrations, Exam Audits & Payments
-- Compatible with PostgreSQL (EC2 / RDS) & SQLite 3
-- =====================================================================

-- 1. Table: College Affiliates & SNA Welfare Ledger
CREATE TABLE IF NOT EXISTS college_affiliates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    referral_code VARCHAR(32) NOT NULL,
    coordinator_name VARCHAR(128) NOT NULL,
    role VARCHAR(64) DEFAULT 'Student Ambassador',
    college_name VARCHAR(255) NOT NULL,
    whatsapp VARCHAR(20) NOT NULL,
    upi_id VARCHAR(128),
    total_registrations INTEGER DEFAULT 0,
    fund_accrued_inr DECIMAL(10, 2) DEFAULT 0.00,
    payout_status VARCHAR(32) DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_affiliates_code ON college_affiliates(referral_code);

-- 2. Table: Candidates & Registrations Master
CREATE TABLE IF NOT EXISTS registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    roll_number VARCHAR(64) NOT NULL UNIQUE,
    full_name VARCHAR(128) NOT NULL,
    whatsapp VARCHAR(20) NOT NULL,
    email VARCHAR(128),
    college VARCHAR(255) NOT NULL,
    college_code VARCHAR(32),
    course VARCHAR(64),
    year_level VARCHAR(32),
    state VARCHAR(64) DEFAULT 'Assam',
    pricing_tier VARCHAR(32) DEFAULT 'Tier 1',
    fee_paid_inr DECIMAL(10, 2) DEFAULT 99.00,
    referral_code VARCHAR(32),
    sna_welfare_inr DECIMAL(10, 2) DEFAULT 15.00,
    razorpay_order_id VARCHAR(64),
    razorpay_payment_id VARCHAR(64),
    payment_status VARCHAR(32) DEFAULT 'pending',
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    raw_metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_reg_roll ON registrations(roll_number);
CREATE INDEX IF NOT EXISTS idx_reg_whatsapp ON registrations(whatsapp);
CREATE INDEX IF NOT EXISTS idx_reg_status ON registrations(payment_status);
CREATE INDEX IF NOT EXISTS idx_reg_ref ON registrations(referral_code);

-- 3. Table: Exam Results & Final Scorecards
CREATE TABLE IF NOT EXISTS exam_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    roll_number VARCHAR(64) NOT NULL UNIQUE,
    full_name VARCHAR(128) NOT NULL,
    college VARCHAR(255),
    score DECIMAL(5, 2) DEFAULT 0.00,
    correct_count INTEGER DEFAULT 0,
    incorrect_count INTEGER DEFAULT 0,
    unattempted_count INTEGER DEFAULT 0,
    percentage DECIMAL(5, 2) DEFAULT 0.00,
    state_rank VARCHAR(32) DEFAULT '--',
    certificate_id VARCHAR(64) UNIQUE,
    certificate_url TEXT,
    tab_switches INTEGER DEFAULT 0,
    auto_submitted BOOLEAN DEFAULT 0,
    time_spent_seconds INTEGER DEFAULT 0,
    time_spent_formatted VARCHAR(32) DEFAULT '0 mins',
    exam_status VARCHAR(32) DEFAULT 'VALID', -- 'VALID', 'DISQUALIFIED', 'MANUAL_VERIFIED'
    disqualification_reason TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (roll_number) REFERENCES registrations(roll_number) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_results_roll ON exam_results(roll_number);
CREATE INDEX IF NOT EXISTS idx_results_score ON exam_results(score DESC);
CREATE INDEX IF NOT EXISTS idx_results_status ON exam_results(exam_status);

-- 4. Table: Itemized Question-by-Question Audit
CREATE TABLE IF NOT EXISTS exam_audits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    roll_number VARCHAR(64) NOT NULL,
    candidate_name VARCHAR(128),
    college VARCHAR(255),
    question_number INTEGER NOT NULL,
    section VARCHAR(8) DEFAULT 'A',
    question_id VARCHAR(32),
    candidate_answer VARCHAR(32),
    correct_answer VARCHAR(32),
    is_correct BOOLEAN DEFAULT 0,
    marks_awarded DECIMAL(4, 2) DEFAULT 0.00,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (roll_number) REFERENCES registrations(roll_number) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_audit_roll ON exam_audits(roll_number);
CREATE INDEX IF NOT EXISTS idx_audit_qno ON exam_audits(question_number);

-- 5. Table: Razorpay & Direct Payment Transactions
CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_id VARCHAR(64) NOT NULL UNIQUE,
    order_id VARCHAR(64),
    amount_inr DECIMAL(10, 2) DEFAULT 99.00,
    currency VARCHAR(8) DEFAULT 'INR',
    customer_phone VARCHAR(20),
    customer_email VARCHAR(128),
    roll_number VARCHAR(64),
    candidate_name VARCHAR(128),
    college VARCHAR(255),
    payment_status VARCHAR(32) DEFAULT 'Captured', -- 'Captured', 'Failed', 'Refunded'
    payment_date VARCHAR(32),
    raw_payload TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_id ON payments(payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_phone ON payments(customer_phone);
CREATE INDEX IF NOT EXISTS idx_payments_roll ON payments(roll_number);

-- =====================================================================
-- MODERN ANALYTICAL VIEWS
-- =====================================================================

-- View 1: Complete Candidate 360 View (Registration + Payment + Exam Result)
CREATE VIEW IF NOT EXISTS v_candidate_360 AS
SELECT 
    r.id AS registration_id,
    r.roll_number,
    r.full_name,
    r.whatsapp,
    r.email,
    r.college,
    r.course,
    r.year_level,
    r.state,
    r.pricing_tier,
    r.fee_paid_inr,
    r.payment_status,
    p.payment_id AS verified_payment_id,
    p.payment_status AS razorpay_status,
    er.score,
    er.correct_count,
    er.incorrect_count,
    er.unattempted_count,
    er.percentage,
    er.state_rank,
    er.tab_switches,
    er.exam_status,
    er.disqualification_reason,
    er.certificate_id,
    er.certificate_url,
    er.submitted_at,
    r.referral_code,
    ca.coordinator_name AS affiliate_coordinator
FROM registrations r
LEFT JOIN payments p ON (
    p.roll_number = r.roll_number OR 
    SUBSTR(p.customer_phone, -10) = SUBSTR(REPLACE(r.whatsapp, ' ', ''), -10)
)
LEFT JOIN exam_results er ON er.roll_number = r.roll_number
LEFT JOIN college_affiliates ca ON ca.referral_code = r.referral_code;

-- View 2: Official Merit List (Sorted by Score Descending, Valid First)
CREATE VIEW IF NOT EXISTS v_merit_list AS
SELECT 
    ROW_NUMBER() OVER (
        PARTITION BY er.exam_status 
        ORDER BY er.score DESC, er.correct_count DESC, er.time_spent_seconds ASC
    ) AS merit_position,
    er.roll_number,
    er.full_name,
    er.college,
    er.score,
    er.correct_count,
    er.incorrect_count,
    er.unattempted_count,
    er.percentage,
    er.tab_switches,
    er.exam_status,
    er.disqualification_reason,
    er.time_spent_formatted,
    er.certificate_url
FROM exam_results er
ORDER BY 
    CASE WHEN er.exam_status = 'VALID' THEN 1 ELSE 2 END,
    er.score DESC;

-- View 3: College Performance & SNA Welfare Ledger Summary
CREATE VIEW IF NOT EXISTS v_college_summary AS
SELECT 
    r.college,
    COUNT(r.id) AS total_students,
    SUM(CASE WHEN r.payment_status IN ('paid', 'VERIFIED') OR p.payment_status = 'Captured' THEN 1 ELSE 0 END) AS paid_students,
    SUM(CASE WHEN er.id IS NOT NULL THEN 1 ELSE 0 END) AS exam_appeared,
    AVG(CASE WHEN er.exam_status = 'VALID' THEN er.score ELSE NULL END) AS average_score,
    SUM(COALESCE(r.sna_welfare_inr, 15.00)) AS total_sna_fund_due
FROM registrations r
LEFT JOIN payments p ON (p.roll_number = r.roll_number OR SUBSTR(p.customer_phone, -10) = SUBSTR(REPLACE(r.whatsapp, ' ', ''), -10))
LEFT JOIN exam_results er ON er.roll_number = r.roll_number
GROUP BY r.college
ORDER BY total_students DESC;
