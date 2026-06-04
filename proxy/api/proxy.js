/**
 * proxy.js — nano-dev default-tier proxy (Vercel Edge Function)
 *
 * Why this exists:
 *   The free "default" tier must NOT ship a real API key inside the npm package
 *   (anyone could extract it). Instead, the CLI calls THIS endpoint, which holds
 *   the key in a Vercel environment variable and forwards the request upstream.
 *   The key never leaves the server.
 *
 * It speaks the OpenAI chat-completions protocol, so the CLI's "openai" provider
 * works against it unchanged — just point the default baseURL at /v1.
 * Streaming, tool/function calling, and usage all pass through transparently.
 *
 * Upstream is configurable via env vars (defaults to GitHub Models):
 *   UPSTREAM_URL     full chat-completions URL of the provider
 *   UPSTREAM_KEY     the secret API key / token for that provider
 *   DEFAULT_MODEL    model to force when the request asks for an unknown one
 *   ALLOWED_MODELS   comma-separated allowlist (optional)
 *
 * Example (GitHub Models):
 *   UPSTREAM_URL   = https://models.github.ai/inference/chat/completions
 *   UPSTREAM_KEY   = <your GitHub PAT with the "models" permission>
 *   DEFAULT_MODEL  = openai/gpt-4o-mini
 */

export const config = { runtime: "edge" };

// --- Upstream config (env-driven, with GitHub Models defaults) -------------
const UPSTREAM_URL =
  process.env.UPSTREAM_URL || "https://models.github.ai/inference/chat/completions";

// Accept several env names so it's easy to set in Vercel.
const UPSTREAM_KEY =
  process.env.UPSTREAM_KEY ||
  process.env.GITHUB_MODELS_TOKEN ||
  process.env.GITHUB_TOKEN ||
  process.env.GROQ_API_KEY; // backward-compat

const DEFAULT_MODEL = process.env.DEFAULT_MODEL || "openai/gpt-4.1";

const ALLOWED_MODELS = new Set(
  (process.env.ALLOWED_MODELS ||
    "openai/gpt-4.1,openai/gpt-4.1-mini,openai/gpt-4o,openai/gpt-4o-mini,meta/llama-3.3-70b-instruct")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean)
);

// Hard cap on output tokens per request on the shared tier (abuse guard).
const MAX_OUTPUT_TOKENS = Number(process.env.MAX_OUTPUT_TOKENS || 1024);

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

  if (!UPSTREAM_KEY) {
    return json(
      { error: { message: "Proxy is missing UPSTREAM_KEY (set it in Vercel env vars)." } },
      500
    );
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: { message: "Invalid JSON body." } }, 400);
  }

  // Force an allowed model and cap output so the shared key can't be abused.
  if (!ALLOWED_MODELS.has(payload.model)) {
    payload.model = DEFAULT_MODEL;
  }
  if (!payload.max_tokens || payload.max_tokens > MAX_OUTPUT_TOKENS) {
    payload.max_tokens = MAX_OUTPUT_TOKENS;
  }

  let upstream;
  try {
    upstream = await fetch(UPSTREAM_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${UPSTREAM_KEY}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    return json({ error: { message: "Upstream request failed: " + err.message } }, 502);
  }

  // Stream the upstream response straight back (works for stream + non-stream).
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") || "application/json",
      ...CORS,
    },
  });
}
