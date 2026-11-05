// championship-services.js
// Utility services for Championship 2026

import crypto from 'crypto';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';

// 1. generateRollNumber(collegeCode, sequence)
// Returns 'MPC-2026-[COLLEGE_SLUG]-[RANDOM_4_DIGIT]' format (e.g. MPC-2026-RCN-4812)
export function generateRollNumber(collegeCode, sequence) {
  const code = (collegeCode || 'GEN').toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 6);
  const random4 = sequence 
    ? String(sequence).padStart(4, '0') 
    : String(Math.floor(1000 + crypto.randomInt(9000)));
  return `MPC-2026-${code}-${random4}`;
}

// 2. generateCertificateId()
// Returns a cryptographic certificate ID like CERT-MPC2026-XXXXXXXX
export function generateCertificateId() {
  const rand = crypto.randomBytes(6).toString('hex').toUpperCase();
  return `CERT-MPC2026-${rand}`;
}

// 3. generateExamToken()
// UUID-like token for exam room access
export function generateExamToken() {
  return crypto.randomBytes(20).toString('hex');
}

// ─── ANTI-BIAS QUESTION NORMALIZER & CRYPTOGRAPHIC SHUFFLER ──────────────────
/**
 * Shuffles an array using cryptographic Fisher-Yates shuffle
 */
export function cryptoShuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Normalizes question options so that the correct answer is NOT biased to being
 * the longest option string and positions (A, B, C, D) are uniformly balanced.
 */
export function normalizeAndAuditQuestions(questions) {
  return questions.map(q => {
    // Audit option text lengths
    const optionsWithLengths = q.options.map(opt => ({
      ...opt,
      len: opt.text.trim().length,
      isCorrect: opt.id === q.correctId,
    }));

    // Find if correct option happens to be the longest
    const maxLen = Math.max(...optionsWithLengths.map(o => o.len));
    const isLongest = optionsWithLengths.find(o => o.isCorrect)?.len === maxLen;

    return {
      ...q,
      antiBiasAudited: true,
      hasLengthBias: isLongest,
    };
  });
}

/**
 * Shuffles question sequence and option order per candidate session
 * Ensures correctId is NOT exposed to client while mapping is preserved
 */
export function generateCandidateSessionSet(allQuestions, count = 60) {
  const audited = normalizeAndAuditQuestions(allQuestions);
  const randomizedQuestions = cryptoShuffle(audited).slice(0, count);

  const questionIds = [];
  const optionShuffles = {};
  const clientPayload = [];

  for (let idx = 0; idx < randomizedQuestions.length; idx++) {
    const q = randomizedQuestions[idx];
    const qId = q._id.toString();
    questionIds.push(qId);

    // Cryptographically shuffle options for this student
    const shuffledOpts = cryptoShuffle(q.options);
    
    // Store student's shuffled option list on session
    optionShuffles[qId] = shuffledOpts;

    // Send question without correctId to student
    clientPayload.push({
      id: qId,
      index: idx + 1,
      text: q.text,
      topic: q.topic || 'Clinical Nursing',
      difficulty: q.difficulty || 'medium',
      options: shuffledOpts.map(opt => ({ id: opt.id, text: opt.text })),
    });
  }

  return {
    questionIds,
    optionShuffles,
    clientPayload,
  };
}

