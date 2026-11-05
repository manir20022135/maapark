const { DatabaseSync } = require('node:sqlite');
const mongoose = require('mongoose');

// 1. SQLite check
try {
  const db = new DatabaseSync('maa_park.sqlite');
  const results = db.prepare("SELECT * FROM exam_results WHERE roll_number LIKE '%1586%'").all();
  const reg = db.prepare("SELECT * FROM registrations WHERE roll_number LIKE '%1586%' OR email LIKE '%bhaswati%'").all();
  console.log('--- SQLite exam_results ---', results);
  console.log('--- SQLite registrations ---', reg);
} catch (e) {
  console.error('SQLite err:', e);
}

// 2. Check MongoDB
const MONGODB_URI = 'mongodb+srv://user_db:Password123@cluster0.p1bfeee.mongodb.net/maapark?retryWrites=true&w=majority';
mongoose.connect(MONGODB_URI).then(async () => {
  console.log('MongoDB connected');
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('Collections:', collections.map(c => c.name));
  
  for (const c of ['championshipregistrations', 'championship_registrations', 'examresults', 'exam_results', 'examattempts']) {
    try {
      const docs = await mongoose.connection.db.collection(c).find({
        $or: [
          { rollNumber: /1586/i },
          { email: /bhaswati/i },
          { name: /bhaswati/i },
          { roll_number: /1586/i }
        ]
      }).toArray();
      if (docs.length > 0) {
        console.log(`--- Mongo ${c} ---`, docs);
      }
    } catch(err) {}
  }
  process.exit(0);
}).catch(err => {
  console.error('Mongo err:', err);
  process.exit(0);
});
