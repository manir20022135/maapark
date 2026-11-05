// ambassador-services.js
// Utility Services for MaaPark Brand Ambassador & App Promotion Hunt

import crypto from 'crypto';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';
import { AMBASSADOR_QUESTIONS } from './ambassador-questions.js';

// Strict Milestones (2026-2027 Campaign)
export const CAMPAIGN_MILESTONES = {
  CAMPAIGN_START: new Date('2026-09-01T00:00:00.000Z'),
  CAMPAIGN_END: new Date('2026-12-31T23:59:59.000Z'),
  WINNER_ANNOUNCEMENT: new Date('2027-01-01T00:00:00.000Z'), // 1 January 2027
  CERTIFICATE_UNLOCK: new Date('2027-01-10T00:00:00.000Z'),   // 10 January 2027
  ASSESSMENT_TIME_LIMIT_MINUTES: 25,
  TOTAL_QUESTIONS: 40,
  FEE_INR: 499,
};

/**
 * 1. Generates unique candidate ID: MP-AMB-2026-XXXX
 */
export function generateCandidateId() {
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase(); // 4 chars
  return `MP-AMB-2026-${rand}`;
}

/**
 * 2. Generates 1-Year Free Premium App Activation Code: MP-PREM-XXXX-XXXX
 */
export function generatePremiumActivationCode() {
  const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
  const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `MP-PREM-${part1}-${part2}`;
}

/**
 * 3. Generates Certificate ID: CERT-MP-AMB-XXXX
 */
export function generateCertificateId() {
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `CERT-MP-AMB-${rand}`;
}

/**
 * 4. Checks if certificate is unlocked for candidate
 * Locked until 10 January 2027 unless manually authorized by admin
 */
export function isCertificateUnlocked(candidate) {
  if (!candidate) return false;
  if (candidate.certificateReleased) return true;
  const now = new Date();
  return now >= CAMPAIGN_MILESTONES.CERTIFICATE_UNLOCK;
}

/**
 * 5. Calculate Score for Assessment (40 MCQs)
 * Returns raw score out of 40 and section breakdown
 */
export function calculateAssessmentScore(answers = {}) {
  let rawScore = 0;
  let appFeaturesScore = 0;
  let maternalWellnessScore = 0;
  let userEmpathyScore = 0;
  let marketingStrategyScore = 0;

  AMBASSADOR_QUESTIONS.forEach(q => {
    const candidateAnswer = answers[q.id];
    if (candidateAnswer && candidateAnswer.trim().toUpperCase() === q.correctId.toUpperCase()) {
      rawScore += 1;
      if (q.section === 'APP_FEATURES') appFeaturesScore += 1;
      else if (q.section === 'MATERNAL_WELLNESS') maternalWellnessScore += 1;
      else if (q.section === 'USER_EMPATHY') userEmpathyScore += 1;
      else if (q.section === 'MARKETING_STRATEGY') marketingStrategyScore += 1;
    }
  });

  return {
    rawScore,
    totalQuestions: AMBASSADOR_QUESTIONS.length,
    scoreDetails: {
      appFeaturesScore,
      maternalWellnessScore,
      userEmpathyScore,
      marketingStrategyScore,
      totalQuestions: AMBASSADOR_QUESTIONS.length,
    },
  };
}

/**
 * 6. Generates high-resolution verifiable PDF certificate for "Certified Maternal & Women’s Health Advocate"
 */