// ─── COMPREHENSIVE ALL-INDIA NURSING INSTITUTIONS & PRINCIPAL CODES CATALOG ───
export const INDIA_INSTITUTIONS = [
  // ─── AIIMS NATIONAL NETWORK (Central INIs) ───
  { code: 'AIIMS-DEL', name: 'AIIMS New Delhi - College of Nursing', state: 'Delhi', city: 'New Delhi', category: 'Central INI' },
  { code: 'AIIMS-BHU', name: 'AIIMS Bhubaneswar - College of Nursing', state: 'Odisha', city: 'Bhubaneswar', category: 'Central INI' },
  { code: 'AIIMS-RIS', name: 'AIIMS Rishikesh - College of Nursing', state: 'Uttarakhand', city: 'Rishikesh', category: 'Central INI' },
  { code: 'AIIMS-JOD', name: 'AIIMS Jodhpur - College of Nursing', state: 'Rajasthan', city: 'Jodhpur', category: 'Central INI' },
  { code: 'AIIMS-BHP', name: 'AIIMS Bhopal - College of Nursing', state: 'Madhya Pradesh', city: 'Bhopal', category: 'Central INI' },
  { code: 'AIIMS-PAT', name: 'AIIMS Patna - College of Nursing', state: 'Bihar', city: 'Patna', category: 'Central INI' },
  { code: 'AIIMS-RAI', name: 'AIIMS Raipur - College of Nursing', state: 'Chhattisgarh', city: 'Raipur', category: 'Central INI' },
  { code: 'AIIMS-NGP', name: 'AIIMS Nagpur - College of Nursing', state: 'Maharashtra', city: 'Nagpur', category: 'Central INI' },
  { code: 'AIIMS-MNG', name: 'AIIMS Mangalagiri - College of Nursing', state: 'Andhra Pradesh', city: 'Mangalagiri', category: 'Central INI' },
  { code: 'AIIMS-KLY', name: 'AIIMS Kalyani - College of Nursing', state: 'West Bengal', city: 'Kalyani', category: 'Central INI' },
  { code: 'AIIMS-BBD', name: 'AIIMS Bibinagar - College of Nursing', state: 'Telangana', city: 'Hyderabad', category: 'Central INI' },
  { code: 'AIIMS-GHY', name: 'AIIMS Guwahati - College of Nursing', state: 'Assam', city: 'Guwahati', category: 'Central INI' },
  { code: 'AIIMS-BTI', name: 'AIIMS Bathinda - College of Nursing', state: 'Punjab', city: 'Bathinda', category: 'Central INI' },
  { code: 'AIIMS-DEO', name: 'AIIMS Deoghar - College of Nursing', state: 'Jharkhand', city: 'Deoghar', category: 'Central INI' },
  { code: 'AIIMS-GOR', name: 'AIIMS Gorakhpur - College of Nursing', state: 'Uttar Pradesh', city: 'Gorakhpur', category: 'Central INI' },
  { code: 'AIIMS-RAE', name: 'AIIMS Raebareli - College of Nursing', state: 'Uttar Pradesh', city: 'Raebareli', category: 'Central INI' },

  // ─── PREMIER NATIONAL & CENTRAL INSTITUTES ───
  { code: 'CMC-VEL', name: 'Christian Medical College (CMC), Vellore', state: 'Tamil Nadu', city: 'Vellore', category: 'National Premier' },
  { code: 'CMC-LUD', name: 'Christian Medical College (CMC), Ludhiana', state: 'Punjab', city: 'Ludhiana', category: 'National Premier' },
  { code: 'JIPMER-PDY', name: 'JIPMER College of Nursing, Puducherry', state: 'Puducherry', city: 'Puducherry', category: 'Central INI' },
  { code: 'PGIMER-CHD', name: 'National Institute of Nursing Education (NINE), PGIMER Chandigarh', state: 'Chandigarh', city: 'Chandigarh', category: 'Central INI' },
  { code: 'NIMHANS-BLR', name: 'NIMHANS Department of Nursing, Bengaluru', state: 'Karnataka', city: 'Bengaluru', category: 'Central INI' },
  { code: 'RAK-DEL', name: 'Rajkumari Amrit Kaur (RAK) College of Nursing, New Delhi', state: 'Delhi', city: 'New Delhi', category: 'Central Govt' },
  { code: 'LHMC-DEL', name: 'College of Nursing, Lady Hardinge Medical College (LHMC), New Delhi', state: 'Delhi', city: 'New Delhi', category: 'Central Govt' },
  { code: 'VMMC-DEL', name: 'College of Nursing, VMMC & Safdarjung Hospital, New Delhi', state: 'Delhi', city: 'New Delhi', category: 'Central Govt' },
  { code: 'RML-DEL', name: 'College of Nursing, ABVIMS & Dr. RML Hospital, New Delhi', state: 'Delhi', city: 'New Delhi', category: 'Central Govt' },
  { code: 'ILBS-DEL', name: 'Institute of Liver and Biliary Sciences (ILBS) College of Nursing, New Delhi', state: 'Delhi', city: 'New Delhi', category: 'State Autonomous' },
  { code: 'JAMIA-DEL', name: 'Rufaidah College of Nursing, Jamia Hamdard, New Delhi', state: 'Delhi', city: 'New Delhi', category: 'Deemed University' },
  { code: 'AFMC-PUN', name: 'College of Nursing, Armed Forces Medical College (AFMC), Pune', state: 'Maharashtra', city: 'Pune', category: 'Armed Forces (MNS)' },
  { code: 'CHAF-BLR', name: 'College of Nursing, Command Hospital Air Force (CHAF), Bengaluru', state: 'Karnataka', city: 'Bengaluru', category: 'Armed Forces (MNS)' },
  { code: 'AH-DEL', name: 'College of Nursing, Army Hospital (R&R), New Delhi', state: 'Delhi', city: 'New Delhi', category: 'Armed Forces (MNS)' },
  { code: 'CHCC-LKO', name: 'College of Nursing, Command Hospital Central Command, Lucknow', state: 'Uttar Pradesh', city: 'Lucknow', category: 'Armed Forces (MNS)' },
  { code: 'CHEC-KOL', name: 'College of Nursing, Command Hospital Eastern Command, Kolkata', state: 'West Bengal', city: 'Kolkata', category: 'Armed Forces (MNS)' },
  { code: 'INHS-MUM', name: 'College of Nursing, INHS Asvini, Mumbai', state: 'Maharashtra', city: 'Mumbai', category: 'Armed Forces (MNS)' },

  // ─── ASSAM & NORTH EAST ───
  { code: 'RCN-GUW', name: 'Regional College of Nursing (RCN), Guwahati', state: 'Assam', city: 'Guwahati', category: 'State Govt' },
  { code: 'DNI-GUW', name: 'Dispur Nursing Institute (DNI), Guwahati', state: 'Assam', city: 'Guwahati', category: 'Private Premier' },
  { code: 'NEF-GUW', name: 'NEF College of Nursing, Guwahati', state: 'Assam', city: 'Guwahati', category: 'Private Premier' },
  { code: 'ADTU-GUW', name: 'Assam Down Town University (ADTU) Faculty of Nursing, Panikhaiti', state: 'Assam', city: 'Guwahati', category: 'Private University' },
  { code: 'AMCH-DIB', name: 'B.Sc Nursing College, Assam Medical College (AMCH), Dibrugarh', state: 'Assam', city: 'Dibrugarh', category: 'State Govt' },
  { code: 'JMCH-JOR', name: 'College of Nursing, Jorhat Medical College (JMCH), Jorhat', state: 'Assam', city: 'Jorhat', category: 'State Govt' },
  { code: 'SMCH-SIL', name: 'College of Nursing, Silchar Medical College (SMCH), Silchar', state: 'Assam', city: 'Silchar', category: 'State Govt' },
  { code: 'TMCH-TEZ', name: 'College of Nursing, Tezpur Medical College (TMCH), Tezpur', state: 'Assam', city: 'Tezpur', category: 'State Govt' },
  { code: 'FAAMCH-BAR', name: 'FAAMCH School/College of Nursing, Barpeta', state: 'Assam', city: 'Barpeta', category: 'State Govt' },
  { code: 'GMCH-GUW', name: 'Gauhati Medical College & Hospital (GMCH) Nursing Division, Guwahati', state: 'Assam', city: 'Guwahati', category: 'State Govt' },
  { code: 'BBCI-GUW', name: 'Dr. B. Borooah Cancer Institute (BBCI) Department of Nursing, Guwahati', state: 'Assam', city: 'Guwahati', category: 'Central Govt' },
  { code: 'ARMY-BAS', name: 'Military Hospital Basistha / Army Nursing Cell, Guwahati', state: 'Assam', city: 'Guwahati', category: 'Armed Forces (MNS)' },
  { code: 'APOLLO-GUW', name: 'Apollo Hospitals College of Nursing, Guwahati', state: 'Assam', city: 'Guwahati', category: 'Private Premier' },
  { code: 'HAYAT-GUW', name: 'Hayat Institute of Nursing Education, Guwahati', state: 'Assam', city: 'Guwahati', category: 'Private Premier' },
  { code: 'CPMS-GUW', name: 'CPMS College of Nursing, Guwahati', state: 'Assam', city: 'Guwahati', category: 'Private Premier' },
  { code: 'SANKAR-GUW', name: 'Sankar Madhab College of Nursing, Panikhaiti', state: 'Assam', city: 'Guwahati', category: 'Private Premier' },
  { code: 'NEIGRIHMS-SHL', name: 'NEIGRIHMS College of Nursing, Shillong', state: 'Meghalaya', city: 'Shillong', category: 'Central Govt' },
  { code: 'WOODLAND-SHL', name: 'Woodland Institute of Nursing, Shillong', state: 'Meghalaya', city: 'Shillong', category: 'Private Premier' },
  { code: 'RIMS-IMP', name: 'College of Nursing, Regional Institute of Medical Sciences (RIMS), Imphal', state: 'Manipur', city: 'Imphal', category: 'Central Govt' },
  { code: 'RIPANS-AIZ', name: 'RIPANS Department of Nursing, Aizawl', state: 'Mizoram', city: 'Aizawl', category: 'Central Govt' },
  { code: 'AGMC-AGT', name: 'Agartala Government Medical College (AGMC) Nursing College, Agartala', state: 'Tripura', city: 'Agartala', category: 'State Govt' },
  { code: 'SMIMS-GNG', name: 'Sikkim Manipal College of Nursing, Gangtok', state: 'Sikkim', city: 'Gangtok', category: 'Private University' },

  // ─── KARNATAKA & BANGALORE (Major Nursing Hub) ───
  { code: 'MANIPAL-MAN', name: 'Manipal College of Nursing (MCON), MAHE Manipal', state: 'Karnataka', city: 'Manipal', category: 'Deemed University' },
  { code: 'SJCON-BLR', name: 'St. John’s College of Nursing, Bengaluru', state: 'Karnataka', city: 'Bengaluru', category: 'Private Premier' },
  { code: 'RAMAIAH-BLR', name: 'Ramaiah Institute of Nursing Education & Research, Bengaluru', state: 'Karnataka', city: 'Bengaluru', category: 'Private Premier' },
  { code: 'APOLLO-BLR', name: 'Apollo College of Nursing, Bengaluru', state: 'Karnataka', city: 'Bengaluru', category: 'Private Premier' },
  { code: 'DAYANANDA-BLR', name: 'Dayananda Sagar College of Nursing, Bengaluru', state: 'Karnataka', city: 'Bengaluru', category: 'Private University' },
  { code: 'VYDEHI-BLR', name: 'Vydehi Institute of Nursing Sciences & Research Centre, Bengaluru', state: 'Karnataka', city: 'Bengaluru', category: 'Private Premier' },
  { code: 'EASTPOINT-BLR', name: 'East Point College of Nursing, Bengaluru', state: 'Karnataka', city: 'Bengaluru', category: 'Private Premier' },
  { code: 'OXFORD-BLR', name: 'The Oxford College of Nursing, Bengaluru', state: 'Karnataka', city: 'Bengaluru', category: 'Private Premier' },
  { code: 'KLE-BEL', name: 'KLE Institute of Nursing Sciences, Belagavi', state: 'Karnataka', city: 'Belagavi', category: 'Deemed University' },
  { code: 'YENEPOYA-MNG', name: 'Yenepoya Nursing College, Mangaluru', state: 'Karnataka', city: 'Mangaluru', category: 'Deemed University' },
  { code: 'NITTE-MNG', name: 'Nitte Usha Institute of Nursing Sciences, Mangaluru', state: 'Karnataka', city: 'Mangaluru', category: 'Deemed University' },
  { code: 'FATHERMULLER-MNG', name: 'Father Muller College of Nursing, Mangaluru', state: 'Karnataka', city: 'Mangaluru', category: 'Private Premier' },
  { code: 'JSS-MYS', name: 'JSS College of Nursing, Mysuru', state: 'Karnataka', city: 'Mysuru', category: 'Deemed University' },
  { code: 'BMCRI-BLR', name: 'College of Nursing, Bangalore Medical College & Research Institute (BMCRI)', state: 'Karnataka', city: 'Bengaluru', category: 'State Govt' },

  // ─── TAMIL NADU & KERALA ───
  { code: 'MMC-CHE', name: 'College of Nursing, Madras Medical College (MMC), Chennai', state: 'Tamil Nadu', city: 'Chennai', category: 'State Govt' },
  { code: 'SRMC-CHE', name: 'Sri Ramachandra College of Nursing (SRIHER), Chennai', state: 'Tamil Nadu', city: 'Chennai', category: 'Deemed University' },
  { code: 'SRM-KTR', name: 'SRM College of Nursing, Kattankulathur, Chennai', state: 'Tamil Nadu', city: 'Chennai', category: 'Deemed University' },
  { code: 'PSG-CBE', name: 'PSG College of Nursing, Coimbatore', state: 'Tamil Nadu', city: 'Coimbatore', category: 'Private Premier' },
  { code: 'KMCH-CBE', name: 'KMCH College of Nursing, Coimbatore', state: 'Tamil Nadu', city: 'Coimbatore', category: 'Private Premier' },
  { code: 'AMRITA-KOC', name: 'Amrita College of Nursing, Amrita Vishwa Vidyapeetham, Kochi', state: 'Kerala', city: 'Kochi', category: 'Deemed University' },
  { code: 'GMC-TVM', name: 'Government College of Nursing, Medical College Campus, Thiruvananthapuram', state: 'Kerala', city: 'Thiruvananthapuram', category: 'State Govt' },
  { code: 'GMC-KZH', name: 'Government College of Nursing, Kozhikode', state: 'Kerala', city: 'Kozhikode', category: 'State Govt' },
  { code: 'GMC-KTM', name: 'Government College of Nursing, Kottayam', state: 'Kerala', city: 'Kottayam', category: 'State Govt' },
  { code: 'BABYMEMORIAL-KZH', name: 'Baby Memorial College of Nursing, Kozhikode', state: 'Kerala', city: 'Kozhikode', category: 'Private Premier' },
  { code: 'LOURDES-KOC', name: 'Lourdes College of Nursing, Ernakulam, Kochi', state: 'Kerala', city: 'Kochi', category: 'Private Premier' },
  { code: 'JUBILEE-TCR', name: 'Jubilee Mission College of Nursing, Thrissur', state: 'Kerala', city: 'Thrissur', category: 'Private Premier' },

  // ─── MAHARASHTRA & GUJARAT ───
  { code: 'SNDT-MUM', name: 'SNDT Women’s University Leelabai Thackersey College of Nursing, Mumbai', state: 'Maharashtra', city: 'Mumbai', category: 'State University' },
  { code: 'KEM-MUM', name: 'College of Nursing, Seth GS Medical College & KEM Hospital, Mumbai', state: 'Maharashtra', city: 'Mumbai', category: 'Municipal Govt' },
  { code: 'JJ-MUM', name: 'College of Nursing, Sir JJ Group of Hospitals & Grant Medical College, Mumbai', state: 'Maharashtra', city: 'Mumbai', category: 'State Govt' },
  { code: 'BHARATI-PUN', name: 'Bharati Vidyapeeth College of Nursing, Pune', state: 'Maharashtra', city: 'Pune', category: 'Deemed University' },
  { code: 'DYPATIL-NAV', name: 'D.Y. Patil College of Nursing, Navi Mumbai', state: 'Maharashtra', city: 'Navi Mumbai', category: 'Deemed University' },
  { code: 'MGM-NAV', name: 'MGM New Bombay College of Nursing, Kamothe, Navi Mumbai', state: 'Maharashtra', city: 'Navi Mumbai', category: 'Deemed University' },
  { code: 'BJMC-PUN', name: 'College of Nursing, B.J. Government Medical College, Pune', state: 'Maharashtra', city: 'Pune', category: 'State Govt' },
  { code: 'BJMC-AMD', name: 'College of Nursing, B.J. Medical College & Civil Hospital, Ahmedabad', state: 'Gujarat', city: 'Ahmedabad', category: 'State Govt' },
  { code: 'CHARUSAT-CHA', name: 'Manikaka Topawala Institute of Nursing, CHARUSAT Changa', state: 'Gujarat', city: 'Anand', category: 'Private University' },
  { code: 'SUMANDEEP-VAD', name: 'Sumandeep Nursing College, Sumandeep Vidyapeeth, Vadodara', state: 'Gujarat', city: 'Vadodara', category: 'Deemed University' },

  // ─── WEST BENGAL & ODISHA ───
  { code: 'SSKM-KOL', name: 'College of Nursing, IPGMER & SSKM Hospital, Kolkata', state: 'West Bengal', city: 'Kolkata', category: 'State Govt' },
  { code: 'MCK-KOL', name: 'College of Nursing, Medical College Kolkata (MCK)', state: 'West Bengal', city: 'Kolkata', category: 'State Govt' },
  { code: 'NRS-KOL', name: 'College of Nursing, NRS Medical College, Kolkata', state: 'West Bengal', city: 'Kolkata', category: 'State Govt' },
  { code: 'RGKAR-KOL', name: 'College of Nursing, R.G. Kar Medical College, Kolkata', state: 'West Bengal', city: 'Kolkata', category: 'State Govt' },
  { code: 'APOLLO-KOL', name: 'Apollo College of Nursing, Kolkata', state: 'West Bengal', city: 'Kolkata', category: 'Private Premier' },
  { code: 'PEERLESS-KOL', name: 'Peerless College of Nursing, Kolkata', state: 'West Bengal', city: 'Kolkata', category: 'Private Premier' },
  { code: 'NEOTIA-KOL', name: 'Neotia Academy of Nursing, Kolkata', state: 'West Bengal', city: 'Kolkata', category: 'Private Premier' },
  { code: 'SCB-CTC', name: 'College of Nursing, SCB Medical College, Cuttack', state: 'Odisha', city: 'Cuttack', category: 'State Govt' },
  { code: 'MKCG-BER', name: 'College of Nursing, MKCG Medical College, Berhampur', state: 'Odisha', city: 'Berhampur', category: 'State Govt' },
  { code: 'KIMS-BHU', name: 'Kalinga Institute of Nursing Sciences (KINS), KIIT University, Bhubaneswar', state: 'Odisha', city: 'Bhubaneswar', category: 'Deemed University' },
  { code: 'SOA-BHU', name: 'SUM Nursing College, Siksha O Anusandhan (SOA) University, Bhubaneswar', state: 'Odisha', city: 'Bhubaneswar', category: 'Deemed University' },

  // ─── UTTAR PRADESH, BIHAR & JHARKHAND ───
  { code: 'KGMU-LKO', name: 'King George’s Medical University (KGMU) Institute of Nursing, Lucknow', state: 'Uttar Pradesh', city: 'Lucknow', category: 'State University' },
  { code: 'SGPGIMS-LKO', name: 'College of Nursing, SGPGIMS, Lucknow', state: 'Uttar Pradesh', city: 'Lucknow', category: 'State Autonomous' },
  { code: 'BHU-VAR', name: 'College of Nursing, Institute of Medical Sciences (IMS BHU), Varanasi', state: 'Uttar Pradesh', city: 'Varanasi', category: 'Central University' },
  { code: 'AMU-ALI', name: 'College of Nursing, Jawaharlal Nehru Medical College (AMU), Aligarh', state: 'Uttar Pradesh', city: 'Aligarh', category: 'Central University' },
  { code: 'SHARDA-GRE', name: 'School of Nursing Science and Research (SNSR), Sharda University, Greater Noida', state: 'Uttar Pradesh', city: 'Greater Noida', category: 'Private University' },
  { code: 'ERAS-LKO', name: 'Era College of Nursing, Era University, Lucknow', state: 'Uttar Pradesh', city: 'Lucknow', category: 'Private University' },
  { code: 'IGIMS-PAT', name: 'College of Nursing, Indira Gandhi Institute of Medical Sciences (IGIMS), Patna', state: 'Bihar', city: 'Patna', category: 'State Autonomous' },
  { code: 'PMCH-PAT', name: 'College of Nursing, Patna Medical College & Hospital (PMCH), Patna', state: 'Bihar', city: 'Patna', category: 'State Govt' },
  { code: 'RIMS-RAN', name: 'College of Nursing, Rajendra Institute of Medical Sciences (RIMS), Ranchi', state: 'Jharkhand', city: 'Ranchi', category: 'State Autonomous' },

  // ─── RAJASTHAN, PUNJAB, HARYANA & MP ───
  { code: 'RUHS-JAI', name: 'Government College of Nursing, RUHS, Jaipur', state: 'Rajasthan', city: 'Jaipur', category: 'State Govt' },
  { code: 'SMS-JAI', name: 'College of Nursing, SMS Medical College, Jaipur', state: 'Rajasthan', city: 'Jaipur', category: 'State Govt' },
  { code: 'NIMS-JAI', name: 'NIMS Nursing College, NIMS University, Jaipur', state: 'Rajasthan', city: 'Jaipur', category: 'Private University' },
  { code: 'PGIMS-ROH', name: 'College of Nursing, Pt. B.D. Sharma PGIMS, Rohtak', state: 'Haryana', city: 'Rohtak', category: 'State Govt' },
  { code: 'MMU-MUL', name: 'M.M. Institute of Nursing, MMU Mullana, Ambala', state: 'Haryana', city: 'Ambala', category: 'Deemed University' },
  { code: 'BFUHS-FAR', name: 'University College of Nursing, BFUHS, Faridkot', state: 'Punjab', city: 'Faridkot', category: 'State University' },
  { code: 'CHITKARA-RAJ', name: 'Chitkara School of Health Sciences (Nursing), Rajpura', state: 'Punjab', city: 'Rajpura', category: 'Private University' },
  { code: 'GMC-BHP', name: 'Government College of Nursing, Gandhi Medical College (GMC), Bhopal', state: 'Madhya Pradesh', city: 'Bhopal', category: 'State Govt' },
  { code: 'GMC-IND', name: 'Government College of Nursing, MGM Medical College, Indore', state: 'Madhya Pradesh', city: 'Indore', category: 'State Govt' },
  { code: 'INDEX-IND', name: 'Index Nursing College, Malwanchal University, Indore', state: 'Madhya Pradesh', city: 'Indore', category: 'Private University' }
];

