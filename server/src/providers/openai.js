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

/** Convert our internal message format into OpenAI chat messages.
 *
 * Token optimization: the agent loop re-sends the whole conversation on every
 * step, so large file contents (from read/write/edit results and tool-call
 * args) would be re-billed again and again. We keep the most recent messages
 * verbatim, but in OLDER messages we truncate big strings — the model has
 * already acted on them and rarely needs the full bytes again.
 */
const RECENT_VERBATIM = 6; // keep this many trailing messages full
const OLD_FIELD_MAX = 220; // max chars for big strings in older messages

function truncate(str, max) {
  if (typeof str !== "string" || str.length <= max) return str;
  return str.slice(0, max) + `\n… [${str.length - max} chars trimmed to save tokens]`;
}

// Shrink large string values inside a tool-args object (content, new_text, etc.).
function shrinkArgs(args) {
  const out = {};
  for (const [k, v] of Object.entries(args || {})) {
    out[k] = typeof v === "string" ? truncate(v, OLD_FIELD_MAX) : v;
  }
  return out;
}

function toOpenAIMessages(messages, systemPrompt) {
  const out = [];
  if (systemPrompt) out.push({ role: "system", content: systemPrompt });

  const cutoff = messages.length - RECENT_VERBATIM; // older than this => compact

  messages.forEach((m, i) => {
    const old = i < cutoff;

    if (m.role === "tool") {
      let content = JSON.stringify(m.response ?? {});
      if (old) content = truncate(content, OLD_FIELD_MAX);
      out.push({
        role: "tool",
        tool_call_id: m.toolCallId ?? m.name,
        content,
      });
      return;
    }

    if (m.role === "model" && m.toolCalls?.length) {
      out.push({
        role: "assistant",
        content: m.text || null,
        tool_calls: m.toolCalls.map((tc) => ({
          id: tc.id ?? tc.name,
          type: "function",
          function: {
            name: tc.name,
            arguments: JSON.stringify(old ? shrinkArgs(tc.args) : tc.args ?? {}),
          },
        })),
      });
      return;
    }

    out.push({
      role: m.role === "model" ? "assistant" : "user",
      content: old ? truncate(m.text ?? "", OLD_FIELD_MAX) : m.text ?? "",
    });
  });
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
      return parseCompletion(completion, tools);
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

/**
 * Some weaker models emit a tool call as plain TEXT instead of a real
 * function_call (e.g. `<function(write_file)>{"path":...}` or
 * `{"name":"write_file","arguments":{...}}`). This salvages those so the
 * agent still works. Returns an array of { name, args } or [].
 */
function parseTextToolCalls(text, tools) {
  if (!text) return [];
  const names = tools.map((t) => t.name).join("|");
  const out = [];

  // Pattern A: <function(name)>{...json...}  or  <function=name>{...}
  const tagRe = new RegExp(`<function[(:=]\\s*(${names})\\s*\\)?>\\s*({[\\s\\S]*?})`, "g");
  // Pattern B: {"name":"tool","arguments":{...}}  (arguments may be obj or string)
  const jsonRe = /{[\s\S]*?"name"\s*:\s*"([\w-]+)"[\s\S]*?"(?:arguments|args|parameters)"\s*:\s*({[\s\S]*?})\s*}/g;

  let m;
  while ((m = tagRe.exec(text)) !== null) {
    const name = m[1];
    let args = {};
    try {
      args = JSON.parse(m[2]);
    } catch {
      // the captured object might itself wrap { "path":..., "content":... }
    }
    // Tag form sometimes wraps {"path":...} directly; if it has name/arguments, unwrap.
    if (args && (args.arguments || args.args)) args = args.arguments || args.args;
    out.push({ name, args: args || {} });
  }
  if (out.length) return out;

  while ((m = jsonRe.exec(text)) !== null) {
    const name = m[1];
    if (!tools.some((t) => t.name === name)) continue;
    let args = {};
    try {
      args = JSON.parse(m[2]);
    } catch {
      args = {};
    }
    out.push({ name, args });
  }
  return out;
}

/** Parse a non-streamed completion into the normalized shape. */
function parseCompletion(completion, tools = []) {
  const choice = completion.choices?.[0];
  const msg = choice?.message ?? {};

  let toolCalls = (msg.tool_calls ?? [])
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

  // Fallback: model wrote the tool call as text instead of a real call.
  if (toolCalls.length === 0 && msg.content) {
    const salvaged = parseTextToolCalls(msg.content, tools);
    if (salvaged.length) {
      toolCalls = salvaged.map((c, i) => ({ id: `text-${i}`, ...c }));
    }
  }

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

  let toolCalls = toolAcc.filter(Boolean).map((t) => {
    let args = {};
    try {
      args = t.args ? JSON.parse(t.args) : {};
    } catch {
      args = {};
    }
    return { id: t.id, name: t.name, args };
  });

  // Fallback: model streamed the tool call as text instead of a real call.
  if (toolCalls.length === 0 && text) {
    const salvaged = parseTextToolCalls(text, tools);
    if (salvaged.length) {
      toolCalls = salvaged.map((c, i) => ({ id: `text-${i}`, ...c }));
    }
  }

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
