module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Faqat POST" });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: "ANTHROPIC_API_KEY Vercel’da o‘rnatilmagan" });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const messages = (body.messages || []).slice(-20).map(m => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content || "").slice(0, 12000)
    }));
    const imgs = (body.images || []).slice(0, 3).filter(u => typeof u === "string" && u.includes(","));
    if (imgs.length && messages.length) {
      const last = messages[messages.length - 1];
      last.content = [
        ...imgs.map(u => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: u.split(",")[1] } })),
        { type: "text", text: last.content }
      ];
    }
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-5-5", max_tokens: 4000, messages })
    });
    const d = await r.json();
    if (!r.ok) return res.status(500).json({ error: (d.error && d.error.message) || "API xatosi" });
    res.status(200).json({ text: (d.content || []).map(c => c.text || "").join("") });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
};
