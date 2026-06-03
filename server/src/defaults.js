/**
 * defaults.js
 * The bundled "default" provider used when a user picks "Use default key"
 * during onboarding. This ships inside the npm package.
 *
 * SECURITY: there is NO raw API key here. The default tier routes through a
 * serverless proxy (see /proxy) that holds the real Groq key server-side and
 * enforces limits. The CLI only knows the public proxy URL, so nothing secret
 * ships in the npm package.
 *
 * The proxy speaks the OpenAI chat-completions protocol, so the existing
 * "openai" provider works against it unchanged.
 *
 * >>> Replace DEFAULT_BASE_URL with your deployed proxy URL (+ /v1). <<<
 */

export const DEFAULT_CONFIG = {
  provider: "openai", // proxy is OpenAI-compatible
  baseURL: "https://cli-proxy-server.vercel.app/v1",
  // No real key needed — the proxy injects it server-side. A placeholder
  // keeps the OpenAI SDK happy (it requires a non-empty apiKey string).
  apiKey: "nano-dev-default",
  model: "llama-3.3-70b-versatile",
};

// Free-tier token budget for users on the shared default tier.
export const DEFAULT_TOKEN_LIMIT = 10000;
