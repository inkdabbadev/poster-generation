import axios from 'axios';
import * as cheerio from 'cheerio';
import { MongoClient } from 'mongodb';

const KJPL_URL = "http://www.kjpl.in/";
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
    // 1. Fetch KJPL HTML
    const { data: html } = await axios.get(KJPL_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 15000
    });

    const $ = cheerio.load(html);
    let gold = null, silver = null;

    // 2. Parse Gold & Silver
    $('table.chennairate_table tr').each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length === 2) {
        const key = $(cells[0]).text().trim().toUpperCase();
        const value = $(cells[1]).text().trim();
        if (key.includes('GOLD')) gold = value.replace('(₹)', '').replace(/,/g, '').trim();
        if (key.includes('SILVER')) silver = value.replace('(₹)', '').replace(/,/g, '').trim();
      }
    });

    if (!gold || !silver) {
      return res.status(500).json({ error: "Could not parse rates from KJPL" });
    }

    // 3. Save to MongoDB
    const client = await connectDB();
    const db = client.db('Posters');
    const today = new Date().toISOString().split('T')[0];

    await db.collection('Prices').updateOne(
      { date: today },
      { $set: { gold, silver, date: today, updatedAt: new Date() } },
      { upsert: true }
    );

    return res.status(200).json({ success: true, date: today, gold, silver });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
