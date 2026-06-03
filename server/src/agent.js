/**
 * agent.js
 * THE agent loop (the heart of the project).
 *
 * The loop:
 *  1. Send the conversation + available tools to the LLM.
 *  2. The LLM replies with either tool calls or a final text answer.
 *  3. If tool calls: execute each one, append the results, and loop again.
 *  4. If final text: the task is done — return.
 *  5. A max-steps cap guarantees the loop can never run forever.
 */

import { chatWithTools } from "./llm.js";
import { tools, runTool } from "./tools/index.js";
import { SYSTEM_PROMPT } from "./prompts.js";
import { config } from "./config.js";
import { ensureWorkspace } from "./workspace.js";
import { loadProjectMemory } from "./memory.js";

/**
 * Run the agent loop for a single user turn, using (and extending) an existing
 * conversation history. This lets an interactive session keep context across
 * multiple turns — like a chat.
 *
 * @param {Array} messages - shared conversation history (mutated in place).
 * @param {object} opts - same options as runAgent (events, confirm, maxSteps).
 */
export async function runAgentTurn(messages, opts = {}) {
  const maxSteps = opts.maxSteps ?? config.maxSteps;
  const events = opts.events ?? {};

  ensureWorkspace();

  // Inject project memory (NANO.md) into the system prompt so the agent always
  // knows project-specific context across sessions.
  const projectMemory = loadProjectMemory();
  const systemPrompt = projectMemory
    ? `${SYSTEM_PROMPT}\n\n--- PROJECT MEMORY (NANO.md) ---\n${projectMemory}`
    : SYSTEM_PROMPT;

  // Accumulate token usage across every model call in this turn.
  const usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  const addUsage = (u) => {
    if (!u) return;
    usage.promptTokens += u.promptTokens || 0;
    usage.completionTokens += u.completionTokens || 0;
    usage.totalTokens += u.totalTokens || 0;
    if (u.estimated) usage.estimated = true;
  };

  for (let step = 1; step <= maxSteps; step++) {
    events.onStep?.(step, maxSteps);

    events.onThinkingStart?.();
    let response;
    try {
      response = await chatWithTools(messages, tools, {
        systemPrompt,
        onToken: events.onToken,
      });
    } finally {
      events.onThinkingEnd?.();
    }
    const { text, toolCalls } = response;
    addUsage(response.usage);

    // No tool calls => either a final answer, or a transient empty response.
    if (!toolCalls || toolCalls.length === 0) {
      if (text && text.trim()) {
        messages.push({ role: "model", text });
        events.onText?.(text);
        return { done: true, summary: text, steps: step, usage };
      }
      // Empty response with no tool call: nudge the model to continue rather
      // than falsely reporting success. Guarded by the step cap.
      messages.push({ role: "model", text: "" });
      messages.push({
        role: "user",
        text: "Continue with the task. If it is already complete, reply with a short summary.",
      });
      continue;
    }

    // Record the model's tool-call turn so the model keeps context.
    messages.push({ role: "model", text, toolCalls });

    // Execute each requested tool and feed the result back.
    for (const call of toolCalls) {
      events.onToolCall?.(call.name, call.args);

      const result = await runTool(call.name, call.args, {
        confirm: opts.confirm,
      });

      events.onToolResult?.(call.name, result);

      messages.push({
        role: "tool",
        name: call.name,
        toolCallId: call.id,
        response: result,
      });
    }
  }

  // Hit the cap without the model declaring completion.
  return {
    done: false,
    summary: `Stopped after reaching the ${maxSteps}-step limit.`,
    steps: maxSteps,
    usage,
  };
}

/**
 * Single-shot helper: run one task in a fresh conversation.
 * @param {string} task - the user's plain-English task.
 * @param {object} opts
 */
export async function runAgent(task, opts = {}) {
  const messages = [{ role: "user", text: task }];
  return runAgentTurn(messages, opts);
}
