import { MongoClient } from 'mongodb';

const MONGO_URI = "mongodb+srv://inkdabba_dev:Dev1234@inkdabba.g1fmygf.mongodb.net/?appName=Inkdabba";
let cachedClient = null;

async function connectDB() {
  if (cachedClient) return cachedClient;
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  cachedClient = client;
  return client;
}

export default async function handler(req, res) {
  try {
    const client = await connectDB();
    const db = client.db('Posters');

    // IST Time Logic
    const now = new Date();
    const istDate = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    
    // If before 10:00 AM IST, look for yesterday's rate
    if (istDate.getUTCHours() < 10) {
      istDate.setDate(istDate.getDate() - 1);
    }
    const targetDateStr = istDate.toISOString().split('T')[0];

    let rateRecord = await db.collection('Prices').findOne({ date: targetDateStr });
    if (!rateRecord) {
      rateRecord = await db.collection('Prices').findOne({}, { sort: { updatedAt: -1 } });
    }

    return res.status(200).json({
      success: true,
      gold: rateRecord.gold,
      silver: rateRecord.silver,
      date: rateRecord.date
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