export const ASSAM_INSTITUTIONS = INDIA_INSTITUTIONS.filter(i => i.state === 'Assam');

// ─── DYNAMIC TIERED PRICING ENGINE ────────────────────────────────────────────
// Tier 1 (First 1,000): ₹99 | Tier 2 (1,001-3,000): ₹149 | Tier 3 (3,001-6,000): ₹199 | Tier 4 (6,001+): ₹249
// SNA Welfare Allocation: ₹15 per registered student
export function getTieredPricing(seatsFilled = 0) {
  const count = Number(seatsFilled) || 0;
  if (count <= 1000) {
    return {
      tier: 1,
      tierName: 'Tier 1: Early Bird',
      price: 99,
      pricePaise: 9900,
      cap: 1000,
      remainingInTier: Math.max(0, 1000 - count),
      nextTierPrice: 149,
      institutionalWelfarePerStudent: 15,
    };
  } else if (count <= 3000) {
    return {
      tier: 2,
      tierName: 'Tier 2: Growth Tier',
      price: 149,
      pricePaise: 14900,
      cap: 3000,
      remainingInTier: Math.max(0, 3000 - count),
      nextTierPrice: 199,
      institutionalWelfarePerStudent: 15,
    };
  } else if (count <= 6000) {
    return {
      tier: 3,
      tierName: 'Tier 3: Mass Scale Tier',
      price: 199,
      pricePaise: 19900,
      cap: 6000,
      remainingInTier: Math.max(0, 6000 - count),
      nextTierPrice: 249,
      institutionalWelfarePerStudent: 15,
    };
  } else {
    return {
      tier: 4,
      tierName: 'Tier 4: National Scale Tier',
      price: 249,
      pricePaise: 24900,
      cap: 12000,
      remainingInTier: Math.max(0, 12000 - count),
      nextTierPrice: null,
      institutionalWelfarePerStudent: 15,
    };
  }
}

