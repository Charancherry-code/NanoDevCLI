/**
 * llm.js
 * Provider-agnostic LLM client.
 *
 * The agent loop calls chatWithTools(...) and never cares which provider is
 * behind it. To add OpenAI or Ollama later, implement a provider file with the
 * same chat(messages, tools, opts) signature and register it in the switch.
 *
 * Normalized message format used across the app:
 *   { role: "user",  text: "..." }
 *   { role: "model", text: "...", toolCalls: [{ name, args }] }
 *   { role: "tool",  name: "read_file", response: { ... } }
 *
 * Normalized response: { text: string, toolCalls: [{ name, args }] }
 */

import { config } from "./config.js";
import * as gemini from "./providers/gemini.js";
import * as openai from "./providers/openai.js";

const providers = {
  gemini,
  openai,
  // ollama -> the local proxy is OpenAI-compatible, so use the "openai"
  // provider with OPENAI_BASE_URL pointing at it.
};

export async function chatWithTools(messages, tools, opts = {}) {
  const provider = providers[config.provider];
  if (!provider) {
    throw new Error(
      `Unknown or unimplemented LLM_PROVIDER: "${config.provider}". Available: ${Object.keys(
        providers
      ).join(", ")}`
    );
  }
  return provider.chat(messages, tools, opts);
}
