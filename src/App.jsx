import React, { useState, useEffect } from "react";

function App() {
  const [user, setUser] = useState(null);
  const [usernameToVerify, setUsernameToVerify] = useState("");
  const [verifiedUsers, setVerifiedUsers] = useState([]);
  const [piAvailable, setPiAvailable] = useState(false);

  useEffect(() => {
    const checkPi = () => {
      if (window.Pi) {
        setPiAvailable(true);
        window.Pi.setup({ appId: "YOUR_APP_ID_HERE" }); // <-- replace with your Pi App ID
        window.Pi.getUser()
          .then((u) => { if(u) setUser(u); })
          .catch(() => {});
      } else {
        setTimeout(checkPi, 100);
      }
    };
    checkPi();
  }, []);

  const handleLogin = async () => {
    if (!piAvailable) return alert("Please open in Pi Browser.");
    try {
      await window.Pi.authenticate(["payments"]);
      const u = await window.Pi.getUser();
      setUser(u);
    } catch (err) {
      console.error(err);
      alert("Login failed.");
    }
  };

  const handleVerify = async () => {
    if (!user) return alert("Please log in first!");
    if (!usernameToVerify.trim()) return alert("Enter a username to verify!");

    const paymentData = {
      amount: 0.01,
      memo: `Verification payment for ${usernameToVerify}`,
      metadata: { username: usernameToVerify },
    };

    const paymentCallbacks = {
      onReadyForServerApproval: (paymentId) => {
        console.log("Payment ready for server approval:", paymentId);
      },
      onReadyForServerCompletion: (paymentId, txid) => {
        console.log("Payment ready for completion:", paymentId, txid);
        setVerifiedUsers((prev) => [...prev, usernameToVerify]);
        setUsernameToVerify("");
      },
      onCancel: (paymentId) => {
        alert("Payment cancelled.");
      },
      onError: (error, payment) => {
        console.error("Payment error:", error, payment);
        alert("Payment failed.");
      },
    };

    try {
      await window.Pi.createPayment(paymentData, paymentCallbacks);
    } catch (err) {
      console.error(err);
      alert("Failed to initiate payment.");
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "2rem auto", padding: "1rem", fontFamily: "sans-serif" }}>
      <h1 style={{ textAlign: "center" }}>Pi Passport</h1>

      {!piAvailable && (
        <p style={{ color: "red", textAlign: "center" }}>
          This app only works in the Pi Browser.
        </p>
      )}

      {piAvailable && !user && (
        <div style={{ textAlign: "center" }}>
          <button onClick={handleLogin} style={{ padding: "0.5rem 1rem", fontSize: "1rem" }}>
            Login with Pi
          </button>
        </div>
      )}

      {piAvailable && user && (
        <div>
          <p>Logged in as: <strong>{user.username || user.id}</strong></p>

          <input
            type="text"
            placeholder="Enter username to verify"
            value={usernameToVerify}
            onChange={(e) => setUsernameToVerify(e.target.value)}
            style={{ padding: "0.5rem", width: "60%", marginRight: "0.5rem" }}
          />
          <button onClick={handleVerify} style={{ padding: "0.5rem 1rem" }}>
            Verify Identity (0.01 Pi)
          </button>

          {verifiedUsers.length > 0 && (
            <div style={{ marginTop: "1rem" }}>
              <h3>Verified Users:</h3>
              <ul>
                {verifiedUsers.map((u, idx) => (
                  <li key={idx}>{u}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
