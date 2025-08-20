import React from 'react';
// Make sure to import your CSS file. 
// If your CSS file is named App.css and is in the same src folder, use:
import './App.css'; 

// --- Helper Components ---

// Icon for the Pi currency
const PiIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="pi-icon">
    <path d="M10.19 4.39H16.25V6.23H13.22V10.3H15.65C17.65 10.3,19.25 11.9,19.25 13.9C19.25 15.9,17.65 17.5,15.65 17.5H10.19V4.39ZM13.22 12.14V15.66H15.65C16.61 15.66,17.39 14.88,17.39 13.9C17.39 12.92,16.61 12.14,15.65 12.14H13.22Z" fill="#F0B90B"/>
    <path d="M7.75 4.39H4.75V19.5H6.59V6.23H7.75V19.5H9.59V4.39H7.75Z" fill="#F0B90B"/>
  </svg>
);

// A simple modal for showing messages to the user
const Modal = ({ title, message, onClose }) => (
  <div className="modal-overlay">
    <div className="modal-content">
      <h3>{title}</h3>
      <p>{message}</p>
      <button onClick={onClose} className="button primary">
        Close
      </button>
    </div>
  </div>
);


// --- Main App Component ---

export default function App() {
  // --- State Management ---
  const [user, setUser] = React.useState(null);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [modal, setModal] = React.useState({ show: false, title: '', message: '' });
  const [targetUsername, setTargetUsername] = React.useState('');
  const [reputationScore, setReputationScore] = React.useState(null);

  // --- Simulated Database for Reputation Scores ---
  const [simulatedUserReputations, setSimulatedUserReputations] = React.useState({
    'pi-user-1': 95,
    'pi-user-2': 78,
    'scufitarosie': 99,
  });

  // --- Pi SDK Integration ---
  React.useEffect(() => {
    const loadPiSDK = () => {
      const script = document.createElement('script');
      script.src = 'https://sdk.pi-network.net/v2/pi-sdk.js';
      script.async = true;
      script.onload = () => {
        try {
          window.Pi.init({ version: "2.0", sandbox: true });
          setIsLoading(false);
        } catch (err) {
          console.error("Pi SDK initialization failed", err);
          setModal({ show: true, title: 'SDK Error', message: 'Could not initialize the Pi Network SDK.' });
        }
      };
      script.onerror = () => {
        console.error("Pi SDK script failed to load.");
        setModal({ show: true, title: 'Network Error', message: 'Could not load the Pi Network SDK.' });
      };
      document.body.appendChild(script);
    };
    loadPiSDK();
  }, []);

  // --- Core Functions ---
  const handleAuthenticate = async () => {
    setIsLoading(true);
    try {
      const scopes = ['username', 'payments'];
      const onAuthComplete = (authResult) => {
        setUser(authResult.user);
        setIsAuthenticated(true);
        setIsLoading(false);
        setModal({ show: true, title: 'Authentication Success', message: `Welcome, ${authResult.user.username}!` });
      };
      const onAuthCancel = () => {
        setIsLoading(false);
        setModal({ show: true, title: 'Authentication Cancelled', message: 'You cancelled the authentication process.' });
      };
      const onAuthError = (error) => {
        setIsLoading(false);
        setModal({ show: true, title: 'Authentication Error', message: `An error occurred: ${error.message}` });
      };
      await window.Pi.authenticate(scopes, onAuthComplete, onAuthCancel, onAuthError);
    } catch (err) {
      setIsLoading(false);
      setModal({ show: true, title: 'Error', message: 'Something went wrong while trying to authenticate.' });
    }
  };

  const checkReputation = () => {
    if (!isAuthenticated) {
      setModal({ show: true, title: 'Not Authenticated', message: 'Please authenticate with your Pi account first.' });
      return;
    }
    if (!targetUsername.trim()) {
      setModal({ show: true, title: 'Invalid Input', message: 'Please enter a username to check their reputation.' });
      return;
    }
    setReputationScore(null);
    handlePayment();
  };

  const handlePayment = () => {
    setIsLoading(true);
    const paymentData = {
      amount: 0.01,
      memo: `Reputation check for user: ${targetUsername}`,
      metadata: { userId: user.uid, targetUser: targetUsername },
    };
    const callbacks = {
      onReadyForServerAuth: (paymentId) => {
        setTimeout(() => window.Pi.approvePayment({ paymentId }), 1500);
      },
      onReadyForServerCompletion: (paymentId, txid) => {
        setTimeout(() => {
          window.Pi.completePayment({ paymentId, txid });
          const score = simulatedUserReputations[targetUsername.toLowerCase()] || Math.floor(Math.random() * 30) + 60;
          setReputationScore(score);
          setModal({ show: true, title: 'Transaction Complete', message: 'The reputation check was successful!' });
          setIsLoading(false);
        }, 2000);
      },
      onCancel: () => {
        setIsLoading(false);
        setModal({ show: true, title: 'Payment Cancelled', message: 'You cancelled the payment.' });
      },
      onError: (error) => {
        setIsLoading(false);
        setModal({ show: true, title: 'Payment Error', message: `An error occurred: ${error.message}` });
      },
    };
    try {
      window.Pi.createPayment(paymentData, callbacks);
    } catch (err) {
      setIsLoading(false);
      setModal({ show: true, title: 'Error', message: 'Could not initiate the payment process.' });
    }
  };

  const getScoreColorClass = (score) => {
    if (score > 85) return 'score-good';
    if (score > 60) return 'score-medium';
    return 'score-bad';
  };

  // --- Render Logic ---
  return (
    <div className="app-container">
      {modal.show && <Modal title={modal.title} message={modal.message} onClose={() => setModal({ ...modal, show: false })} />}
      {isLoading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Processing...</p>
        </div>
      )}
      <div className="card">
        <div className="header">
          <h1 className="title">Pi Passport</h1>
          <p className="subtitle">Your On-Chain Reputation Checker</p>
        </div>
        {!isAuthenticated ? (
          <div className="auth-section">
            <p>Connect your Pi account to get started.</p>
            <button onClick={handleAuthenticate} className="button primary full-width">
              Authenticate with Pi
            </button>
          </div>
        ) : (
          <div>
            <div className="user-info">
              <p>Authenticated as:</p>
              <p className="username">{user.username}</p>
            </div>
            <div className="form-section">
              <label htmlFor="username">Enter Pi Username to Check</label>
              <input
                id="username"
                type="text"
                value={targetUsername}
                onChange={(e) => setTargetUsername(e.target.value)}
                placeholder="e.g., nicolas"
                className="input-field"
              />
              <button onClick={checkReputation} className="button secondary full-width">
                Check Reputation (Cost: <PiIcon /> 0.01)
              </button>
            </div>
            {reputationScore !== null && (
              <div className="score-container">
                <p className="score-label">Reputation Score for</p>
                <p className="score-username">{targetUsername}</p>
                <div className={`score-value ${getScoreColorClass(reputationScore)}`}>
                  {reputationScore}
                </div>
                <p className="score-out-of">out of 100</p>
              </div>
            )}
          </div>
        )}
      </div>
      <footer>
        <p>Pi Passport App - Hackathon Edition</p>
      </footer>
    </div>
  );
}
