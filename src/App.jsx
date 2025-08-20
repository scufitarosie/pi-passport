import React, { useState, useEffect, useCallback } from "react";

// --- Main App Component ---
function App() {
  // --- State Management ---
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [sdkState, setSdkState] = useState("loading");
  
  // App logic states
  const [view, setView] = useState('search'); // 'search' or 'rating'
  const [searchedUser, setSearchedUser] = useState('');
  const [reputationScore, setReputationScore] = useState(null);

  // --- Pi SDK Detection ---
  useEffect(() => {
    let attempts = 0;
    const interval = setInterval(() => {
      if (window.Pi) {
        clearInterval(interval);
        setSdkState("ready");
      } else {
        attempts++;
        if (attempts > 50) { // 5 seconds
          clearInterval(interval);
          setSdkState("failed");
          setMessage("Failed to load Pi SDK. Please ensure you are in the Pi Browser.");
        }
      }
    }, 100);
  }, []);

  // --- API Call Helper ---
  const callBackend = async (method, path, body = null) => {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    try {
      const response = await fetch(path, options);
      if (!response.ok) {
        // Try to parse the error message from the server's JSON response
        try {
          const errorResult = await response.json();
          throw new Error(errorResult.error || `Server responded with status ${response.status}`);
        } catch (e) {
          // If the response isn't JSON, use the status text
          throw new Error(`Server responded with status ${response.status}: ${response.statusText}`);
        }
      }
      return response.json();
    } catch (err) {
      // This catches network errors (e.g., failed to fetch) and the errors thrown above
      console.error("API call failed:", err);
      throw err; // Re-throw the error to be handled by the calling function
    }
  };

  // --- Core Functions ---

  // 1. Check Reputation (Free)
  const handleCheckReputation = async (username) => {
    if (!username) {
      setMessage("Please enter a username.");
      return;
    }
    setIsLoading(true);
    setMessage(`Checking reputation for ${username}...`);
    try {
      const result = await callBackend('GET', `/api/verify-passport?username=${encodeURIComponent(username)}`);
      setSearchedUser(username);
      setReputationScore(result.score); // This will be null if the user is new
      setView('rating');
      setMessage("");
    } catch (err) {
      setMessage(`Error fetching reputation: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 2. Handle Rating Payment
  const handleRatingPayment = (ratingType) => {
    setIsLoading(true);
    setMessage("Authenticating for payment...");

    function onIncompletePaymentFound(payment) {
      setMessage(`Incomplete payment found: ${payment.identifier}.`);
    };

    window.Pi.authenticate(['payments'], onIncompletePaymentFound)
      .then(() => {
        setMessage("Authentication successful. Creating payment...");
        createRatingPayment(ratingType);
      })
      .catch(err => {
        setMessage("Authentication failed or was cancelled.");
        setIsLoading(false);
      });
  };

  // 3. Create the Pi Payment
  const createRatingPayment = (ratingType) => {
    const paymentData = {
      amount: 0.01,
      memo: `Rating transaction for ${searchedUser}`,
      metadata: { userToRate: searchedUser, rating: ratingType },
    };

    const callbacks = {
      onReadyForServerApproval: async (paymentId) => {
        setMessage("Approving with server...");
        try {
          await callBackend('POST', '/api/verify-passport', { action: 'approve', paymentId });
          setMessage("Server approved. Please confirm the transaction in the Pi dialog.");
        } catch (err) {
          setMessage(`Error: ${err.message}`);
          setIsLoading(false);
        }
      },
      onReadyForServerCompletion: async (paymentId, txid) => {
        setMessage("Finalizing transaction...");
        try {
          await callBackend('POST', '/api/verify-passport', { action: 'complete', paymentId, txid, metadata: paymentData.metadata });
          setMessage("Rating submitted successfully!");
          // Re-fetch the score to show the update
          handleCheckReputation(searchedUser); 
        } catch (err) {
          setMessage(`Error: ${err.message}`);
        } finally {
          setIsLoading(false);
        }
      },
      onCancel: () => {
        setMessage("Payment was cancelled.");
        setIsLoading(false);
      },
      onError: (error) => {
        setMessage(`An error occurred: ${error.code || 'Please try again.'}`);
        setIsLoading(false);
      },
    };
    window.Pi.createPayment(paymentData, callbacks);
  };

  // --- Render Logic ---
  const renderContent = () => {
    if (sdkState !== 'ready') {
      return <p>{message || "Initializing Pi SDK..."}</p>;
    }
    
    if (view === 'search') {
      return (
        <div>
          <p>Enter a username to check their reputation for free.</p>
          <form onSubmit={(e) => { e.preventDefault(); handleCheckReputation(e.target.elements.username.value); }}>
            <input name="username" type="text" placeholder="e.g., nicolas" style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', boxSizing: 'border-box', marginBottom: '1rem' }} />
            <button type="submit" disabled={isLoading} style={{ width: '100%', padding: '0.75rem', fontSize: '1rem' }}>
              {isLoading ? "Checking..." : "Check Reputation"}
            </button>
          </form>
        </div>
      );
    }

    if (view === 'rating') {
      // Logic for displaying the score or the new user message
      const hasRating = reputationScore !== null;
      const scoreDisplay = hasRating ? reputationScore : "N/A";
      const scoreColor = hasRating && reputationScore < 80 ? '#dc3545' : '#28a745';

      return (
        <div>
          <p>Reputation for <strong>{searchedUser}</strong>:</p>
          {hasRating ? (
            <div style={{ fontSize: '4rem', fontWeight: 'bold', margin: '1rem 0', color: scoreColor }}>
              {scoreDisplay}
            </div>
          ) : (
            <div style={{ margin: '1rem 0', padding: '1rem', backgroundColor: '#e2e3e5', borderRadius: '8px' }}>
              <p style={{ margin: 0, fontWeight: 500 }}>This user doesn't have a rating yet. Want to give them one?</p>
            </div>
          )}

          <div style={{ marginTop: '2rem', borderTop: '1px solid #eee', paddingTop: '2rem' }}>
            <p>Pay 0.01 Pi to rate this transaction:</p>
            <button onClick={() => handleRatingPayment('good')} disabled={isLoading} style={{ backgroundColor: '#28a745', color: 'white', marginRight: '1rem' }}>
              Good Transaction
            </button>
            <button onClick={() => handleRatingPayment('bad')} disabled={isLoading} style={{ backgroundColor: '#dc3545', color: 'white' }}>
              Bad Transaction
            </button>
          </div>
          <button onClick={() => setView('search')} style={{ marginTop: '2rem', backgroundColor: '#6c757d', color: 'white' }}>
            Search for another user
          </button>
        </div>
      );
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: '2rem auto', padding: '2rem', fontFamily: 'sans-serif', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
      <h1 style={{ textAlign: 'center' }}>Pi Passport</h1>
      {renderContent()}
      {message && <p style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '8px' }}>{message}</p>}
    </div>
  );
}

export default App;
