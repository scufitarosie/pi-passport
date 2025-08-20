const fetch = require('node-fetch');

const PI_API_KEY = process.env.PI_API_KEY;
const PI_API_URL = "https://api.minepi.com/v2";

const reputationStore = {
  'pi-user-1': 95,
  'pi-user-2': 78,
  'scufitarosie': 99,
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  if (!PI_API_KEY) {
    console.error("CRITICAL: PI_API_KEY environment variable is not set on the server.");
    return res.status(500).json({ error: "Server configuration error." });
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
    let piResponse;
    
    if (action === 'approve') {
      if (!paymentId) return res.status(400).json({ error: "Payment ID is required for approval." });
      
      piResponse = await callPiApi(`/payments/${paymentId}/approve`, {});

    } else if (action === 'complete') {
      if (!paymentId || !txid) return res.status(400).json({ error: "Payment ID and TXID are required for completion." });

      piResponse = await callPiApi(`/payments/${paymentId}/complete`, { txid });

    } else {
      return res.status(400).json({ error: 'Invalid action specified.' });
    }

    const responseData = await piResponse.json();

    if (!piResponse.ok) {
      console.error(`Pi API Error (${action}):`, responseData);
      return res.status(piResponse.status).json({ error: `Pi API call failed for '${action}'.`, details: responseData });
    }

    if (action === 'complete') {
      const score = reputationStore[targetUsername.toLowerCase()] || Math.floor(Math.random() * 30) + 60;
      responseData.reputationScore = score;
    }

    return res.status(200).json(responseData);

  } catch (error) {
    console.error("Internal Server Error:", error);
    return res.status(500).json({ error: 'An unexpected error occurred.', detail: error.message });
  }
}
