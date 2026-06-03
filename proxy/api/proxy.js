/**
 * proxy.js — nano-dev default-key proxy (Vercel Edge Function)
 *
 * Why this exists:
 *   The "default key" tier must not ship the real Groq API key inside the npm
 *   package (anyone could extract it). Instead, the CLI calls THIS endpoint,
 *   which holds the key in a Vercel environment variable and forwards the
 *   request to Groq. The key never leaves the server.
 *
 * It speaks the OpenAI chat-completions protocol, so the CLI's existing
 * "openai" provider works against it unchanged — just point OPENAI_BASE_URL
 * at this deployment's /v1.
 *
 * Streaming, tool/function calling, and usage all pass through transparently.
 */

export const config = { runtime: "edge" };

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// Only allow the cheap/free models through the shared key (abuse guard).
const ALLOWED_MODELS = new Set([
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "openai/gpt-oss-20b",
  "openai/gpt-oss-120b",
]);

// Hard cap on output tokens per request on the shared tier.
const MAX_OUTPUT_TOKENS = 1024;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

export default async function handler(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (req.method !== "POST") {
    return json({ error: { message: "Method not allowed" } }, 405);
  }

  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return json({ error: { message: "Proxy is missing GROQ_API_KEY." } }, 500);
  }

  // Parse and lightly sanitize the request.
  let payload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: { message: "Invalid JSON body." } }, 400);
  }

  // Force an allowed model and cap output, so the shared key can't be abused.
  if (!ALLOWED_MODELS.has(payload.model)) {
    payload.model = "llama-3.3-70b-versatile";
  }
  if (!payload.max_tokens || payload.max_tokens > MAX_OUTPUT_TOKENS) {
    payload.max_tokens = MAX_OUTPUT_TOKENS;
  }

  const upstream = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(payload),
  });

  // Stream the upstream response straight back (works for stream + non-stream).
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") || "application/json",
      ...CORS,
    },
  });
}
