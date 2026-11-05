// services/certificateService.js
// Ultra-Prestigious Government/Hospital-Grade Clinical Merit Credential Engine
// Maa Park Technologies (maapark.in) & MaaCare Platforms

import crypto from 'crypto';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';

const CERT_SIGNING_SALT = process.env.CERT_SIGNING_SALT || 'MAA_PARK_CRYPTOGRAPHIC_SALT_2026_CLINICAL_CHAMPIONSHIP';

/**
 * 🔒 Generates SHA-256 Digital Verification Hash for Certificate
 */
export function generateCertificateHash(data) {
  const { rollNumber, score, certificateId, stateRank } = data;
  const payload = `${rollNumber}|${score}|${certificateId}|${stateRank || 1}|${CERT_SIGNING_SALT}`;
  return crypto.createHash('sha256').update(payload).digest('hex').toUpperCase();
}

/**
 * 🔍 Verifies Certificate Digital Verification Hash
 */
export function verifyCertificateHash(data, providedHash) {
  const calculated = generateCertificateHash(data);
  return calculated === (providedHash || '').toUpperCase().trim();
}

/**
 * 📜 Generates Luxury 4-Signatory Cryptographic PDF Certificate (A4 Landscape 842x595)
 */
export async function generateCryptographicCertificatePDF(data) {
  const {
    name = 'CANDIDATE NAME',
    college = 'Dispur Nursing Institute, Guwahati',
    state = 'Assam',
    course = 'B.Sc Nursing',
    rank = 1,
    score = 52.5,
    maxScore = 60,
    rollNumber = 'MPC-2026-NEF-1042',
    certificateId = 'CERT-MPC2026-DEMO99',
    percentile = '99.4%',
    examDate = '13 September 2026',
  } = data;

  const pdfDoc = await PDFDocument.create();
  // Standard A4 Landscape: 842.0 x 595.0 points (300 DPI layout grid)
  const page = pdfDoc.addPage([842, 595]);
  const { width, height } = page.getSize();

  // Embed standard system core fonts
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const timesRomanItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const timesRomanBoldItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);

  // ─── 1. LUXURY BACKGROUND: Clean Off-White Ivory (#FAFAF9) ───
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: rgb(0.98, 0.98, 0.976), // #FAFAF9
  });

  // ─── 2. SUBTLE WATERMARK SEAL (5% opacity in center) ───
  page.drawCircle({
    x: width / 2,
    y: height / 2 - 10,
    size: 190,
    borderColor: rgb(0.051, 0.58, 0.533), // Teal
    borderWidth: 1.2,
    color: rgb(0.95, 0.97, 0.965),
    opacity: 0.25,
  });
  page.drawCircle({
    x: width / 2,
    y: height / 2 - 10,
    size: 165,
    borderColor: rgb(0.851, 0.467, 0.024), // Gold
    borderWidth: 0.8,
    opacity: 0.2,
  });
  page.drawText('MAA PARK TECHNOLOGIES · MAACARE CLINICAL EXCELLENCE', {
    x: width / 2 - 210,
    y: height / 2 - 14,
    size: 12,
    font: helveticaBold,
    color: rgb(0.051, 0.58, 0.533),
    opacity: 0.12,
  });

  // ─── 3. COLOR THEME & FRAMING: Outer Teal + Inset Royal Gold ───
  // Outer Border: 4pt Clinical Teal (#0D9488)
  page.drawRectangle({
    x: 18,
    y: 18,
    width: width - 36,
    height: height - 36,
    borderColor: rgb(0.051, 0.58, 0.533), // #0D9488
    borderWidth: 4,
  });

  // Inner Inset Border: 1.5pt Royal Gold (#D97706)
  page.drawRectangle({
    x: 27,
    y: 27,
    width: width - 54,
    height: height - 54,
    borderColor: rgb(0.851, 0.467, 0.024), // #D97706
    borderWidth: 1.5,
  });

  // Corner Flourishes (Geometric vector ornaments)
  const drawCornerOrnament = (cx, cy) => {
    page.drawRectangle({
      x: cx - 5,
      y: cy - 5,
      width: 10,
      height: 10,
      color: rgb(0.851, 0.467, 0.024), // Gold center square
    });
    page.drawCircle({
      x: cx,
      y: cy,
      size: 8,
      borderColor: rgb(0.051, 0.58, 0.533), // Teal ring
      borderWidth: 1,
    });
  };
  drawCornerOrnament(27, 27);
  drawCornerOrnament(width - 27, 27);
  drawCornerOrnament(27, height - 27);
  drawCornerOrnament(width - 27, height - 27);

  // ─── 4. TYPOGRAPHY & HEADER HIERARCHY ───
  // Institution Name (14pt, Bold, Tracking +3, Slate-900)
  const instTitle = 'MAA PARK TECHNOLOGIES & MAACARE PLATFORMS';
  page.drawText(instTitle, {
    x: width / 2 - (instTitle.length * 4.3),
    y: height - 58,
    size: 14,
    font: helveticaBold,
    color: rgb(0.059, 0.09, 0.165), // #0F172A (Slate-900)
  });

  // Sub-header line
  const subGov = 'GOVERNMENT OF ASSAM & RECOGNIZED CLINICAL PARTNERSHIP ECOSYSTEM';
  page.drawText(subGov, {
    x: width / 2 - (subGov.length * 2.55),
    y: height - 74,
    size: 8,
    font: helveticaBold,
    color: rgb(0.051, 0.58, 0.533), // Teal
  });

  // Main Event Title (18pt, Bold, Teal #0D9488)
  const mainTitle = 'NATIONAL CLINICAL & DIGITAL HEALTH NURSING CHAMPIONSHIP 2026';
  page.drawText(mainTitle, {
    x: width / 2 - (mainTitle.length * 4.6),
    y: height - 100,
    size: 16.5,
    font: helveticaBold,
    color: rgb(0.051, 0.58, 0.533),
  });

  // Soft Gold Ribbon Container
  page.drawRectangle({
    x: width / 2 - 200,
    y: height - 138,
    width: 400,
    height: 28,
    color: rgb(0.992, 0.957, 0.89), // Soft gold container #FEF3C7
    borderColor: rgb(0.851, 0.467, 0.024), // Amber-600 #D97706
    borderWidth: 1.2,
  });

  const ribbonText = 'CERTIFICATE OF CLINICAL EXCELLENCE & MERIT';
  page.drawText(ribbonText, {
    x: width / 2 - (ribbonText.length * 3.8),
    y: height - 128,
    size: 12.5,
    font: helveticaBold,
    color: rgb(0.706, 0.322, 0.0), // Deep Amber-700
  });

  // ─── 5. CANDIDATE PRESENTATION BLOCK ───
  const presText = 'This is proudly presented to';
  page.drawText(presText, {
    x: width / 2 - (presText.length * 2.8),
    y: height - 162,
    size: 11,
    font: timesRomanItalic,
    color: rgb(0.392, 0.455, 0.545), // Slate-500
  });

  // Candidate Full Name (24pt, Bold, Deep Slate #0F172A)
  const candNameUpper = name.toUpperCase();
  const candNameWidth = candNameUpper.length * 7.5;
  const nameX = Math.max(50, width / 2 - candNameWidth);
  page.drawText(candNameUpper, {
    x: nameX,
    y: height - 194,
    size: 23,
    font: helveticaBold,
    color: rgb(0.059, 0.09, 0.165), // #0F172A
  });

  // Underline Accent below name
  page.drawLine({
    start: { x: nameX - 10, y: height - 202 },
    end: { x: nameX + candNameWidth * 2 + 10, y: height - 202 },
    thickness: 1.5,
    color: rgb(0.051, 0.58, 0.533), // Teal underline
  });

  // Roll Number & Program Credentials
  const credLine = `Roll Number: ${rollNumber}   ·   Program: ${course}   ·   State: ${state}`;
  page.drawText(credLine, {
    x: width / 2 - (credLine.length * 2.9),
    y: height - 222,
    size: 10,
    font: helveticaBold,
    color: rgb(0.278, 0.333, 0.412), // Slate-700
  });

  // Institutional Achievement Paragraph
  const achText1 = `of ${college}`;
  const achText2 = `for demonstrating outstanding clinical acumen, digital health proficiency, and achieving Score: ${score}/${maxScore}`;
  const achText3 = `(Percentile: ${percentile} · State Rank: #${rank}) in the National Championship held on ${examDate}.`;

  page.drawText(achText1, {
    x: Math.max(50, width / 2 - (achText1.length * 3.2)),
    y: height - 244,
    size: 11,
    font: helveticaBold,
    color: rgb(0.059, 0.09, 0.165),
  });

  page.drawText(achText2, {
    x: width / 2 - (achText2.length * 2.7),
    y: height - 264,
    size: 10,
    font: helvetica,
    color: rgb(0.278, 0.333, 0.412),
  });

  page.drawText(achText3, {
    x: width / 2 - (achText3.length * 2.7),
    y: height - 280,
    size: 10,
    font: helvetica,
    color: rgb(0.278, 0.333, 0.412),
  });

  // ─── 6. MERIT SCORECARD BADGE (Center Pill) ───
  page.drawRectangle({
    x: width / 2 - 230,
    y: height - 336,
    width: 460,
    height: 38,
    color: rgb(0.941, 0.965, 0.961), // #F0FDF4
    borderColor: rgb(0.051, 0.58, 0.533),
    borderWidth: 1,
  });

  page.drawText(`OFFICIAL SCORE: ${score} / ${maxScore}`, {
    x: width / 2 - 205,
    y: height - 322,
    size: 10.5,
    font: helveticaBold,
    color: rgb(0.051, 0.58, 0.533),
  });

  page.drawText(`STATE RANK: #${rank}`, {
    x: width / 2 - 45,
    y: height - 322,
    size: 10.5,
    font: helveticaBold,
    color: rgb(0.851, 0.467, 0.024),
  });

  page.drawText(`PERCENTILE: ${percentile}`, {
    x: width / 2 + 85,
    y: height - 322,
    size: 10.5,
    font: helveticaBold,
    color: rgb(0.059, 0.09, 0.165),
  });

  // ─── 7. SECURITY & CRYPTOGRAPHIC TRUST LAYER (Bottom Left) ───
  const certHash = generateCertificateHash({ rollNumber, score, certificateId, stateRank: rank });
  const shortHash = certHash.substring(0, 16);
  const verifyUrl = `https://maapark.in/championship-verify.html?id=${certificateId}`;

  // Dynamic QR Code (80x80 pt)
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 80,
    margin: 1,
    color: { dark: '#0F172A', light: '#FAFAF9' },
  });
  const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');
  const qrBytes = Buffer.from(qrBase64, 'base64');
  const qrImage = await pdfDoc.embedPng(qrBytes);

  page.drawImage(qrImage, {
    x: 42,
    y: 46,
    width: 78,
    height: 78,
  });

  // Security Badge & Metadata
  page.drawCircle({
    x: 46,
    y: 36,
    size: 4,
    color: rgb(0.051, 0.58, 0.533),
  });

  page.drawText('TAMPER-PROOF DIGITAL VERIFICATION', {
    x: 54,
    y: 33,
    size: 6.8,
    font: helveticaBold,
    color: rgb(0.051, 0.58, 0.533), // Teal
  });

  page.drawText(`ID: ${certificateId} · SHA256: ${shortHash}...`, {
    x: 42,
    y: 23,
    size: 6.2,
    font: helvetica,
    color: rgb(0.55, 0.6, 0.68),
  });

  // ─── 8. 4-SIGNATORY EXECUTIVE & CLINICAL BOARD (Bottom Grid Alignment) ───
  const cols = [
    {
      x: 135,
      sig: 'Dr. J. P. Sarma',
      name: 'Dr. Jayanta Prasad Sarma',
      desig1: 'Co-Founder & Advisor, MaaCare',
      desig2: 'Ex-MD, GNRC · World Bank Awardee',
    },
    {
      x: 308,
      sig: 'Prof. (Dr.) H. Bhuyan',
      name: 'Prof. (Dr.) Hemeswari Bhuyan',
      desig1: 'Founder & Mentor, MaaCare',
      desig2: 'Principal, DNI · Ex-Principal, RCN',
    },
    {
      x: 485,
      sig: 'Julfikar Ali',
      name: 'Julfikar Ali',
      desig1: 'Chief Innovation Officer',
      desig2: 'TNAI & Koita Laureate',
    },
    {
      x: 652,
      sig: 'Manirul Hussain',
      name: 'Manirul Hussain',
      desig1: 'Co-Founder, CEO & Lead Architect',
      desig2: 'TNAI & Koita Laureate',
    },
  ];

  const sigLineY = 96;

  cols.forEach((col) => {
    // Digital Cursive Vector Signature Simulation
    page.drawText(col.sig, {
      x: col.x + 4,
      y: sigLineY + 11,
      size: 12.5,
      font: timesRomanBoldItalic,
      color: rgb(0.051, 0.58, 0.533),
    });

    // Signature Rule Line
    page.drawLine({
      start: { x: col.x, y: sigLineY },
      end: { x: col.x + 145, y: sigLineY },
      thickness: 1,
      color: rgb(0.75, 0.8, 0.85),
    });

    // Printed Name
    page.drawText(col.name, {
      x: col.x,
      y: sigLineY - 13,
      size: 8.2,
      font: helveticaBold,
      color: rgb(0.059, 0.09, 0.165),
    });

    // Designation Line 1
    page.drawText(col.desig1, {
      x: col.x,
      y: sigLineY - 24,
      size: 6.8,
      font: helvetica,
      color: rgb(0.392, 0.455, 0.545),
    });

    // Designation Line 2
    page.drawText(col.desig2, {
      x: col.x,
      y: sigLineY - 34,
      size: 6.2,
      font: helvetica,
      color: rgb(0.55, 0.6, 0.68),
    });
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}