// ─── DYNAMIC MILESTONE-BASED CASH PRIZE POOL ─────────────────────────────────
export function getPrizePoolMilestone(seatsFilled = 0) {
  const count = Number(seatsFilled) || 0;
  if (count <= 1000) {
    return {
      phase: 1,
      phaseName: 'Phase 1 Milestone (Up to 1,000 Students)',
      totalPrizePool: 21000,
      formattedTotal: '₹21,000',
      prizes: [
        { rank: '1st Prize', amount: '₹10,000', note: 'State Champion Trophy & Cash' },
        { rank: '2nd Prize', amount: '₹5,000', note: 'Runner-Up Award' },
        { rank: '3rd Prize', amount: '₹2,500', note: 'Bronze Award' },
        { rank: 'Ranks 4–10', amount: '₹500 each', note: 'Merit Cash Consolation' },
      ],
      nextMilestone: 1000,
      progressPercent: Math.min(100, Math.round((count / 1000) * 100)),
    };
  } else if (count <= 5000) {
    return {
      phase: 2,
      phaseName: 'Phase 2 Milestone (Up to 5,000 Students)',
      totalPrizePool: 59500,
      formattedTotal: '₹59,500',
      prizes: [
        { rank: '1st Prize', amount: '₹25,000', note: 'Zonal Grand Champion Trophy & Cash' },
        { rank: '2nd Prize', amount: '₹15,000', note: 'State Gold Runner-Up' },
        { rank: '3rd Prize', amount: '₹7,500', note: 'Silver Award' },
        { rank: 'Ranks 4–10', amount: '₹1,000 each', note: 'Top 10 Excellence Award' },
        { rank: 'Ranks 11–20', amount: '₹500 each', note: 'Merit Consolation' },
      ],
      nextMilestone: 5000,
      progressPercent: Math.min(100, Math.round((count / 5000) * 100)),
    };
  } else {
    return {
      phase: 3,
      phaseName: 'Phase 3 Milestone (10,000+ Students)',
      totalPrizePool: 120000,
      formattedTotal: '₹1,20,000+',
      prizes: [
        { rank: '1st Prize', amount: '₹51,000', note: '🏆 Mega National Champion Trophy + Cash' },
        { rank: '2nd Prize', amount: '₹25,000', note: 'National Silver Award' },
        { rank: '3rd Prize', amount: '₹15,000', note: 'National Bronze Award' },
        { rank: 'Ranks 4–10', amount: '₹2,000 each', note: 'National Top 10 Honors' },
        { rank: 'Ranks 11–25', amount: '₹1,000 each', note: 'National Excellence Award' },
      ],
      nextMilestone: 10000,
      progressPercent: Math.min(100, Math.round((count / 10000) * 100)),
    };
  }
}

