/**
 * defaults.js
 * The bundled "default" provider used when a user picks "Use default key"
 * during onboarding. This ships inside the npm package.
 *
 * SECURITY: there is NO raw API key here. The default tier routes through a
 * serverless proxy (see /proxy) that holds the real key server-side and
 * enforces limits. The CLI only knows the public proxy URL, so nothing secret
 * ships in the npm package.
 *
 * The proxy currently forwards to GitHub Models, but the CLI doesn't care —
 * it just talks the OpenAI chat-completions protocol to the proxy.
 */

export const DEFAULT_CONFIG = {
  provider: "openai", // proxy is OpenAI-compatible
  baseURL: "https://cli-proxy-server.vercel.app/v1",
  // No real key needed — the proxy injects it server-side. A placeholder
  // keeps the OpenAI SDK happy (it requires a non-empty apiKey string).
  apiKey: "nano-dev-default",
  // Must be one of the proxy's ALLOWED_MODELS (GitHub Models naming).
  model: "openai/gpt-4.1",
};

// Free-tier token budget for users on the shared default tier.
export const DEFAULT_TOKEN_LIMIT = 50000;
