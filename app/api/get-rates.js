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

    // Get the most recently stored price from MongoDB
    const latestRates = await collection.findOne({}, { sort: { updatedAt: -1 } });

    if (!latestRates) {
      return res.status(404).json({ error: "No rate data found." });
    }

    return res.status(200).json({
      success: true,
      gold: latestRates.gold,
      silver: latestRates.silver,
      date: latestRates.date
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
