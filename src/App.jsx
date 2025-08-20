import React, { useState, useEffect } from "react";

// --- Main App Component ---
function App() {
  // --- State Management ---
  const [authResult, setAuthResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [targetUsername, setTargetUsername] = useState("");
  const [reputationScore, setReputationScore] = useState(null);

  // --- Pi SDK Initialization ---
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://sdk.pi-network.net/v2/pi-sdk.js";
    script.async = true;
    script.onload = () => {
      try {
        window.Pi.init({ version: "2.0", sandbox: true });
      } catch (err) {
        console.error("Pi SDK initialization failed", err);
        setMessage("Error: Could not initialize Pi SDK.");
      }
    };
    document.body.appendChild(script);
  }, []);

  // --- Core Functions ---

  // 1. Authentication
  const handleAuthenticate = async () => {
    if (!window.Pi) {
      setMessage("Pi SDK not loaded yet. Please wait a moment.");
      return;
    }
    setIsLoading(true);
    setMessage("");
    try {
      const scopes = ['username', 'payments'];
      window.Pi.authenticate(scopes, (auth) => {
        setAuthResult(auth);
        setIsLoading(false);
      }, (err) => {
        console.error("Authentication failed:", err);
        setMessage("Authentication was cancelled or failed.");
        setIsLoading(false);
      });
    } catch (err) {
      console.error('An error occurred during authentication:', err);
      setMessage("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  // 2. Reputation Check (initiates payment)
  const checkReputation = () => {
    if (!targetUsername.trim()) {
      setMessage("Please enter a username to check.");
      return;
    }
    setReputationScore(null); // Reset previous score
    handlePayment();
  };

  // 3. Payment Handling
  const handlePayment = () => {
    if (!window.Pi || !authResult) {
      setMessage("You must be authenticated to perform a transaction.");
      return;
    }
    setIsLoading(true);
    setMessage("Preparing transaction...");

    const paymentData = {
      amount: 0.01,
      memo: `Reputation check for: ${targetUsername}`,
      metadata: { targetUser: targetUsername },
    };

    const callbacks = {
      onReadyForServerAuth: async (paymentId) => {
        setMessage("Transaction ready. Please wait for server approval...");
        try {
          // Call our backend to approve the payment
          await fetch('/api/verify-passport', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'approve', paymentId }),
          });
          // After server approval, the Pi SDK will show the user the confirmation dialog.
          setMessage("Server approved. Please confirm the transaction in the Pi dialog.");
        } catch (err) {
          console.error("Server approval failed:", err);
          setMessage("Error: Could not get server approval for the transaction.");
          setIsLoading(false);
        }
      },
      onReadyForServerCompletion: async (paymentId, txid) => {
        setMessage("Transaction confirmed! Finalizing with server...");
        try {
          // Call our backend to complete the payment and get the reputation score
          const response = await fetch('/api/verify-passport', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'complete', paymentId, txid, targetUsername }),
          });
          const result = await response.json();
          if (response.ok) {
            setReputationScore(result.reputationScore);
            setMessage("Reputation check successful!");
          } else {
            throw new Error(result.error || "Completion failed");
          }
        } catch (err) {
          console.error("Server completion failed:", err);
          setMessage(`Error: ${err.message}`);
        } finally {
          setIsLoading(false);
        }
      },
      onCancel: (paymentId) => {
        setMessage("Transaction cancelled.");
        setIsLoading(false);
      },
      onError: (error, payment) => {
        console.error("Transaction error:", error);
        setMessage(`An error occurred during the transaction: ${error.code}`);
        setIsLoading(false);
      },
    };

    try {
      window.Pi.createPayment(paymentData, callbacks);
    } catch (err) {
      console.error('Error creating payment:', err);
      setMessage("Could not initiate the payment process.");
      setIsLoading(false);
    }
  };
  
  // --- Render Logic ---
  return (
    <div style={{ maxWidth: 600, margin: "2rem auto", padding: "1rem", fontFamily: "sans-serif", backgroundColor: "#f4f4f9", borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
      <h1 style={{ textAlign: "center", color: '#333' }}>Pi Passport</h1>
      <p style={{ textAlign: "center", color: '#666' }}>Your On-Chain Reputation Checker</p>
      
      <div style={{ padding: '1rem', borderTop: '1px solid #ddd', marginTop: '1rem' }}>
        {!authResult ? (
          <div style={{ textAlign: "center" }}>
            <p>Connect your Pi account to get started.</p>
            <button onClick={handleAuthenticate} disabled={isLoading} style={{ padding: "0.75rem 1.5rem", fontSize: "1rem", cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}>
              {isLoading ? "Loading..." : "Authenticate with Pi"}
            </button>
          </div>
        ) : (
          <div>
            <div style={{ padding: '0.5rem', backgroundColor: '#e9f5e9', borderRadius: '5px', textAlign: 'center', marginBottom: '1.5rem' }}>
              <p style={{ margin: 0, color: '#2e7d32' }}>Logged in as: <strong>{authResult.user.username}</strong></p>
            </div>
            
            <h3 style={{ marginTop: 0 }}>Check Reputation</h3>
            <p>Enter a Pi username to check their reputation score. This will cost 0.01 Pi.</p>
            <input
              type="text"
              value={targetUsername}
              onChange={(e) => setTargetUsername(e.target.value)}
              placeholder="e.g., nicolas"
              style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', boxSizing: 'border-box', marginBottom: '1rem' }}
            />
            <button onClick={checkReputation} disabled={isLoading} style={{ width: '100%', padding: "0.75rem 1.5rem", fontSize: "1rem", cursor: 'pointer', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px' }}>
              {isLoading ? "Processing..." : "Check Reputation (0.01 Pi)"}
            </button>
          </div>
        )}
      </div>

      {/* --- Status and Result Display --- */}
      {message && (
        <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#fff3cd', color: '#856404', borderRadius: '5px', textAlign: 'center' }}>
          <p style={{ margin: 0 }}>{message}</p>
        </div>
      )}

      {reputationScore !== null && (
        <div style={{ marginTop: '1.5rem', padding: '1.5rem', backgroundColor: '#d4edda', borderRadius: '5px', textAlign: 'center' }}>
          <h2 style={{ margin: 0, color: '#155724' }}>Reputation Score for '{targetUsername}':</h2>
          <p style={{ fontSize: '3rem', fontWeight: 'bold', margin: '0.5rem 0', color: '#155724' }}>{reputationScore}</p>
        </div>
      )}
    </div>
  );
}

export default App;
