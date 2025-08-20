import React, { useState, useEffect } from "react";

const Pi = window.Pi;

export default function App() {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [passport, setPassport] = useState(null);
  const [verifyResult, setVerifyResult] = useState(null);

  // Authenticate with Pi
  const login = async () => {
    try {
      const scopes = ["username"];
      const onIncompletePaymentFound = (payment) => {};
      const { user, accessToken } = await Pi.authenticate(
        scopes,
        onIncompletePaymentFound
      );
      setUser(user);
      setAccessToken(accessToken);
    } catch (err) {
      console.error("Login error:", err);
    }
  };

  // Generate passport object
  const generatePassport = () => {
    if (!user || !accessToken) return;
    const payload = {
      uid: user.uid,
      username: user.username,
      timestamp: Date.now(),
    };
    setPassport(payload);
  };

  // Verify passport with backend
  const verifyPassport = async () => {
    if (!passport || !accessToken) return;
    try {
      const res = await fetch("/api/verify-passport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken,
          claimedUid: passport.uid,
        }),
      });
      const data = await res.json();
      setVerifyResult(data);
    } catch (err) {
      console.error("Verify error:", err);
    }
  };

  return (
    <div style={{ padding: "1rem", fontFamily: "sans-serif" }}>
      <h1>Pi Passport</h1>
      {!user ? (
        <button onClick={login}>Login with Pi</button>
      ) : (
        <div>
          <p>Welcome, {user.username}</p>
          <button onClick={generatePassport}>Generate Passport</button>
        </div>
      )}

      {passport && (
        <div style={{ marginTop: "1rem" }}>
          <h3>Passport JSON</h3>
          <pre>{JSON.stringify(passport, null, 2)}</pre>
          <button onClick={verifyPassport}>Verify with Server</button>
        </div>
      )}

      {verifyResult && (
        <div style={{ marginTop: "1rem" }}>
          <h3>Verification Result</h3>
          <pre>{JSON.stringify(verifyResult, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

