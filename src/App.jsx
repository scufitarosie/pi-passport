import React, { useState, useEffect, useCallback } from "react";

function App() {
  const [authResult, setAuthResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [targetUsername, setTargetUsername] = useState("");
  const [reputationScore, setReputationScore] = useState(null);
  const [sdkState, setSdkState] = useState("loading"); // 'loading', 'ready', 'failed'

  const initializePiSdk = useCallback(() => {
    setSdkState("loading");
    setMessage("Initializing Pi SDK...");

    let attempts = 0;
    const maxAttempts = 50; 
    const interval = setInterval(() => {
      const Pi = window.Pi; 
      if (Pi) {
        clearInterval(interval);
        try {
          Pi.init({ version: "2.0", sandbox: true });
          setSdkState("ready");
          setMessage("");
        } catch (err) {
          console.error("Pi SDK initialization failed", err);
          setMessage("Error: Could not initialize Pi SDK.");
          setSdkState("failed");
        }
      } else {
        attempts++;
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          console.error("Pi SDK failed to load after 5 seconds.");
          setMessage("Failed to load Pi SDK. Please ensure you are in the Pi Browser.");
          setSdkState("failed");
        }
      }
    }, 100);
  }, []);

  useEffect(() => {
    initializePiSdk();
  }, [initializePiSdk]);

  const callBackend = async (body) => {
    const response = await fetch('/api/verify-passport', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorResult = await response.json();
      throw new Error(errorResult.error || `Server responded with status ${response.status}`);
    }
    return response.json();
  };

  const handleAuthenticate = () => {
    const Pi = window.Pi;
    if (!Pi) {
      setMessage("Pi SDK not available. Please retry.");
      return;
    }

    setIsLoading(true);
    setMessage("");

    function onIncompletePaymentFound(payment) {
      console.log("Incomplete payment found:", payment);
      setMessage(`An incomplete payment was found: ${payment.identifier}. Please resolve it.`);
      return; 
    };

    Pi.authenticate(['username', 'payments'], onIncompletePaymentFound)
      .then(auth => {
        setAuthResult(auth);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Authentication error:', error);
        setMessage("Authentication failed or was cancelled by the user.");
        setIsLoading(false);
      });
  };

  const checkReputation = () => {
    if (!targetUsername.trim()) {
      setMessage("Please enter a username to check.");
      return;
    }
    setReputationScore(null);
    handlePayment();
  };

  const handlePayment = () => {
    const Pi = window.Pi;
    if (!Pi) return setMessage("Pi SDK not available. Please retry.");
    
    setIsLoading(true);
    setMessage("Preparing transaction...");

    const paymentData = {
      amount: 0.01,
      memo: `Reputation check for: ${targetUsername}`,
      metadata: { targetUser: targetUsername },
    };

    const callbacks = {
      onReadyForServerAuth: async (paymentId) => {
        setMessage("Approving with server...");
        try {
          await callBackend({ action: 'approve', paymentId });
          setMessage("Server approved. Please confirm the transaction.");
        } catch (err) {
          setMessage(`Error: ${err.message}`);
          setIsLoading(false);
        }
      },
      onReadyForServerCompletion: async (paymentId, txid) => {
        setMessage("Finalizing transaction...");
        try {
          const result = await callBackend({ action: 'complete', paymentId, txid, targetUsername });
          setReputationScore(result.reputationScore);
          setMessage("Reputation check successful!");
        } catch (err) {
          setMessage(`Error: ${err.message}`);
        } finally {
          setIsLoading(false);
        }
      },
      onCancel: () => {
        setMessage("Transaction cancelled.");
        setIsLoading(false);
      },
      onError: (error) => {
        setMessage(`An error occurred: ${error.code || 'Please try again.'}`);
        setIsLoading(false);
      },
    };

    try {
      Pi.createPayment(paymentData, callbacks);
    } catch (err) {
      setMessage("Could not initiate the payment process.");
      setIsLoading(false);
    }
  };
  
  return (
    <div style={{ maxWidth: 600, margin: "2rem auto", padding: "1rem", fontFamily: "sans-serif", backgroundColor: "#f4f4f9", borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
      <h1 style={{ textAlign: "center", color: '#333' }}>Pi Passport</h1>
      <p style={{ textAlign: "center", color: '#666' }}>Your On-Chain Reputation Checker</p>
      
      <div style={{ padding: '1rem', borderTop: '1px solid #ddd', marginTop: '1rem' }}>
        {sdkState !== 'ready' && (
          <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#fff3cd', color: '#856404', borderRadius: '5px' }}>
            <p style={{ margin: 0 }}>{message}</p>
            {sdkState === 'failed' && (
              <button onClick={initializePiSdk} style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}>
                Retry
              </button>
            )}
          </div>
        )}

        {sdkState === 'ready' && !authResult && (
          <div style={{ textAlign: "center" }}>
            <p>Connect your Pi account to get started.</p>
            <button 
              onClick={handleAuthenticate} 
              disabled={isLoading} 
              style={{ padding: "0.75rem 1.5rem", fontSize: "1rem", cursor: isLoading ? 'not-allowed' : 'pointer', backgroundColor: isLoading ? '#cccccc' : '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}
            >
              Authenticate with Pi
            </button>
          </div>
        )}

        {sdkState === 'ready' && authResult && (
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
            <button 
              onClick={checkReputation} 
              disabled={isLoading} 
              style={{ width: '100%', padding: "0.75rem 1.5rem", fontSize: "1rem", cursor: isLoading ? 'not-allowed' : 'pointer', backgroundColor: isLoading ? '#cccccc' : '#28a745', color: 'white', border: 'none', borderRadius: '5px' }}
            >
              {isLoading ? "Processing..." : "Check Reputation (0.01 Pi)"}
            </button>
          </div>
        )}
      </div>

      {message && sdkState === 'ready' && (
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
