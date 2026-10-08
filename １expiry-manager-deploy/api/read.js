// Vercel Serverless Function (Node.js, CommonJS)
// ブラウザから受け取った画像+指示文を、Claude Messages API に中継する。
const crypto = require("crypto");

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_BASE64_CHARS = 6 * 1024 * 1024; // 約4.5MBの画像まで(通常は変換済みで数百KB)

function same(a, b) {
  const x = Buffer.from(String(a || ""));
  const y = Buffer.from(String(b || ""));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const pw = process.env.APP_PASSWORD;
  if (pw && !same(req.headers["x-app-password"], pw)) {
    return res.status(401).json({ error: "パスワードが違います" });
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY が未設定です" });

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = null; }
  }
  const { prompt, image, mediaType } = body || {};
  if (!prompt || typeof prompt !== "string") return res.status(400).json({ error: "prompt がありません" });
  if (prompt.length > 10000) return res.status(400).json({ error: "prompt が長すぎます" });

  const content = [];
  if (image) {
    const type = mediaType || "image/jpeg";
    if (!ALLOWED_TYPES.includes(type)) return res.status(400).json({ error: "未対応の画像形式です: " + type });
    if (typeof image !== "string" || image.length > MAX_BASE64_CHARS) return res.status(413).json({ error: "画像が大きすぎます" });
    content.push({ type: "image", source: { type: "base64", media_type: type, data: image } });
  }
  content.push({ type: "text", text: prompt });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 55000);
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.MODEL || "claude-sonnet-5-5",
        max_tokens: 2048,
        messages: [{ role: "user", content }],
      }),
      signal: ctrl.signal,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      return res.status(502).json({ error: "Claude API " + r.status + ": " + ((j.error && j.error.message) || "エラー") });
    }
    const text = (j.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
    if (!text) return res.status(502).json({ error: "AIの応答が空でした(stop_reason: " + j.stop_reason + ")" });
    return res.status(200).json({ text });
  } catch (e) {
    const msg = e && e.name === "AbortError" ? "Claude APIの応答がタイムアウトしました" : "Claude APIに接続できません";
    return res.status(504).json({ error: msg });
  } finally {
    clearTimeout(timer);
  }
};
