
const fetch = require('node-fetch');

const PI_API_KEY = "vsqhrvt2eejnisanjtkdgjk5wabjqktfj2cylwjaplinb8s6x4ieomeatsuhs6vv"; 
const PI_API_URL = "https://api.minepi.com/v2";

const reputationStore = {
  'pi-user-1': 95,
  'pi-user-2': 78,
  'scufitarosie': 99,
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
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
      console.log(`Approving payment: ${paymentId}`);
      const piResponse = await callPiApi(`/payments/${paymentId}/approve`, {});
      
      if (!piResponse.ok) {
        const errorData = await piResponse.json();
        console.error("Pi API Error (Approve):", errorData);
        return res.status(piResponse.status).json({ error: 'Pi API approval failed', details: errorData });
      }
      
      const approvalData = await piResponse.json();
      return res.status(200).json(approvalData);
    } 
    else if (action === 'complete') {
      console.log(`Completing payment: ${paymentId} with TXID: ${txid}`);
      const piResponse = await callPiApi(`/payments/${paymentId}/complete`, { txid });

      if (!piResponse.ok) {
        const errorData = await piResponse.json();
        console.error("Pi API Error (Complete):", errorData);
        return res.status(piResponse.status).json({ error: 'Pi API completion failed', details: errorData });
      }

      const score = reputationStore[targetUsername.toLowerCase()] || Math.floor(Math.random() * 30) + 60;
            
      return res.status(200).json({ 
        message: 'Payment completed successfully',
        reputationScore: score 
      });
    } 
    else {
      return res.status(400).json({ error: 'Invalid action specified' });
    }
  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
