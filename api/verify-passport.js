const parseAllowedOrigins = () => {
  const raw = process.env.ALLOWED_ORIGINS || "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};

const setCors = (req, res) => {
  const origin = req.headers.origin || "";
  const allowed = parseAllowedOrigins();

  if (allowed.length === 0 && origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else if (allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
};

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { accessToken, claimedUid } = req.body || {};

    if (!accessToken || typeof accessToken !== "string") {
      return res
        .status(400)
        .json({ ok: false, error: "Missing or invalid 'accessToken'" });
    }

    const meResp = await fetch("https://api.minepi.com/v2/me", {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!meResp.ok) {
      const text = await meResp.text();
      return res
        .status(401)
        .json({ ok: false, error: "Invalid accessToken", detail: text });
    }

    const me = await meResp.json();

    if (claimedUid && me.uid !== claimedUid) {
      return res
        .status(403)
        .json({ ok: false, error: "UID mismatch", serverUid: me.uid });
    }

    return res.status(200).json({
      ok: true,
      uid: me.uid,
      username: me.username || null,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ ok: false, error: "Server error", detail: err.message });
  }
}

