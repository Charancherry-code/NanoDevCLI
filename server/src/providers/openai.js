/**
 * providers/openai.js
 * OpenAI-compatible implementation of the LLM client.
 *
 * Works with the real OpenAI API *and* any OpenAI-compatible endpoint
 * (a local proxy, LM Studio, vLLM, Ollama, a gateway) by setting
 * OPENAI_BASE_URL. Uses the chat-completions API with function-calling "tools".
 *
 * Exposes one function — chat(messages, tools, opts) — matching the same shape
 * as the Gemini provider, so the agent loop never knows the difference.
 */

import OpenAI from "openai";
import { config } from "../config.js";

let client = null;

function getClient() {
  if (!config.openai.apiKey && !config.openai.baseURL) {
    throw new Error(
      "OPENAI_API_KEY is missing. Set it in .env (or OPENAI_BASE_URL for a local proxy)."
    );
  }
  if (!client) {
    client = new OpenAI({
      apiKey: config.openai.apiKey || "not-needed",
      baseURL: config.openai.baseURL,
    });
  }
  return client;
}

/** Convert our internal message format into OpenAI chat messages. */
function toOpenAIMessages(messages, systemPrompt) {
  const out = [];
  if (systemPrompt) out.push({ role: "system", content: systemPrompt });

  for (const m of messages) {
    if (m.role === "tool") {
      // Result of a tool call we send back, keyed by the call id.
      out.push({
        role: "tool",
        tool_call_id: m.toolCallId ?? m.name,
        content: JSON.stringify(m.response ?? {}),
      });
      continue;
    }

    if (m.role === "model" && m.toolCalls?.length) {
      // The assistant turn that requested tool calls.
      out.push({
        role: "assistant",
        content: m.text || null,
        tool_calls: m.toolCalls.map((tc) => ({
          id: tc.id ?? tc.name,
          type: "function",
          function: { name: tc.name, arguments: JSON.stringify(tc.args ?? {}) },
        })),
      });
      continue;
    }

    out.push({
      role: m.role === "model" ? "assistant" : "user",
      content: m.text ?? "",
    });
  }
  return out;
}

/** Convert our tool registry into OpenAI "tools" (function) definitions. */
function toOpenAITools(tools) {
  return tools.map((t) => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function isRateLimit(err) {
  return err?.status === 429 || /rate limit|RESOURCE_EXHAUSTED/i.test(err?.message ?? "");
}

// Some gateways load-balance across upstream "channels"; a single bad channel
// can return 412 (suspended) intermittently. Retrying usually routes to a
// healthy channel, so treat 412 as transient.
function isTransientChannel(err) {
  return err?.status === 412 || /suspended|PRECONDITION_FAILED|no available channel/i.test(err?.message ?? "");
}

/**
 * Send the conversation + tools to an OpenAI-compatible endpoint.
 *
 * Returns a normalized response:
 *   { text, toolCalls: [{ id, name, args }], usage: { promptTokens, completionTokens, totalTokens } }
 *
 * If opts.onToken is provided, the assistant's text is streamed token-by-token
 * to that callback as it arrives.
 */
export async function chat(messages, tools, { systemPrompt, onToken } = {}) {
  const openai = getClient();
  const maxRetries = 5;
  const useStream = typeof onToken === "function";

  for (let attempt = 0; ; attempt++) {
    try {
      if (useStream) {
        return await streamChat(openai, messages, tools, systemPrompt, onToken);
      }
      const completion = await openai.chat.completions.create({
        model: config.openai.model,
        messages: toOpenAIMessages(messages, systemPrompt),
        tools: toOpenAITools(tools),
        tool_choice: "auto",
      });
      return parseCompletion(completion);
    } catch (err) {
      if (isRateLimit(err) && attempt < maxRetries) {
        const waitS = 2 ** attempt;
        console.log(`  (rate limited, retry ${attempt + 1}/${maxRetries} in ${waitS}s)`);
        await sleep(waitS * 1000);
        continue;
      }
      // Intermittent suspended/unavailable channel — retry quickly to hit a
      // healthy upstream.
      if (isTransientChannel(err) && attempt < maxRetries) {
        await sleep(600);
        continue;
      }
      throw err;
    }
  }
}

/** Parse a non-streamed completion into the normalized shape. */
function parseCompletion(completion) {
  const choice = completion.choices?.[0];
  const msg = choice?.message ?? {};

  const toolCalls = (msg.tool_calls ?? [])
    .filter((tc) => tc.type === "function")
    .map((tc) => {
      let args = {};
      try {
        args = tc.function.arguments ? JSON.parse(tc.function.arguments) : {};
      } catch {
        args = {};
      }
      return { id: tc.id, name: tc.function.name, args };
    });

  const text = toolCalls.length === 0 ? msg.content ?? "" : "";
  return { text, toolCalls, usage: normalizeUsage(completion.usage) };
}

/** Stream a completion, accumulating text + tool-call deltas. */
async function streamChat(openai, messages, tools, systemPrompt, onToken) {
  const stream = await openai.chat.completions.create({
    model: config.openai.model,
    messages: toOpenAIMessages(messages, systemPrompt),
    tools: toOpenAITools(tools),
    tool_choice: "auto",
    stream: true,
    stream_options: { include_usage: true },
  });

  let text = "";
  let rawUsage = null;
  const toolAcc = []; // accumulate tool_calls by index

  for await (const chunk of stream) {
    const choice = chunk.choices?.[0];
    if (chunk.usage) rawUsage = chunk.usage;
    if (!choice) continue;

    const delta = choice.delta ?? {};

    if (delta.content) {
      text += delta.content;
      onToken(delta.content);
    }

    for (const tc of delta.tool_calls ?? []) {
      const i = tc.index ?? 0;
      if (!toolAcc[i]) toolAcc[i] = { id: tc.id, name: "", args: "" };
      if (tc.id) toolAcc[i].id = tc.id;
      if (tc.function?.name) toolAcc[i].name += tc.function.name;
      if (tc.function?.arguments) toolAcc[i].args += tc.function.arguments;
    }
  }

  const toolCalls = toolAcc.filter(Boolean).map((t) => {
    let args = {};
    try {
      args = t.args ? JSON.parse(t.args) : {};
    } catch {
      args = {};
    }
    return { id: t.id, name: t.name, args };
  });

  // Some OpenAI-compatible proxies don't return usage while streaming. Fall
  // back to a rough estimate (~4 chars/token) so the token counter still works.
  let usage = normalizeUsage(rawUsage);
  if (!usage) {
    const promptChars = JSON.stringify(toOpenAIMessages(messages, systemPrompt)).length;
    const outChars = text.length + JSON.stringify(toolAcc).length;
    const est = (n) => Math.max(1, Math.round(n / 4));
    usage = {
      promptTokens: est(promptChars),
      completionTokens: est(outChars),
      totalTokens: est(promptChars) + est(outChars),
      estimated: true,
    };
  }

  return {
    text: toolCalls.length === 0 ? text : "",
    toolCalls,
    usage,
  };
}

/** Normalize provider usage into a consistent shape. */
function normalizeUsage(u) {
  if (!u) return null;
  return {
    promptTokens: u.prompt_tokens ?? 0,
    completionTokens: u.completion_tokens ?? 0,
    totalTokens: u.total_tokens ?? (u.prompt_tokens ?? 0) + (u.completion_tokens ?? 0),
  };
}
