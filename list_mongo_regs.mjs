import 'dotenv/config';
import { connectDB, ChampionshipRegistration } from './database.js';

async function main() {
  await connectDB();
  const mongoRegs = await ChampionshipRegistration.find({}).sort({ createdAt: 1 }).lean();
  console.log('MongoDB ChampionshipRegistration count:', mongoRegs.length);
  mongoRegs.forEach((r, idx) => {
    console.log(`${idx + 1}. Roll: ${r.rollNumber || '--'} | Name: ${r.name} | Phone: ${r.whatsapp} | Email: ${r.email} | College: ${r.college} | Status: ${r.status} | Token: ${r.examToken || 'NOT_SET'}`);
  });
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
