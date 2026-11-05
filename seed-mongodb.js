// seed-mongodb.js
// Run ONCE to populate MongoDB with the existing team members data
// Mirrors the data from: migrations/20260511000002_create-team-members.sql
//
// Usage: node seed-mongodb.js

import 'dotenv/config';
import { connectDB, TeamMember } from './database.js';

const teamData = [
  {
    name: 'Dr. Jayanta Prasad Sarma',
    role: 'Co-Founder & Advisor of MaaCare App',
    bio: 'MBBS · MS · DIS · PGDIS · MBA (Healthcare Mgmt.) | Former Medical Director (GNRC, Desun, Marwari Hospitals) | World Bank Awardee (₹1 Cr, 2014) | 31+ Years Healthcare Leadership',
    image_url: 'team-photos/Dr. Jayanta Prasad Sarma.jpeg',
    skills: ['Hospital Administration', 'Clinical Governance', 'Healthcare Strategy', 'NABH Accreditation'],
  },
  {
    name: 'Prof. (Dr.) Hemeswari Bhuyan',
    role: 'Founder & Mentor — MaaCare | Chief Clinical Advisor',
    bio: 'Principal, Dispur Nursing Institute (DNI). Former Principal Regional College of Nursing (RCN), Guwahati. Former Vice Principal & HOD, Royal School of Nursing (RGU). Veteran Captain, Military Nursing Service (TA). Recognised PhD supervisor. 38+ years of experience, 27 publications, 1 book, 3 patents.',
    image_url: 'team-photos/dr.h.b.jpeg',
    skills: ['Healthcare Leadership', 'Nursing Education', 'Community Health', 'Clinical Governance'],
  },
  {
    name: 'Manirul Hussain',
    role: 'Co-Founder, CEO & Lead Architect — Maa Park',
    bio: 'Clinical Innovator & Full-Stack AI Engineer. TNAI & Koita Foundation Fast Track Learner Awardee. B.Sc. Nursing (The Assam Royal Global University). Chief Architect of MaaCare platform.',
    image_url: 'team-photos/manirul hussain.jpeg',
    skills: ['Full-Stack Dev', 'AI & ML', 'Flutter & Cloud', 'Clinical Innovation'],
  },
  {
    name: 'Julfikar Ali',
    role: 'Chief Innovation Officer (CIO) & Lead Researcher — Maa Park',
    bio: 'Lead Researcher & Clinical Nursing. TNAI & Koita Foundation Fast Track Learner Awardee. B.Sc. Nursing (The Assam Royal Global University).',
    image_url: 'team-photos/julfikar.jpeg',
    skills: ['Clinical Nursing', 'Health Tech Innovation', 'Research Frameworks', 'Community Outreach'],
  },
];

async function seed() {
  await connectDB();

  try {
    const existing = await TeamMember.countDocuments();
    if (existing > 0) {
      console.log(`⚠️  Team members collection already has ${existing} documents. Skipping seed to avoid duplicates.`);
      console.log('   To re-seed, manually delete the collection in MongoDB Atlas first.');
      process.exit(0);
    }

    const inserted = await TeamMember.insertMany(teamData);
    console.log(`✅ Successfully seeded ${inserted.length} team members into MongoDB:`);
    inserted.forEach(m => console.log(`   • ${m.name} — ${m.role}`));
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  }

  process.exit(0);
}

seed();
