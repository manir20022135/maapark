const db = require('./database_sql.js').default;

async function checkRoll() {
  const { ChampionshipRegistration, connectDB } = await import('./database.js');
  await connectDB();

  console.log('--- Search 4264 in Mongo ---');
  const m1 = await ChampionshipRegistration.find({ rollNumber: { $regex: '4264' } }).lean();
  console.log('Mongo 4264:', m1);

  console.log('--- Search 2Q1886YT in Mongo ---');
  const m2 = await ChampionshipRegistration.find({ examToken: { $regex: '2Q1886' } }).lean();
  console.log('Mongo token:', m2);

  console.log('--- All AIONE candidates in Mongo ---');
  const mAione = await ChampionshipRegistration.find({ rollNumber: { $regex: 'AIONE' } }).lean();
  console.log('Mongo AIONE:', mAione.map(c => ({ roll: c.rollNumber, name: c.name, token: c.examToken, phone: c.whatsapp, email: c.email })));

  console.log('--- SQLite Search ---');
  const s1 = db.query("SELECT * FROM registrations WHERE roll_number LIKE '%4264%' OR exam_token LIKE '%2Q1886%'");
  console.log('SQLite 4264 / token:', s1);

  const sAione = db.query("SELECT roll_number, full_name, exam_token, whatsapp, email FROM registrations WHERE roll_number LIKE '%AIONE%'");
  console.log('SQLite AIONE:', sAione);
}

checkRoll().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
