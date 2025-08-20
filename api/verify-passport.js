// Import a fetch-like library for making server-to-server requests.
// Vercel serverless functions don't have fetch built-in like browsers do.
const fetch = require('node-fetch');

// --- Pi API Configuration ---
// IMPORTANT: In a real production app, store your API Key in Vercel Environment Variables.
// For the hackathon, it's okay here, but never commit real secrets to GitHub.
const PI_API_KEY = "YOUR_PI_API_KEY"; // Replace with your actual API Key from the dev portal
const PI_API_URL = "https://api.minepi.com/v2";

// --- Simulated Database ---
// In a real application, you would use a database like Vercel KV, Postgres, or Firestore
// to store reputation scores persistently. For this hackathon, we'll simulate it in memory.
const reputationStore = {
  'pi-user-1': 95,
  'pi-user-2': 78,
  'scufitarosie': 99,
};

// --- Main Handler Function ---
export default async function handler(req, res) {
  // Set CORS headers to allow requests from your app's domain
  res.setHeader("Access-Control-Allow-Origin", "*"); // For development, '*' is okay. For production, lock this down.
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle pre-flight OPTIONS request for CORS
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // Ensure the request is a POST request
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }
  
  const { action, paymentId, txid, targetUsername } = req.body;

  // --- Pi Server API Call Helper ---
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
    // This 'approve' action is called by our frontend as soon as the payment is created.
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
    // This 'complete' action is called after the user has confirmed the payment in the dialog.
    else if (action === 'complete') {
      console.log(`Completing payment: ${paymentId} with TXID: ${txid}`);
      const piResponse = await callPiApi(`/payments/${paymentId}/complete`, { txid });

      if (!piResponse.ok) {
        const errorData = await piResponse.json();
        console.error("Pi API Error (Complete):", errorData);
        return res.status(piResponse.status).json({ error: 'Pi API completion failed', details: errorData });
      }

      // --- Reputation Logic ---
      // If the payment is successfully completed, we get the reputation score.
      // If the user doesn't exist in our store, we give them a random default score.
      const score = reputationStore[targetUsername.toLowerCase()] || Math.floor(Math.random() * 30) + 60;
      
      // You could also add logic here to INCREMENT a user's score for a successful transaction.
      
      return res.status(200).json({ 
        message: 'Payment completed successfully',
        reputationScore: score 
      });
    } 
    // Handle any unknown actions
    else {
      return res.status(400).json({ error: 'Invalid action specified' });
    }
  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
