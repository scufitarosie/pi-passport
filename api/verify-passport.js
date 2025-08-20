const fetch = require('node-fetch');

// --- Pi API Configuration ---
// IMPORTANT: You MUST set this as an Environment Variable in your Vercel project settings.
// Name the variable: PI_API_KEY
// Value: Your secret API Key from the Pi Developer Portal
const PI_API_KEY = process.env.PI_API_KEY;
const PI_API_URL = "https://api.minepi.com/v2";

const reputationStore = {
  'pi-user-1': 95,
  'pi-user-2': 78,
  'scufitarosie': 99,
};

const allowCors = fn => async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  return await fn(req, res);
};

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  if (!PI_API_KEY) {
      return res.status(500).json({ error: "Server configuration error: PI_API_KEY is not set." });
  }
  
  const { action, paymentId, txid, targetUsername } = req.body;

  const callPiApi = (endpoint, body) => {
    return fetch(`${PI_API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${PI_API_KEY}`,
      },
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

      const score = reputationStore[targetUsername.toLowerCase()] || Math.floor(Math.random() * 30) + 60;
      
      return res.status(200).json({ 
        message: 'Payment completed successfully',
        reputationScore: score 
      });

    } else {
      return res.status(400).json({ error: 'Invalid action specified' });
    }
  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: 'Internal Server Error', detail: error.message });
  }
}

module.exports = allowCors(handler);
