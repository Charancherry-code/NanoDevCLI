/**
 * onboarding.js
 * First-run setup and the /config switcher.
 *
 * Presents two options:
 *   1) Bring your own API key  — unlimited, user-provided key
 *   2) Use the default key      — free, capped at DEFAULT_TOKEN_LIMIT tokens
 *
 * The choice is saved to ~/.nano-dev/config.json so it never asks again
 * (until changed via /config, or reset via `nano-dev --reset`).
 */

import { createPrompt } from "./confirm.js";
import { saveUserConfig, loadUserConfig } from "./userConfig.js";
import { DEFAULT_TOKEN_LIMIT } from "./defaults.js";
import { ui } from "./ui.js";

/**
 * Run the setup flow.
 * @param {object} [opts]
 * @param {object} [opts.prompt] - an existing prompt (from the REPL) to reuse.
 *        If omitted, a temporary prompt is created and closed here.
 * @param {boolean} [opts.intro=true] - show the big intro banner.
 */
export async function runOnboarding(opts = {}) {
  const ownPrompt = !opts.prompt;
  const prompt = opts.prompt ?? createPrompt();
  if (opts.intro !== false) ui.onboardIntro(DEFAULT_TOKEN_LIMIT);

  try {
    let choice = "";
    while (choice !== "1" && choice !== "2") {
      const ans = await prompt.ask("\n  Choose an option [1/2]: ");
      if (ans === null) return null; // EOF
      choice = ans.trim();
      if (choice !== "1" && choice !== "2") ui.info("Please type 1 or 2.");
    }

    if (choice === "2") {
      // Keep any existing usage counter so switching back and forth is fair.
      const prev = loadUserConfig();
      const cfg = { mode: "default", usage: prev?.usage ?? { totalTokens: 0 } };
      saveUserConfig(cfg);
      ui.onboardSaved(
        "Using the shared default key.",
        `Free tier: up to ${DEFAULT_TOKEN_LIMIT.toLocaleString()} tokens.`
      );
      return cfg;
    }

    // Option 1: bring your own key.
    ui.info("\n  Bring your own key.");
    ui.info("  Provider options: 1) Gemini   2) OpenAI-compatible (OpenAI, Groq, etc.)");

    let provChoice = "";
    while (provChoice !== "1" && provChoice !== "2") {
      const ans = await prompt.ask("  Provider [1/2]: ");
      if (ans === null) return null;
      provChoice = ans.trim();
    }
    const provider = provChoice === "1" ? "gemini" : "openai";

    const key = (await prompt.ask("  Paste your API key: "))?.trim() || "";
    if (!key) {
      ui.error("No key entered. Run /config to try again.");
      return null;
    }

    const cfg = { mode: "own", provider, apiKey: key, usage: { totalTokens: 0 } };

    if (provider === "openai") {
      const base = (await prompt.ask("  Base URL (blank for OpenAI default): "))?.trim();
      if (base) cfg.baseURL = base;
      const model = (await prompt.ask("  Model (blank for gpt-4o-mini): "))?.trim();
      cfg.model = model || "gpt-4o-mini";
    } else {
      const model = (await prompt.ask("  Model (blank for gemini-2.5-flash): "))?.trim();
      cfg.model = model || "gemini-2.5-flash";
    }

    saveUserConfig(cfg);
    ui.onboardSaved("Saved your key.", "You're on the unlimited (your own key) tier.");
    return cfg;
  } finally {
    if (ownPrompt) prompt.close();
  }
}
