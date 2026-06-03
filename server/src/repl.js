/**
 * repl.js
 * Interactive session — launch once, then chat with the agent in a loop
 * (like a coding REPL). Conversation context is preserved across turns.
 */

import { runAgentTurn } from "./agent.js";
import { tools } from "./tools/index.js";
import { ensureWorkspace, getWorkspaceRoot } from "./workspace.js";
import { config } from "./config.js";
import { askYesNo, createPrompt } from "./confirm.js";
import { ui } from "./ui.js";
import {
  loadSession,
  saveSession,
  clearSession,
  rememberNote,
  loadProjectMemory,
} from "./memory.js";
import { addUsage, getUsage } from "./userConfig.js";
import { DEFAULT_TOKEN_LIMIT } from "./defaults.js";
import { runOnboarding } from "./onboarding.js";

function modelName() {
  if (config.provider === "gemini") return config.gemini.model;
  if (config.provider === "openai") return config.openai.model;
  if (config.provider === "ollama") return config.ollama.model;
  return config.provider;
}

export async function startRepl() {
  ensureWorkspace();
  ui.welcome(modelName(), getWorkspaceRoot());

  const prompt = createPrompt();

  // Load saved conversation history so the agent remembers across launches.
  let messages = loadSession();
  if (messages.length > 0) {
    ui.info(`Resumed previous session (${messages.length} messages). /clear to start fresh.`);
  }
  if (loadProjectMemory()) {
    ui.info("Loaded project memory from NANO.md.");
  }

  // Running total of tokens used this session.
  const sessionTokens = { total: 0 };

  // Track whether the agent is busy. We only live-redraw on resize while idle
  // at the prompt — never mid-task, so we don't scramble streaming output.
  let busy = false;
  let resizeTimer = null;

  const onResize = () => {
    if (busy) return;
    // Debounce: terminals fire many resize events while dragging.
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      ui.clearScreen();
      ui.welcome(modelName(), getWorkspaceRoot());
      prompt.refresh();
    }, 80);
  };

  if (process.stdout.isTTY) {
    process.stdout.on("resize", onResize);
  }

  let spinner = null;
  let streaming = false;
  const events = {
    onThinkingStart: () => {
      spinner = ui.spinner("Thinking…").start();
    },
    onThinkingEnd: () => {
      if (spinner) spinner.stop();
      spinner = null;
    },
    onToken: (t) => {
      // First token: stop the spinner and print the agent label once.
      if (spinner) {
        spinner.stop();
        spinner = null;
      }
      if (!streaming) {
        ui.streamStart();
        streaming = true;
      }
      ui.streamToken(t);
    },
    onToolCall: (name, args) => {
      if (streaming) {
        ui.streamEnd();
        streaming = false;
      }
      ui.action(name, args);
    },
    onToolResult: (name, res) => ui.actionDone(name, res),
    onText: (text) => {
      // If we streamed the text already, just close the stream; otherwise print.
      if (streaming) {
        ui.streamEnd();
        streaming = false;
      } else if (text) {
        ui.agentLabel(text);
      }
    },
  };

  const confirm = async ({ command, reason }) => {
    if (spinner) spinner.stop();
    ui.safetyWarn(command, reason);
    return askYesNo("  Allow this command?");
  };

  // Main loop.
  for (;;) {
    const line = await prompt.ask("\n  you › ");

    // EOF / Ctrl+D / closed stream => exit gracefully.
    if (line === null) {
      ui.info("\nGoodbye.");
      break;
    }

    const input = line.trim();

    if (!input) continue;

    // Slash commands.
    if (input === "/exit" || input === "/quit") {
      ui.info("Goodbye.");
      break;
    }
    if (input === "/help") {
      ui.help();
      continue;
    }
    if (input === "/clear") {
      messages = [];
      clearSession();
      ui.info("Conversation reset.");
      continue;
    }
    if (input === "/tools") {
      ui.toolsList(tools);
      continue;
    }
    if (input === "/tokens") {
      ui.info(`Tokens used this session: ${sessionTokens.total}`);
      continue;
    }
    if (input.startsWith("/remember")) {
      const note = input.slice("/remember".length).trim();
      if (!note) {
        ui.info("Usage: /remember <something to save to NANO.md>");
      } else if (rememberNote(note)) {
        ui.info("Saved to project memory (NANO.md).");
      } else {
        ui.error("Could not write to NANO.md.");
      }
      continue;
    }
    if (input === "/model") {
      ui.modelInfo(config.provider, modelName(), config.provider === "openai" ? config.openai.baseURL : null);
      continue;
    }
    if (input === "/config") {
      // Switch between default key and your own key, live.
      await runOnboarding({ prompt, intro: false });
      ui.info("Configuration updated. Now using: " + modelName());
      continue;
    }
    if (input === "/cwd") {
      ui.info("Working in: " + getWorkspaceRoot());
      continue;
    }
    if (input.startsWith("/")) {
      ui.info(`Unknown command: ${input}.  Type /help to see commands.`);
      continue;
    }

    // A normal task: add to history and run a turn.

    // Enforce the free-tier token budget when on the default key.
    if (config.mode === "default" && getUsage() >= DEFAULT_TOKEN_LIMIT) {
      ui.limitReached(getUsage(), DEFAULT_TOKEN_LIMIT);
      continue;
    }

    messages.push({ role: "user", text: input });

    busy = true;
    try {
      const result = await runAgentTurn(messages, { events, confirm });
      if (!result.done) ui.stopped(result.summary);
      if (result.usage) {
        sessionTokens.total += result.usage.totalTokens || 0;
        ui.tokens(result.usage);
        // Persist cumulative usage for the default-tier budget.
        if (config.mode === "default") {
          const total = addUsage(result.usage.totalTokens || 0);
          const remaining = Math.max(0, DEFAULT_TOKEN_LIMIT - total);
          ui.info(`Free tier: ${remaining.toLocaleString()} tokens remaining.`);
        }
      }
      // Persist the conversation after every turn.
      saveSession(messages);
    } catch (err) {
      if (spinner) spinner.stop();
      ui.error(err.message);
    } finally {
      busy = false;
    }
  }

  if (process.stdout.isTTY) process.stdout.removeListener("resize", onResize);
  prompt.close();
}
