import React, { useState, useEffect } from "react";

function App() {
  const [user, setUser] = useState(null);
  const [usernameToVerify, setUsernameToVerify] = useState("");
  const [verifiedUsers, setVerifiedUsers] = useState([]);
  const [piAvailable, setPiAvailable] = useState(false);

  useEffect(() => {
    // Check if Pi SDK is loaded
    const checkPi = setInterval(() => {
      if (window.Pi) {
        // Initialize Pi SDK with verified App ID
        window.Pi.setup({
          appId: "vsqhrvt2eejnisanjtkdgjk5wabjqktfj2cylwjaplinb8s6x4ieomeatsuhs6vv", // keep the verified App ID
          permissions: [] // no extra permissions needed for login/verification
        });
        setPiAvailable(true);
        clearInterval(checkPi);

        // Get user if already logged in
        window.Pi.getUser()
          .then((u) => {
            if (u) setUser(u);
          })
          .catch(() => {});
      }
    }, 100);

    return () => clearInterval(checkPi);
  }, []);

  const handleLogin = async () => {
    if (!piAvailable) return alert("Please open this app inside Pi Browser.");
    try {
      await window.Pi.authenticate([]);
      const u = await window.Pi.getUser();
      setUser(u);
    } catch (err) {
      console.error(err);
      alert("Login failed.");
    }
  };

  const handleVerify = () => {
    if (!user) return alert("Please log in first!");
    if (!usernameToVerify.trim()) return alert("Enter a username to verify!");

    setVerifiedUsers((prev) => [...prev, usernameToVerify]);
    setUsernameToVerify("");
  };

  return (
    <div style={{ maxWidth: 600, margin: "2rem auto", padding: "1rem", fontFamily: "sans-serif" }}>
      <h1 style={{ textAlign: "center" }}>Pi Passport</h1>

      {!piAvailable && (
        <p style={{ color: "red", textAlign: "center" }}>
          This app only works inside Pi Browser. Make sure you opened the link there.
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
            Verify Identity
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
