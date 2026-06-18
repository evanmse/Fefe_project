import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * POST /api/chat
 * Serverless function — appelle Mistral AI en gardant la clé côté serveur.
 *
 * Body: { message: string, history?: Array<{role, content}> }
 * Response: { reply: string, usage?: { prompt_tokens, completion_tokens, total_tokens } }
 */

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MISTRAL_BASE = "https://api.mistral.ai/v1";

// In-memory rate limit store (for single-instance deployments)
interface RateLimitEntry {
  count: number;
  resetAt: number;
}
const rateLimitStore = new Map<string, RateLimitEntry>();

const SYSTEM_PROMPT = `Tu es l'assistant ingénieur de piste de la Scuderia Ferrari.
Tu aides les ingénieurs avec la télémétrie, le LiDAR, le setup, l'aérodynamique et la stratégie de course.

### Domaines d'expertise :
- Garde au sol (ride height) mesurée par LiDAR
- Aérodynamique : downforce, drag, efficiency, balance
- Rake / assiette de la voiture
- Dégradation des pneus, stratégie courses
- Télémétrie temps réel (RPM, speed, DRS, fuel)
- Statut piste : SUBOPTIMAL, CRITICAL
- Setup comparaison et optimisation

### Style :
- Réponds en français, technique mais accessible
- Sois concis (2-4 phrases) sauf si on demande un détail
- Utilise les termes F1 exacts (downforce, rake, DRS, etc.)
- Si tu ne sais pas, dis-le honnêtement
- Tu peux donner des conseils d'optimisation setup

### Données en temps réel disponibles :
- LiDAR AV/AR (mm), downforce (kg), drag (kg), rake (°)
- Speed (km/h), RPM, DRS status, tyre temp (°C)
- Statut : OPTIMAL / SUBOPTIMAL / CRITICAL`;

function getClientIp(req: VercelRequest): string {
  const fwd = req.headers["x-forwarded-for"];
  const realIp = req.headers["x-real-ip"];
  return Array.isArray(fwd) ? fwd[0] : (typeof fwd === "string" ? fwd : (typeof realIp === "string" ? realIp : "unknown"));
}

function rateLimit(key: string, max: number, windowMs: number): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1 };
  }
  entry.count += 1;
  return { allowed: entry.count <= max, remaining: Math.max(0, max - entry.count) };
}

// Cleanup expired entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, e] of rateLimitStore.entries()) {
      if (e.resetAt < now) rateLimitStore.delete(k);
    }
  }, 5 * 60 * 1000);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!MISTRAL_API_KEY) {
    return res.status(503).json({ error: "MISTRAL_API_KEY not configured on server." });
  }

  // Rate limiting (10 req/min per IP)
  const ip = getClientIp(req);
  const limit = rateLimit(`chat:${ip}`, 10, 60_000);
  if (!limit.allowed) {
    return res.status(429).json({ error: "Too many requests. Please slow down." });
  }
  res.setHeader("X-RateLimit-Remaining", String(limit.remaining));

  const body = req.body ?? {};
  const { message, history = [] } = body;
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({ error: "message required" });
  }

  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.slice(-10).map((h: { role: string; content: string }) => ({
      role: h.role,
      content: h.content,
    })),
    { role: "user", content: message.trim() },
  ];

  try {
    const response = await fetch(`${MISTRAL_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: "mistral-small-latest",
        messages,
        temperature: 0.3,
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error("[Chat] Mistral error:", response.status, errText.slice(0, 300));
      return res.status(502).json({ error: `Mistral API error: ${response.status}` });
    }

    const data = await response.json();
    const reply =
      data.choices?.[0]?.message?.content ??
      "Désolé, je n'ai pas pu générer de réponse.";

    const usage = data.usage ? {
      prompt_tokens: data.usage.prompt_tokens,
      completion_tokens: data.usage.completion_tokens,
      total_tokens: data.usage.total_tokens,
    } : undefined;

    return res.status(200).json({ reply, usage });
  } catch (err) {
    console.error("[Chat] Error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}