import React, { useState } from "react";
import { usePi } from "@pi-network/pi-sdk-react";

function App() {
  const { user, login, transactionRequest } = usePi();
  const [usernameToVerify, setUsernameToVerify] = useState("");
  const [verifiedUsers, setVerifiedUsers] = useState([]);

  // Handle login
  const handleLogin = async () => {
    try {
      await login();
    } catch (err) {
      console.error("Login failed:", err);
      alert("Login failed. Please try again.");
    }
  };

  // Handle verification + payment
  const handleVerify = async () => {
    if (!user) {
      alert("Please log in with Pi first!");
      return;
    }

    if (!usernameToVerify.trim()) {
      alert("Enter a username to verify!");
      return;
    }

    try {
      // Request 0.01 Pi payment
      const tx = await transactionRequest({
        amount: "0.01",
        currency: "PI",
        memo: `Verification for ${usernameToVerify}`,
      });

      if (tx?.status === "success") {
        alert(`Payment successful! ${usernameToVerify} verified.`);

        // Add user to verified list
        setVerifiedUsers((prev) => [...prev, usernameToVerify]);
        setUsernameToVerify(""); // Clear input
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
          <p>Logged in as: <strong>{user.username}</strong></p>

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
