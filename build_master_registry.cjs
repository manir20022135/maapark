// build_master_registry.cjs
// Extracts and consolidates all candidates from MongoDB Atlas and SQLite
// Outputs master_candidate_registry.js for offline and S3 client-side authentication

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

async function build() {
  const { DatabaseSync } = require('node:sqlite');
  const mongoose = require('mongoose');

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI missing in .env');
    process.exit(1);
  }

  await mongoose.connect(mongoUri, { dbName: 'maa_park' });
  console.log('Connected to MongoDB Atlas');

  const regSchema = new mongoose.Schema({}, { strict: false });
  const MongoReg = mongoose.models.ChampionshipRegistration || mongoose.model('ChampionshipRegistration', regSchema, 'championship_registrations');
  const mongoDocs = await MongoReg.find({}).lean();
  console.log(`Fetched ${mongoDocs.length} candidates from MongoDB`);

  const dbPath = path.join(__dirname, 'maa_park.sqlite');
  const sqlite = new DatabaseSync(dbPath);
  const sqlDocs = sqlite.prepare('SELECT * FROM registrations ORDER BY id ASC').all();
  console.log(`Fetched ${sqlDocs.length} candidates from SQLite`);

  const map = new Map();

  function addCandidate(raw) {
    let roll = (raw.rollNumber || raw.roll_number || '').trim().toUpperCase();
    if (!roll) return;

    // Normalize base roll (strip internal attempt counter suffixes like -59, -61, etc.)
    const cleanRoll = roll.replace(/-\d+$/, '');

    // Normalize token
    let token = (raw.examToken || raw.exam_token || raw.password || '').trim().toUpperCase();
    if (!token || token === 'MAAPARK@2026' || token.length < 4) {
      const seq = cleanRoll.replace(/\D/g, '').slice(-4) || '2026';
      token = 'MPC-TOK-' + seq;
    }

    const name = (raw.name || raw.full_name || 'Registered Candidate').trim();
    const phone = (raw.whatsapp || '').replace(/\D/g, '').slice(-10);
    const email = (raw.email || '').toLowerCase().trim();
    const college = (raw.college || 'Nursing Institution').trim();
    const course = (raw.course || 'B.Sc Nursing').trim();
    const year = (raw.year || raw.year_level || '4th Year').trim();
    const state = (raw.state || 'Assam').trim();

    const entry = {
      rollNumber: cleanRoll,
      examToken: token,
      name,
      phone,
      email,
      college,
      course,
      year,
      state,
      status: 'paid',
      feePaid: 99,
      reExamAllowed: true,
      examWindowExpiresAt: '2026-09-30T23:59:59.000Z'
    };

    // Prioritize non-PENDING roll numbers over PENDING ones
    if (!map.has(cleanRoll)) {
      map.set(cleanRoll, entry);
    } else {
      const existing = map.get(cleanRoll);
      if (existing.rollNumber.startsWith('PENDING') && !cleanRoll.startsWith('PENDING')) {
        map.set(cleanRoll, entry);
      }
    }

    // Also index by phone if cleanRoll is not pending
    if (phone && !cleanRoll.startsWith('PENDING')) {
      map.set('PHONE_' + phone, entry);
    }
  }

  sqlDocs.forEach(addCandidate);
  mongoDocs.forEach(addCandidate);

  // Collect unique candidate records
  const candidates = [];
  const seenRolls = new Set();

  for (const [key, val] of map.entries()) {
    if (key.startsWith('PHONE_')) continue;
    if (seenRolls.has(val.rollNumber)) continue;
    seenRolls.add(val.rollNumber);
    candidates.push(val);
  }

  // Sort by Name
  candidates.sort((a, b) => a.name.localeCompare(b.name));

  console.log(`Generated canonical registry with ${candidates.length} unique candidates`);

  // Write master_candidate_registry.js
  const fileContent = `// master_candidate_registry.js
// Auto-generated Official Master Candidate Registry for Maa Park Championship 2026
// Single Source of Truth for Candidate Portal & Exam Authentication across S3 & CDN

window.MASTER_CANDIDATE_REGISTRY = ${JSON.stringify(candidates, null, 2)};

// Helper lookup function
window.lookupRegistryCandidate = function(query) {
  if (!query) return null;
  const q = String(query).trim().toUpperCase();
  const cleanDigits = q.replace(/\\D/g, '').slice(-10);
  const isEmail = q.includes('@');

  const list = window.MASTER_CANDIDATE_REGISTRY || [];

  // 1. Exact Roll Number Match
  let match = list.find(c => c.rollNumber.toUpperCase() === q || c.rollNumber.replace(/^PENDING-/, '').toUpperCase() === q);
  if (match) return match;

  // 2. Exact Token Match
  match = list.find(c => c.examToken.toUpperCase() === q);
  if (match) return match;

  // 3. Exact Email Match
  if (isEmail) {
    match = list.find(c => c.email && c.email.toUpperCase() === q);
    if (match) return match;
  }

  // 4. Exact 10-digit Phone Match
  if (cleanDigits.length === 10) {
    match = list.find(c => c.phone === cleanDigits && !c.rollNumber.startsWith('PENDING')) ||
            list.find(c => c.phone === cleanDigits);
    if (match) return match;
  }

  // 5. Name match fallback (minimum 4 characters)
  if (q.length >= 4 && !/\\d/.test(q)) {
    match = list.find(c => c.name.toUpperCase().includes(q) && !c.rollNumber.startsWith('PENDING')) ||
            list.find(c => c.name.toUpperCase().includes(q));
    if (match) return match;
  }

  return null;
};
`;

  fs.writeFileSync(path.join(__dirname, 'master_candidate_registry.js'), fileContent, 'utf-8');
  console.log('Saved master_candidate_registry.js successfully!');

  // Also save a JSON copy for reports
  fs.writeFileSync(path.join(__dirname, 'master_candidates.json'), JSON.stringify(candidates, null, 2), 'utf-8');
  console.log('Saved master_candidates.json successfully!');

  await mongoose.disconnect();
}

build().catch(err => {
  console.error('Build error:', err);
  process.exit(1);
});