export async function generateAmbassadorCertificatePDF(candidate) {
  const {
    name = 'Candidate Name',
    candidateId = 'MP-AMB-2026-XXXX',
    certificateId = generateCertificateId(),
    city = 'Guwahati',
    state = 'Assam',
  } = candidate;

  const pdfDoc = await PDFDocument.create();
  // Standard A4 Landscape: 842.0 x 595.0 points
  const page = pdfDoc.addPage([842, 595]);
  const { width, height } = page.getSize();

  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

  // Background: Warm Ivory White
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: rgb(0.985, 0.985, 0.98),
  });

  // Dual Outer Decorative Borders (Teal & Gold)
  page.drawRectangle({
    x: 18,
    y: 18,
    width: width - 36,
    height: height - 36,
    borderColor: rgb(0.06, 0.45, 0.42), // Deep Forest Teal
    borderWidth: 3,
  });

  page.drawRectangle({
    x: 26,
    y: 26,
    width: width - 52,
    height: height - 52,
    borderColor: rgb(0.85, 0.65, 0.15), // Royal Gold
    borderWidth: 1.5,
  });

  // Corner Accents (Gold Rectangles)
  const cornerSize = 14;
  [[26, 26], [width - 26 - cornerSize, 26], [26, height - 26 - cornerSize], [width - 26 - cornerSize, height - 26 - cornerSize]].forEach(([cx, cy]) => {
    page.drawRectangle({
      x: cx,
      y: cy,
      width: cornerSize,
      height: cornerSize,
      color: rgb(0.85, 0.65, 0.15),
    });
  });

  // Central Subtle Watermark Seal
  page.drawCircle({
    x: width / 2,
    y: height / 2 - 10,
    size: 160,
    borderColor: rgb(0.06, 0.45, 0.42),
    borderWidth: 1,
    color: rgb(0.96, 0.98, 0.97),
    opacity: 0.35,
  });

  // Organization Header
  page.drawText('MAAPARK TECHNOLOGIES  •  MAACARE DIGITAL HEALTH', {
    x: width / 2 - 190,
    y: height - 68,
    size: 11,
    font: helveticaBold,
    color: rgb(0.06, 0.45, 0.42),
  });

  page.drawText('National Maternal & Young Women\'s Health Advocacy Initiative', {
    x: width / 2 - 170,
    y: height - 86,
    size: 9.5,
    font: helvetica,
    color: rgb(0.35, 0.4, 0.42),
  });

  // Title: Certificate of Merit & Advocacy
  page.drawText('OFFICIAL CREDENTIAL OF ADVOCACY', {
    x: width / 2 - 210,
    y: height - 130,
    size: 21,
    font: timesBold,
    color: rgb(0.12, 0.15, 0.2),
  });

  page.drawText('CERTIFIED MATERNAL & WOMEN\'S HEALTH ADVOCATE', {
    x: width / 2 - 250,
    y: height - 156,
    size: 15,
    font: helveticaBold,
    color: rgb(0.82, 0.52, 0.05), // Burnished Amber Gold
  });

  // Presentation Text
  page.drawText('This is to proudly certify that', {
    x: width / 2 - 80,
    y: height - 195,
    size: 12,
    font: timesItalic,
    color: rgb(0.3, 0.35, 0.4),
  });

  // Candidate Name (Prominent & Elegant)
  const candidateUpperName = name.toUpperCase();
  const nameWidth = timesBold.widthOfTextAtSize(candidateUpperName, 26);
  page.drawText(candidateUpperName, {
    x: width / 2 - nameWidth / 2,
    y: height - 232,
    size: 26,
    font: timesBold,
    color: rgb(0.06, 0.45, 0.42),
  });

  // Location & ID line
  const locationText = `of ${city}, ${state} • Candidate ID: ${candidateId}`;
  const locWidth = helvetica.widthOfTextAtSize(locationText, 11);
  page.drawText(locationText, {
    x: width / 2 - locWidth / 2,
    y: height - 256,
    size: 11,
    font: helvetica,
    color: rgb(0.4, 0.45, 0.5),
  });

  // Body Narrative
  const line1 = 'has successfully completed the comprehensive MaaPark Brand Ambassador & App Promotion Evaluation,';
  const line2 = 'demonstrating verified competence in Maternal Care, Adolescent Wellness, User Empathy & Crisis Intervention,';
  const line3 = 'and is hereby accredited as an official certified advocate for digital maternal healthcare in India.';

  const l1w = helvetica.widthOfTextAtSize(line1, 10.5);
  const l2w = helvetica.widthOfTextAtSize(line2, 10.5);
  const l3w = helvetica.widthOfTextAtSize(line3, 10.5);

  page.drawText(line1, { x: width / 2 - l1w / 2, y: height - 295, size: 10.5, font: helvetica, color: rgb(0.2, 0.25, 0.3) });
  page.drawText(line2, { x: width / 2 - l2w / 2, y: height - 315, size: 10.5, font: helvetica, color: rgb(0.2, 0.25, 0.3) });
  page.drawText(line3, { x: width / 2 - l3w / 2, y: height - 335, size: 10.5, font: helvetica, color: rgb(0.2, 0.25, 0.3) });

  // Milestone Badges & Metadata Box
  page.drawRectangle({
    x: 60,
    y: 80,
    width: 220,
    height: 90,
    color: rgb(0.95, 0.97, 0.97),
    borderColor: rgb(0.85, 0.9, 0.9),
    borderWidth: 1,
  });

  page.drawText('CREDENTIAL DETAILS', { x: 72, y: 152, size: 9, font: helveticaBold, color: rgb(0.06, 0.45, 0.42) });
  page.drawText(`Certificate ID: ${certificateId}`, { x: 72, y: 136, size: 8.5, font: helvetica, color: rgb(0.2, 0.25, 0.3) });
  page.drawText(`Issue Date: 10 January 2027`, { x: 72, y: 121, size: 8.5, font: helvetica, color: rgb(0.2, 0.25, 0.3) });
  page.drawText(`Governing Body: MaaPark Technologies`, { x: 72, y: 106, size: 8.5, font: helvetica, color: rgb(0.2, 0.25, 0.3) });
  page.drawText(`Verification URL: maapark.in/ambassador`, { x: 72, y: 91, size: 8.5, font: helvetica, color: rgb(0.1, 0.4, 0.7) });

  // Generate QR Code for instant online verification
  try {
    const verifyUrl = `https://maapark.in/ambassador?verify=${encodeURIComponent(certificateId)}`;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 120 });
    const qrImage = await pdfDoc.embedPng(qrDataUrl);
    page.drawImage(qrImage, {
      x: width / 2 - 40,
      y: 75,
      width: 80,
      height: 80,
    });
    page.drawText('Scan to Verify', {
      x: width / 2 - 28,
      y: 62,
      size: 8,
      font: helvetica,
      color: rgb(0.4, 0.45, 0.5),
    });
  } catch (err) {
    console.warn('QR Code embedding notice:', err.message);
  }

  // Signatory Section (Right Side)
  const sigX = width - 260;
  page.drawLine({
    start: { x: sigX, y: 110 },
    end: { x: sigX + 190, y: 110 },
    thickness: 1,
    color: rgb(0.3, 0.35, 0.4),
  });

  page.drawText('Prof. (Dr.) Hemeswari Bhuyan', {
    x: sigX + 15,
    y: 95,
    size: 10,
    font: helveticaBold,
    color: rgb(0.15, 0.2, 0.25),
  });

  page.drawText('Chief Clinical & Maternal Healthcare Advisor', {
    x: sigX + 2,
    y: 82,
    size: 8.5,
    font: helvetica,
    color: rgb(0.4, 0.45, 0.5),
  });

  page.drawText('MaaPark Platform Governing Committee', {
    x: sigX + 12,
    y: 70,
    size: 8,
    font: timesItalic,
    color: rgb(0.45, 0.5, 0.55),
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
