import React, { useState, useEffect } from "react";

function App() {
  const [user, setUser] = useState(null);
  const [usernameToVerify, setUsernameToVerify] = useState("");
  const [verifiedUsers, setVerifiedUsers] = useState([]);

  // Check if Pi is available and get user info
  useEffect(() => {
    if (window.Pi) {
      window.Pi.setup({ appId: "YOUR_APP_ID_HERE" }); // replace with your Pi App ID
      window.Pi.getUser()
        .then((u) => {
          if (u) setUser(u);
        })
        .catch(() => {});
    }
  }, []);

  const handleLogin = async () => {
    if (!window.Pi) return alert("Please open in Pi Browser.");
    try {
      const u = await window.Pi.login();
      setUser(u);
    } catch (err) {
      console.error(err);
      alert("Login failed.");
    }
  };

  const handleVerify = async () => {
    if (!user) return alert("Please log in first!");
    if (!usernameToVerify.trim()) return alert("Enter a username to verify!");

    try {
      // Request 0.01 Pi payment
      const tx = await window.Pi.requestPayment({
        amount: "0.01",
        currency: "Pi",
        memo: `Verification for ${usernameToVerify}`,
      });

      if (tx?.status === "success") {
        alert(`${usernameToVerify} verified! Payment successful.`);
        setVerifiedUsers((prev) => [...prev, usernameToVerify]);
        setUsernameToVerify("");
      } else {
        alert("Payment failed or cancelled.");
      }
    } catch (err) {
      console.error(err);
      alert("Error processing payment.");
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "2rem auto", padding: "1rem", fontFamily: "sans-serif" }}>
      <h1 style={{ textAlign: "center" }}>Pi Passport</h1>

      {!user ? (
        <button onClick={handleLogin} style={{ padding: "0.5rem 1rem", fontSize: "1rem" }}>
          Login with Pi
        </button>
      ) : (
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