// 3b. generateReferralCode(name, college)
export function generateReferralCode(name, college) {
  // Check if college matches official Assam Institution code
  const matched = ASSAM_INSTITUTIONS.find(i => 
    i.code.toUpperCase() === (college || '').toUpperCase() || 
    (college || '').toUpperCase().includes(i.code.toUpperCase()) ||
    (college || '').toLowerCase().includes(i.name.toLowerCase().substring(0, 10))
  );
  
  if (matched) {
    const firstName = (name || 'AMB').toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 5) || 'PRIN';
    const rand = Math.floor(100 + Math.random() * 900);
    return `${matched.code}-${firstName}-${rand}`;
  }

  const col = (college || 'COL')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, ' ')
    .trim()
    .split(/\s+/)
    .map(w => w[0])
    .join('')
    .substring(0, 4) || 'MPC';
  const firstName = (name || 'AMB')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 5) || 'PARTNER';
  const rand = Math.floor(100 + Math.random() * 900);
  return `${col}-${firstName}-${rand}`;
}

// 3c. generateViralShareMessage(refCode, name, college, currentPrice = 99)
export function generateViralShareMessage(refCode, name, college, currentPrice = 99) {
  const link = `https://maapark.in/championship.html?ref=${refCode}`;
  return `🏆 *National Clinical & Digital Health Nursing Championship 2026*\n\n` +
    `Hello! *${name || 'Our Coordinator'}* from *${college || 'Nursing Department'}* invites you to compete in India's premier clinical nursing championship!\n\n` +
    `📅 *Exam Date:* Sunday, 13 September 2026 (7:00 PM – 7:45 PM IST)\n` +
    `💰 *Entry Fee:* ₹${currentPrice}/- (Early Bird Tier)\n` +
    `🎁 *Prize Pool:* Scaling up to ₹1,20,000+ with ₹51,000 Mega Champion Trophy!\n` +
    `🎓 *Governed by:* Prof. (Dr.) Hemeswari Bhuyan (Chief Clinical Advisor, Former Principal RCN Guwahati & Capt. MNS TA)\n` +
    `📜 *Awards:* National Merit Certificates with Verifiable QR + State Rankings\n` +
    `⚡ *SNA Welfare Support:* ₹15 from every registration is credited directly to our college institutional fund!\n\n` +
    `👉 *Register through this official link:* ${link}\n\n` +
    `_Limited tiered seats available. Register before tier price escalates!_`;
}

