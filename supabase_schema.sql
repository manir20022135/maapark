-- =====================================================================
-- MAA PARK TECHNOLOGIES — SUPABASE (POSTGRESQL) SCHEMA
-- Compatible with Supabase PostgreSQL 15+
-- Paste this script directly into Supabase Dashboard -> SQL Editor -> Run
-- =====================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Table: College Affiliates & SNA Welfare Ledger
CREATE TABLE IF NOT EXISTS college_affiliates (
    id BIGSERIAL PRIMARY KEY,
    referral_code VARCHAR(32) NOT NULL,
    coordinator_name VARCHAR(128) NOT NULL,
    role VARCHAR(64) DEFAULT 'Student Ambassador',
    college_name VARCHAR(255) NOT NULL,
    whatsapp VARCHAR(20) NOT NULL,
    upi_id VARCHAR(128),
    total_registrations INTEGER DEFAULT 0,
    fund_accrued_inr NUMERIC(10, 2) DEFAULT 0.00,
    payout_status VARCHAR(32) DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliates_code ON college_affiliates(referral_code);

-- 2. Table: Candidates & Registrations Master
CREATE TABLE IF NOT EXISTS registrations (
    id BIGSERIAL PRIMARY KEY,
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
    fee_paid_inr NUMERIC(10, 2) DEFAULT 99.00,
    referral_code VARCHAR(32),
    sna_welfare_inr NUMERIC(10, 2) DEFAULT 15.00,
    razorpay_order_id VARCHAR(64),
    razorpay_payment_id VARCHAR(64),
    payment_status VARCHAR(32) DEFAULT 'pending',
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    raw_metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_reg_roll ON registrations(roll_number);
CREATE INDEX IF NOT EXISTS idx_reg_whatsapp ON registrations(whatsapp);
CREATE INDEX IF NOT EXISTS idx_reg_status ON registrations(payment_status);
CREATE INDEX IF NOT EXISTS idx_reg_ref ON registrations(referral_code);

-- 3. Table: Exam Results & Final Scorecards
CREATE TABLE IF NOT EXISTS exam_results (
    id BIGSERIAL PRIMARY KEY,
    roll_number VARCHAR(64) NOT NULL UNIQUE REFERENCES registrations(roll_number) ON UPDATE CASCADE ON DELETE CASCADE,
    full_name VARCHAR(128) NOT NULL,
    college VARCHAR(255),
    score NUMERIC(5, 2) DEFAULT 0.00,
    correct_count INTEGER DEFAULT 0,
    incorrect_count INTEGER DEFAULT 0,
    unattempted_count INTEGER DEFAULT 0,
    percentage NUMERIC(5, 2) DEFAULT 0.00,
    state_rank VARCHAR(32) DEFAULT '--',
    certificate_id VARCHAR(64) UNIQUE,
    certificate_url TEXT,
    tab_switches INTEGER DEFAULT 0,
    auto_submitted BOOLEAN DEFAULT FALSE,
    time_spent_seconds INTEGER DEFAULT 0,
    time_spent_formatted VARCHAR(32) DEFAULT '0 mins',
    exam_status VARCHAR(32) DEFAULT 'VALID', -- 'VALID', 'DISQUALIFIED', 'MANUAL_VERIFIED'
    disqualification_reason TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_results_roll ON exam_results(roll_number);
CREATE INDEX IF NOT EXISTS idx_results_score ON exam_results(score DESC);
CREATE INDEX IF NOT EXISTS idx_results_status ON exam_results(exam_status);

-- 4. Table: Itemized Question-by-Question Audit
CREATE TABLE IF NOT EXISTS exam_audits (
    id BIGSERIAL PRIMARY KEY,
    roll_number VARCHAR(64) NOT NULL REFERENCES registrations(roll_number) ON UPDATE CASCADE ON DELETE CASCADE,
    candidate_name VARCHAR(128),
    college VARCHAR(255),
    question_number INTEGER NOT NULL,
    section VARCHAR(8) DEFAULT 'A',
    question_id VARCHAR(32),
    candidate_answer VARCHAR(32),
    correct_answer VARCHAR(32),
    is_correct BOOLEAN DEFAULT FALSE,
    marks_awarded NUMERIC(4, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_roll ON exam_audits(roll_number);
CREATE INDEX IF NOT EXISTS idx_audit_qno ON exam_audits(question_number);

-- 5. Table: Razorpay & Direct Payment Transactions
CREATE TABLE IF NOT EXISTS payments (
    id BIGSERIAL PRIMARY KEY,
    payment_id VARCHAR(64) NOT NULL UNIQUE,
    order_id VARCHAR(64),
    amount_inr NUMERIC(10, 2) DEFAULT 99.00,
    currency VARCHAR(8) DEFAULT 'INR',
    customer_phone VARCHAR(20),
    customer_email VARCHAR(128),
    roll_number VARCHAR(64),
    candidate_name VARCHAR(128),
    college VARCHAR(255),
    payment_status VARCHAR(32) DEFAULT 'Captured',
    payment_date VARCHAR(32),
    raw_payload TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_id ON payments(payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_phone ON payments(customer_phone);
CREATE INDEX IF NOT EXISTS idx_payments_roll ON payments(roll_number);

-- 6. Table: WhatsApp Broadcast Logs
CREATE TABLE IF NOT EXISTS whatsapp_broadcast_logs (
    id BIGSERIAL PRIMARY KEY,
    broadcast_date TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    stats_snapshot TEXT,
    question_id TEXT,
    dispatch_status TEXT DEFAULT 'SENT',
    webhook_url TEXT,
    response_payload TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Table: Collaboration Messages (Contact Form)
CREATE TABLE IF NOT EXISTS collaboration_messages (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(32) DEFAULT 'new',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Table: Team Members
CREATE TABLE IF NOT EXISTS team_members (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(255) NOT NULL,
    bio TEXT,
    photo_url TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Table: Ambassador Candidates
CREATE TABLE IF NOT EXISTS ambassador_candidates (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    whatsapp VARCHAR(32) NOT NULL,
    email VARCHAR(255),
    college VARCHAR(255),
    referral_code VARCHAR(64),
    score NUMERIC(5, 2) DEFAULT 0.00,
    status VARCHAR(32) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Table: Growth Leads
CREATE TABLE IF NOT EXISTS growth_leads (
    id BIGSERIAL PRIMARY KEY,
    full_name VARCHAR(128),
    whatsapp VARCHAR(32) NOT NULL,
    college VARCHAR(255),
    source VARCHAR(64) DEFAULT 'quiz',
    score NUMERIC(5, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- POSTGRESQL ANALYTICAL VIEWS
-- =====================================================================

-- View 1: Complete Candidate 360 View
CREATE OR REPLACE VIEW v_candidate_360 AS
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
    RIGHT(REGEXP_REPLACE(p.customer_phone, '\D', '', 'g'), 10) = RIGHT(REGEXP_REPLACE(r.whatsapp, '\D', '', 'g'), 10)
)
LEFT JOIN exam_results er ON er.roll_number = r.roll_number
LEFT JOIN college_affiliates ca ON ca.referral_code = r.referral_code;

-- View 2: Official Merit List
CREATE OR REPLACE VIEW v_merit_list AS
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

-- View 3: College Performance Summary
CREATE OR REPLACE VIEW v_college_summary AS
SELECT 
    r.college,
    COUNT(r.id) AS total_students,
    SUM(CASE WHEN r.payment_status IN ('paid', 'VERIFIED') OR p.payment_status = 'Captured' THEN 1 ELSE 0 END) AS paid_students,
    SUM(CASE WHEN er.id IS NOT NULL THEN 1 ELSE 0 END) AS exam_appeared,
    AVG(CASE WHEN er.exam_status = 'VALID' THEN er.score ELSE NULL END) AS average_score,
    SUM(COALESCE(r.sna_welfare_inr, 15.00)) AS total_sna_fund_due
FROM registrations r
LEFT JOIN payments p ON (
    p.roll_number = r.roll_number OR 
    RIGHT(REGEXP_REPLACE(p.customer_phone, '\D', '', 'g'), 10) = RIGHT(REGEXP_REPLACE(r.whatsapp, '\D', '', 'g'), 10)
)
LEFT JOIN exam_results er ON er.roll_number = r.roll_number
GROUP BY r.college
ORDER BY total_students DESC;

