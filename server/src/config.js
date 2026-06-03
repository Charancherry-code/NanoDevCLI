/**
 * config.js
 * Resolves the active configuration from three layers (highest priority first):
 *   1. The user's onboarding choice in ~/.nano-dev/config.json
 *   2. Environment variables / .env (for local development)
 *   3. Built-in fallbacks
 *
 * `config` is a getter-backed object so it always reflects the latest user
 * config (which can be written during onboarding in the same process).
 */

import "dotenv/config";
import { loadUserConfig } from "./userConfig.js";
import { DEFAULT_CONFIG } from "./defaults.js";

function resolve() {
  const user = loadUserConfig();

  // Base from env / .env.
  const cfg = {
    provider: (process.env.LLM_PROVIDER || "gemini").toLowerCase(),
    maxSteps: Number(process.env.MAX_STEPS || 15),
    mode: null, // "own" | "default" | null (dev via .env)

    gemini: {
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      baseURL: process.env.OPENAI_BASE_URL || undefined,
    },
    ollama: {
      host: process.env.OLLAMA_HOST || "http://localhost:11434",
      model: process.env.OLLAMA_MODEL || "llama3.1",
    },
  };

  if (!user) return cfg;

  // The user has completed onboarding — their choice takes precedence.
  cfg.mode = user.mode;

  if (user.mode === "default") {
    cfg.provider = DEFAULT_CONFIG.provider;
    cfg.openai = {
      apiKey: DEFAULT_CONFIG.apiKey,
      baseURL: DEFAULT_CONFIG.baseURL,
      model: DEFAULT_CONFIG.model,
    };
    return cfg;
  }

  // "own" mode — use the user's chosen provider + credentials.
  cfg.provider = (user.provider || cfg.provider).toLowerCase();
  if (cfg.provider === "openai") {
    cfg.openai = {
      apiKey: user.apiKey || cfg.openai.apiKey,
      baseURL: user.baseURL || cfg.openai.baseURL,
      model: user.model || cfg.openai.model,
    };
  } else if (cfg.provider === "gemini") {
    cfg.gemini = {
      apiKey: user.apiKey || cfg.gemini.apiKey,
      model: user.model || cfg.gemini.model,
    };
  }
  return cfg;
}

// A live proxy so reads always reflect the newest resolved config.
export const config = new Proxy(
  {},
  {
    get(_t, prop) {
      return resolve()[prop];
    },
  }
);
