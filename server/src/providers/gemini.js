/**
 * providers/gemini.js
 * Gemini implementation of the LLM client, using the official @google/genai SDK.
 *
 * It exposes one function — chat(messages, tools) — that the agent loop calls.
 * The agent loop never sees Gemini-specific details; this file is the only
 * place that knows about Gemini's request/response shape.
 */

import { GoogleGenAI } from "@google/genai";
import { config } from "../config.js";

let client = null;

function getClient() {
  if (!config.gemini.apiKey) {
    throw new Error(
      "GEMINI_API_KEY is missing. Copy .env.example to .env and add your key."
    );
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey: config.gemini.apiKey });
  }
  return client;
}

/**
 * Convert our internal message format into Gemini's "contents" format.
 * Internal roles: "user" | "model" | "tool".
 */
function toGeminiContents(messages) {
  return messages.map((m) => {
    if (m.role === "tool") {
      // A tool result we are sending back to the model.
      return {
        role: "user",
        parts: [
          {
            functionResponse: {
              name: m.name,
              response: m.response,
            },
          },
        ],
      };
    }

    if (m.role === "model" && m.toolCalls?.length) {
      // The model's previous turn where it requested tool calls.
      return {
        role: "model",
        parts: m.toolCalls.map((tc) => ({
          functionCall: { name: tc.name, args: tc.args },
        })),
      };
    }

    return {
      role: m.role === "model" ? "model" : "user",
      parts: [{ text: m.text ?? "" }],
    };
  });
}

/** Convert our tool registry into Gemini functionDeclarations. */
function toGeminiTools(tools) {
  return [
    {
      functionDeclarations: tools.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      })),
    },
  ];
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Pull the suggested retry delay (seconds) out of a 429 error, if present. */
function getRetryDelaySeconds(err) {
  const msg = err?.message ?? "";
  const match = msg.match(/retryDelay"?:\s*"?(\d+)/);
  if (match) return Number(match[1]);
  const secs = msg.match(/retry in ([\d.]+)s/i);
  if (secs) return Math.ceil(Number(secs[1]));
  return null;
}

function isRateLimit(err) {
  const msg = err?.message ?? "";
  return msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED");
}

/** Daily-quota errors can't be fixed by waiting a few seconds — detect them. */
function isDailyQuota(err) {
  const msg = err?.message ?? "";
  return /PerDay/i.test(msg) || /per day/i.test(msg);
}

/** Turn a raw provider error into a short, friendly message. */
function friendlyError(err) {
  if (isDailyQuota(err)) {
    return (
      "Gemini free-tier DAILY quota reached (20 requests/day for this model). " +
      "Options: wait for the daily reset, switch GEMINI_MODEL (e.g. gemini-2.5-flash-lite), " +
      "or enable billing."
    );
  }
  if (isRateLimit(err)) {
    return "Gemini rate limit hit and retries were exhausted. Wait a minute and try again.";
  }
  return err?.message ?? String(err);
}

/**
 * Send the conversation + tools to Gemini.
 * Returns a normalized response: { text, toolCalls: [{ name, args }] }.
 *
 * Retries automatically on free-tier rate limits (429), respecting the
 * retry delay the API suggests, up to a few attempts.
 */
export async function chat(messages, tools, { systemPrompt } = {}) {
  const ai = getClient();
  const maxRetries = 4;

  let response;
  for (let attempt = 0; ; attempt++) {
    try {
      response = await ai.models.generateContent({
        model: config.gemini.model,
        contents: toGeminiContents(messages),
        config: {
          systemInstruction: systemPrompt,
          tools: toGeminiTools(tools),
        },
      });
      break;
    } catch (err) {
      // Per-minute rate limits are worth retrying. Daily-quota errors are not —
      // waiting seconds won't help, so fail fast with a clear message.
      if (isRateLimit(err) && !isDailyQuota(err) && attempt < maxRetries) {
        const waitS = getRetryDelaySeconds(err) ?? 2 ** attempt;
        console.log(
          `  (rate limited, waiting ${waitS}s before retry ${attempt + 1}/${maxRetries})`
        );
        await sleep((waitS + 1) * 1000);
        continue;
      }
      const e = new Error(friendlyError(err));
      e.cause = err;
      throw e;
    }
  }

  const calls = response.functionCalls ?? [];
  const toolCalls = calls.map((c) => ({ name: c.name, args: c.args ?? {} }));

  // Only read .text when there are no function calls — reading it while the
  // response contains functionCall parts triggers a noisy SDK warning.
  const text = toolCalls.length === 0 ? response.text ?? "" : "";

  // Token usage, normalized to the same shape as the OpenAI provider.
  const um = response.usageMetadata ?? {};
  const usage = um.totalTokenCount
    ? {
        promptTokens: um.promptTokenCount ?? 0,
        completionTokens: um.candidatesTokenCount ?? 0,
        totalTokens: um.totalTokenCount ?? 0,
      }
    : null;

  return { text, toolCalls, usage };
}
