import { MongoClient } from 'mongodb';

const MONGO_URI = "mongodb+srv://inkdabba_dev:Dev1234@inkdabba.g1fmygf.mongodb.net/?appName=Inkdabba";
const DB_NAME = "Posters";
const COLLECTION_NAME = "Prices";

let cachedClient = null;

async function connectToDatabase() {
  if (cachedClient) return cachedClient;
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  cachedClient = client;
  return client;
}

export default async function handler(req, res) {
  try {
    const client = await connectToDatabase();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Get current date and time in IST (Indian Standard Time)
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // +5:30 in ms
    const istDate = new Date(now.getTime() + istOffset);

    const currentHour = istDate.getUTCHours(); // Hours in IST

    // Target date logic: If before 10 AM IST, target yesterday's rates
    let targetDate = new Date(istDate);
    if (currentHour < 10) {
      targetDate.setDate(targetDate.getDate() - 1);
    }

    const formattedDateStr = targetDate.toISOString().split('T')[0]; // "YYYY-MM-DD"

    // Fetch rates explicitly recorded for targetDate
    let rateRecord = await collection.findOne({ date: formattedDateStr });

    // Fallback: If 10 AM scraper hasn't finished yet today, fetch the latest stored rate
    if (!rateRecord) {
      rateRecord = await collection.findOne({}, { sort: { updatedAt: -1 } });
    }

    return res.status(200).json({
      success: true,
      gold: rateRecord.gold,
      silver: rateRecord.silver,
      date: rateRecord.date
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