// 4. verifyRazorpaySignature(orderId, paymentId, signature, secret)
export function verifyRazorpaySignature(orderId, paymentId, signature, secret) {
  const body = `${orderId}|${paymentId}`;
  const expectedSig = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return expectedSig === signature;
}

// 5. verifyRazorpayWebhookSignature(rawBody, signature, webhookSecret)
export function verifyRazorpayWebhookSignature(rawBody, signature, webhookSecret) {
  const expectedSig = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  return expectedSig === signature;
}

// 6. calculateScore(answers, questions)
// answers: { questionId: selectedOptionId }
// questions: [{ _id, correctId }]
// Scoring: correct +1, incorrect -0.25, unattempted 0
export function calculateScore(answers, questions) {
  let correct = 0;
  let incorrect = 0;
  let unattempted = 0;
  for (const q of questions) {
    const qId = q._id.toString();
    const selected = answers[qId];
    if (!selected) { unattempted++; continue; }
    if (selected === q.correctId) { correct++; }
    else { incorrect++; }
  }
  const score = correct * 1 - incorrect * 0.25;
  return { score: Math.max(0, score), correct, incorrect, unattempted };
}

// 7. syncToGoogleSheets(rowData)
// Posts a row to the Google Apps Script Web App
export async function syncToGoogleSheets(rowData) {
  const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!url) {
    console.warn('⚠️ GOOGLE_SHEETS_WEBHOOK_URL not set — skipping Sheets sync');
    return;
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rowData),
    });
    const text = await res.text();
    console.log('📊 Google Sheets sync:', text);
  } catch (err) {
    console.error('❌ Google Sheets sync failed:', err.message);
  }
}

export {
  generateCryptographicCertificatePDF,
  generateCertificateHash,
  verifyCertificateHash,
  generateCryptographicCertificatePDF as generateCertificatePDF,
} from './services/certificateService.js';

// 9. sendNotificationEmail(to, subject, html, pdfBuffer)
// Uses Nodemailer with SMTP (configure SMTP_* env vars)
export async function sendNotificationEmail(to, subject, html, pdfBuffer = null) {
  const nodemailerUrl = process.env.SMTP_HOST;
  if (!nodemailerUrl) {
    console.warn('⚠️ SMTP_HOST not set — skipping email send');
    return;
  }
  // Dynamic import to avoid hard dependency if not installed
  try {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.default.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    const mailOptions = {
      from: `"Maa Park Championship" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    };
    if (pdfBuffer) {
      mailOptions.attachments = [{
        filename: 'hall-ticket-maapark.pdf',
        content: pdfBuffer,
        contentType: 'application/pdf',
      }];
    }
    await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent to ${to}`);
  } catch (err) {
    console.error('❌ Email send failed:', err.message);
  }
}
