require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  console.log('Connecting to MongoDB...');
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    console.log('Connected successfully to MongoDB Atlas!');
    const db = mongoose.connection.db;
    
    // Check all collections in maa_park
    const collections = await db.listCollections().toArray();
    console.log(`Database name: ${db.databaseName}`);
    console.log(`Total collections: ${collections.length}`);

    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`\n=== Collection: ${col.name} (${count} documents) ===`);
      if (count > 0) {
        const docs = await db.collection(col.name).find().limit(10).toArray();
        console.log(JSON.stringify(docs, null, 2));
      }
    }

    // Also check other databases if permitted
    try {
      const admin = db.admin();
      const dbs = await admin.listDatabases();
      console.log('\nAll databases accessible:', dbs.databases.map(d => d.name));
      for (const d of dbs.databases) {
        if (d.name !== 'admin' && d.name !== 'local' && d.name !== db.databaseName) {
          const otherDb = mongoose.connection.client.db(d.name);
          const cols = await otherDb.listCollections().toArray();
          console.log(`Database [${d.name}] collections:`, cols.map(c => c.name));
          for (const c of cols) {
            const cnt = await otherDb.collection(c.name).countDocuments();
            console.log(`  - ${c.name}: ${cnt} docs`);
            if (cnt > 0) {
              const sample = await otherDb.collection(c.name).find().limit(5).toArray();
              console.log(JSON.stringify(sample, null, 2));
            }
          }
        }
      }
    } catch (e) {
      console.log('Admin listDatabases error:', e.message);
    }

  } catch (err) {
    console.error('Connection error:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

check();
