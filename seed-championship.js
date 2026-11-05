// seed-championship.js
// Seeds the 60-Question Standardized Psychometric Question Bank into MongoDB
// Run: node seed-championship.js

import 'dotenv/config';
import { connectDB, ChampionshipQuestion, ChampionshipConfig } from './database.js';
import { STANDARDIZED_QUESTION_BANK } from './question-bank.js';

async function seedChampionshipQuestions() {
  try {
    await connectDB();
    console.log('📦 Connected to MongoDB. Seeding standardized 60-item question bank...');

    // Clear existing questions
    await ChampionshipQuestion.deleteMany({});

    // Map standardized questions to schema format
    const docs = STANDARDIZED_QUESTION_BANK.map((q) => ({
      _id: q.id,
      text: q.text,
      options: q.options,
      correctId: q.correctId,
      topic: q.domainTitle,
      domainCode: q.domainCode,
      section: q.section,
      difficulty: 'medium',
      active: true,
      explanation: q.rationale,
    }));

    await ChampionshipQuestion.insertMany(docs);
    console.log(`✅ Successfully seeded ${docs.length} standardized questions into championship_questions!`);

    // Ensure config exists
    let cfg = await ChampionshipConfig.findOne();
    if (!cfg) {
      cfg = await ChampionshipConfig.create({
        seatsTotal: 12000,
        seatsFilled: 412,
        registrationOpen: true,
        examDate: new Date('2026-08-30T13:30:00.000Z'),
        examEndDate: new Date('2026-08-30T14:15:00.000Z'),
        registrationStart: new Date('2026-08-01T00:00:00.000Z'),
        registrationEnd: new Date('2026-08-28T23:59:59.000Z'),
      });
      console.log('✅ Created default ChampionshipConfig.');
    } else {
      cfg.seatsTotal = 12000;
      await cfg.save();
      console.log('✅ Updated ChampionshipConfig.');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding questions:', err.message);
    process.exit(1);
  }
}

seedChampionshipQuestions();
