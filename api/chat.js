module.exports = async (req, res) => {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Faqat POST" });
  const key = process.env.GROQ_API_KEY;
  if (!key)
    return res
      .status(500)
      .json({ error: "GROQ_API_KEY Vercel’da o‘rnatilmagan" });
  try {
    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const messages = (body.messages || []).slice(-20).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content || "").slice(0, 8000),
    }));
    const imgs = (body.images || [])
      .slice(0, 3)
      .filter((u) => typeof u === "string" && u.includes(","));
    let model = "llama-3.3-70b-versatile";
    if (imgs.length && messages.length) {
      model = "meta-llama/llama-4-scout-17b-16e-instruct";
      const last = messages[messages.length - 1];
      last.content = [
        ...imgs.map((u) => ({ type: "image_url", image_url: { url: u } })),
        { type: "text", text: last.content },
      ];
    }
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer " + key,
      },
      body: JSON.stringify({
        model,
        max_tokens: 1500,
        messages,
      }),
    });
    const d = await r.json();
    if (!r.ok)
      return res
        .status(500)
        .json({ error: (d.error && d.error.message) || "API xatosi" });
    res.status(200).json({
      text: (d.choices && d.choices[0] && d.choices[0].message.content) || "",
    });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
};
