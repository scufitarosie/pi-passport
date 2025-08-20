import { Redis } from '@upstash/redis'

const PI_API_KEY = process.env.PI_API_KEY;
const PI_API_URL = "https://api.minepi.com/v2";


const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const { username } = req.query;
    if (!username) {
      return res.status(400).json({ error: 'Username is required.' });
    }
    try {
      const score = await redis.get(username.toLowerCase());
      
      return res.status(200).json({ username, score });
    } catch (error) {
      console.error("Redis GET error:", error);
      return res.status(500).json({ error: 'Failed to fetch reputation.' });
    }
  }

  if (req.method === 'POST') {
    if (!PI_API_KEY) {
      return res.status(500).json({ error: "Server configuration error: PI_API_KEY is not set." });
    }

    const { action, paymentId, txid, metadata } = req.body;

    const callPiApi = (endpoint, body) => {
      return fetch(`${PI_API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Key ${PI_API_KEY}` },
        body: JSON.stringify(body),
      });
    };

    try {
      if (action === 'approve') {
        const piResponse = await callPiApi(`/payments/${paymentId}/approve`, {});
        const responseData = await piResponse.json();
        if (!piResponse.ok) throw new Error(responseData.message || 'Pi API approval failed');
        return res.status(200).json(responseData);

      } else if (action === 'complete') {
        const piResponse = await callPiApi(`/payments/${paymentId}/complete`, { txid });
        const responseData = await piResponse.json();
        if (!piResponse.ok) throw new Error(responseData.message || 'Pi API completion failed');

        const { userToRate, rating } = metadata;
        if (userToRate && rating) {
          const increment = rating === 'good' ? 1 : -1;
          const key = userToRate.toLowerCase();

          const currentUserScore = await redis.get(key);
          if (currentUserScore === null) {
            await redis.set(key, 85 + increment);
          } else {
            await redis.incrby(key, increment);
          }
        }
        return res.status(200).json({ message: 'Payment completed successfully' });

      } else {
        return res.status(400).json({ error: 'Invalid action specified.' });
      }
    } catch (error) {
      console.error("Server Error:", error);
      return res.status(500).json({ error: 'Internal Server Error', detail: error.message });
    }
  }

  return res.status(405).json({ error: "Method Not Allowed" });
}
