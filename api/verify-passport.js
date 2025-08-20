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
    return res.status(500).json({ error: "Server configuration error: API key is missing." });
  }

  const { action, paymentId, txid, targetUsername } = req.body;

  const callPiApi = async (endpoint, body) => {
    const resp = await fetch(`${PI_API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${PI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body || {}),
    });
    return resp;
  };

  try {
    if (action === 'approve') {
      if (!paymentId) return res.status(400).json({ error: "Payment ID is required for approval." });

      const piResponse = await callPiApi(`/payments/${paymentId}/approve`);
      if (!piResponse.ok) {
        return res.status(piResponse.status).json({ error: "Pi API approve failed." });
      }
      return res.status(200).json({ success: true, action: 'approve' });

    } else if (action === 'complete') {
      if (!paymentId || !txid) return res.status(400).json({ error: "Payment ID and TXID are required." });

      const piResponse = await callPiApi(`/payments/${paymentId}/complete`, { txid });
      if (!piResponse.ok) {
        return res.status(piResponse.status).json({ error: "Pi API complete failed." });
      }

      const score = reputationStore[targetUsername?.toLowerCase()] || Math.floor(Math.random() * 30) + 60;
      return res.status(200).json({ success: true, action: 'complete', reputationScore: score });

    } else {
      return res.status(400).json({ error: 'Invalid action specified.' });
    }

  } catch (error) {
    console.error("[ERROR] Internal Server Error:", error);
    return res.status(500).json({ error: 'Unexpected server error.', detail: error.message });
  }
}
