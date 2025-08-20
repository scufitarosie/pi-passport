import React, { useState, useEffect, useCallback } from "react";

// --- Main App Component ---
function App() {
  // --- State Management ---
  const [authResult, setAuthResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [targetUsername, setTargetUsername] = useState("");
  const [reputationScore, setReputationScore] = useState(null);
  const [sdkState, setSdkState] = useState("loading"); // 'loading', 'ready', 'failed'
  const [logs, setLogs] = useState([]); // New state for on-screen logging

  // --- Helper to add logs to the UI for debugging ---
  const addLog = (logMessage) => {
    console.log(logMessage); // Also log to the actual console
    setLogs(prevLogs => [`[${new Date().toLocaleTimeString()}] ${logMessage}`, ...prevLogs]);
  };

  // --- Pi SDK Initialization Logic ---
  const initializePiSdk = useCallback(() => {
    setSdkState("loading");
    setMessage("Initializing Pi SDK...");
    addLog("Attempting to initialize Pi SDK...");

    let attempts = 0;
    const maxAttempts = 50;

    const interval = setInterval(() => {
      const Pi = window.Pi;
      if (Pi) {
        clearInterval(interval);
        try {
          Pi.init({ version: "2.0" });
          setSdkState("ready");
          setMessage("");
          addLog("Pi SDK Initialized successfully.");
        } catch (err) {
          setSdkState("failed");
          addLog(`Error: SDK init failed. ${err.message}`);
        }
      } else {
        attempts++;
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          setSdkState("failed");
          addLog("Error: SDK not found after 5 seconds.");
        }
      }
    }, 100);
  }, []);

  // --- Run Initialization on Mount ---
  useEffect(() => {
    initializePiSdk();
  }, [initializePiSdk]);

  // --- Helper for Backend Communication ---
  const callBackend = async (body) => {
    addLog(`Calling backend with action: ${body.action}`);
    const response = await fetch('/api/verify-passport', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorResult = await response.json();
      addLog(`Backend call failed: ${errorResult.error}`);
      throw new Error(errorResult.error || `Server responded with status ${response.status}`);
    }
    addLog("Backend call successful.");
    return response.json();
  };

  // --- Core Functions ---
  const handleAuthenticate = () => {
    addLog("handleAuthenticate function called.");
    const Pi = window.Pi;
    if (!Pi) {
      addLog("Authentication failed: Pi SDK object not found.");
      setMessage("Pi SDK not available. Please retry.");
      return;
    }

    setIsLoading(true);
    setMessage("");
    addLog("Starting authentication process...");

    function onIncompletePaymentFound(payment) {
      addLog(`Incomplete payment found: ${payment.identifier}`);
      setMessage(`An incomplete payment was found. Please resolve it.`);
      return; 
    };

    try {
      // This try/catch block will capture any immediate errors when calling the function.
      Pi.authenticate(['username', 'payments'], onIncompletePaymentFound)
        .then(auth => {
          addLog(`Authentication successful for user: ${auth.user.username}`);
          setAuthResult(auth);
          setIsLoading(false);
        })
        .catch(error => {
          // This catches errors within the promise, like the user cancelling.
          addLog(`Authentication promise error: ${error.message || 'User cancelled or an unknown error occurred.'}`);
          setMessage("Authentication failed or was cancelled by the user.");
          setIsLoading(false);
        });
      
      addLog("Pi.authenticate() was called. Waiting for user action...");

    } catch (err) {
      // This catches synchronous errors if the SDK call itself fails instantly.
      addLog(`CRITICAL ERROR during authenticate call: ${err.message}`);
      setMessage("A critical error occurred while trying to authenticate.");
      setIsLoading(false);
    }
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

    const paymentData = { amount: 0.01, memo: `Reputation check for: ${targetUsername}`, metadata: { targetUser: targetUsername } };
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
    Pi.createPayment(paymentData, callbacks);
  };
  
  // --- Render Logic ---
  return (
    <div style={{ maxWidth: 600, margin: "2rem auto", padding: "1rem", fontFamily: "sans-serif", backgroundColor: "#f4f4f9", borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
      <h1 style={{ textAlign: "center", color: '#333' }}>Pi Passport</h1>
      <p style={{ textAlign: "center", color: '#666' }}>Your On-Chain Reputation Checker</p>
      
      <div style={{ padding: '1rem', borderTop: '1px solid #ddd', marginTop: '1rem' }}>
        {sdkState !== 'ready' && (
          <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#fff3cd', color: '#856404', borderRadius: '5px' }}>
            <p style={{ margin: 0 }}>{message}</p>
            {sdkState === 'failed' && <button onClick={initializePiSdk} style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}>Retry</button>}
          </div>
        )}

        {sdkState === 'ready' && !authResult && (
          <div style={{ textAlign: "center" }}>
            <p>Connect your Pi account to get started.</p>
            <button onClick={handleAuthenticate} disabled={isLoading} style={{ padding: "0.75rem 1.5rem", fontSize: "1rem", cursor: isLoading ? 'not-allowed' : 'pointer', backgroundColor: isLoading ? '#cccccc' : '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}>Authenticate with Pi</button>
          </div>
        )}

        {sdkState === 'ready' && authResult && (
          <div>
            <div style={{ padding: '0.5rem', backgroundColor: '#e9f5e9', borderRadius: '5px', textAlign: 'center', marginBottom: '1.5rem' }}>
              <p style={{ margin: 0, color: '#2e7d32' }}>Logged in as: <strong>{authResult.user.username}</strong></p>
            </div>
            <h3 style={{ marginTop: 0 }}>Check Reputation</h3>
            <input type="text" value={targetUsername} onChange={(e) => setTargetUsername(e.target.value)} placeholder="e.g., nicolas" style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', boxSizing: 'border-box', marginBottom: '1rem' }}/>
            <button onClick={checkReputation} disabled={isLoading} style={{ width: '100%', padding: "0.75rem 1.5rem", fontSize: "1rem", cursor: isLoading ? 'not-allowed' : 'pointer', backgroundColor: isLoading ? '#cccccc' : '#28a745', color: 'white', border: 'none', borderRadius: '5px' }}>{isLoading ? "Processing..." : "Check Reputation (0.01 Pi)"}</button>
          </div>
        )}
      </div>

      {message && sdkState === 'ready' && <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#fff3cd', color: '#856404', borderRadius: '5px', textAlign: 'center' }}><p style={{ margin: 0 }}>{message}</p></div>}
      {reputationScore !== null && <div style={{ marginTop: '1.5rem', padding: '1.5rem', backgroundColor: '#d4edda', borderRadius: '5px', textAlign: 'center' }}><h2 style={{ margin: 0, color: '#155724' }}>Reputation Score for '{targetUsername}':</h2><p style={{ fontSize: '3rem', fontWeight: 'bold', margin: '0.5rem 0', color: '#155724' }}>{reputationScore}</p></div>}
      
      {/* --- On-Screen Debug Logger --- */}
      {logs.length > 0 && (
        <div style={{ marginTop: '1.5rem', borderTop: '1px solid #ddd', paddingTop: '1rem' }}>
          <h4 style={{ marginTop: 0 }}>Debug Log:</h4>
          <pre style={{ backgroundColor: '#333', color: '#fff', padding: '0.5rem', borderRadius: '5px', maxHeight: '200px', overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {logs.join('\n')}
          </pre>
        </div>
      )}
    </div>
  );
}

export default App;
