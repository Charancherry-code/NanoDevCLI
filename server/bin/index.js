#!/usr/bin/env node

/**
 * nano-dev
 * CLI entry point.
 *
 * Usage:
 *   nano-dev                         interactive mode in ./workspace
 *   nano-dev --here                  interactive mode in the CURRENT folder
 *   nano-dev --dir ./my-app          interactive mode in a chosen folder
 *   nano-dev "create a hello.js"     one-shot in ./workspace
 *   nano-dev --here "fix the bug"    one-shot in the CURRENT folder
 *
 * By default the agent works in a sandboxed ./workspace folder. Use --here or
 * --dir to point it at a real project directory instead.
 */

import path from "node:path";
import { runAgent } from "../src/agent.js";
import { startRepl } from "../src/repl.js";
import { getWorkspaceRoot, setWorkspaceRoot } from "../src/workspace.js";
import { askYesNo } from "../src/confirm.js";
import { ui } from "../src/ui.js";
import { hasUserConfig, resetConfig } from "../src/userConfig.js";
import { runOnboarding } from "../src/onboarding.js";

/** Parse CLI args: pull out flags, leave the rest as the task. */
function parseArgs(argv) {
  const args = [...argv];
  let dir = null;
  let reset = false;
  const rest = [];

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--here" || a === ".") {
      dir = process.cwd();
    } else if (a === "--dir" || a === "-d") {
      dir = args[++i] ? path.resolve(args[i]) : null;
    } else if (a === "--reset") {
      reset = true;
    } else {
      rest.push(a);
    }
  }

  return { dir, reset, task: rest.join(" ").trim() };
}

async function runOnce(task) {
  ui.banner("nano-dev");
  ui.field("Workspace:", getWorkspaceRoot());
  ui.field("Task:", task);
  ui.rule();

  let spinner = null;

  const result = await runAgent(task, {
    confirm: async ({ command, reason }) => {
      if (spinner) spinner.stop();
      ui.safetyWarn(command, reason);
      return askYesNo("  Allow this command?");
    },
    events: {
      onStep: () => {},
      onThinkingStart: () => {
        spinner = ui.spinner("Thinking…").start();
      },
      onThinkingEnd: () => {
        if (spinner) spinner.stop();
        spinner = null;
      },
      onToolCall: (name, args) => ui.action(name, args),
      onToolResult: (name, res) => ui.actionDone(name, res),
      onText: (text) => {
        if (text) ui.summary(text);
      },
    },
  });

  ui.rule();
  if (result.done) ui.done(`Done in ${result.steps} step(s).`);
  else ui.stopped(result.summary);
}

async function main() {
  const { dir, reset, task } = parseArgs(process.argv.slice(2));

  // --reset: clear saved settings and re-run onboarding.
  if (reset) {
    resetConfig();
    ui.info("Settings cleared.");
  }

  // First run (or after --reset): show the two-option setup.
  if (!hasUserConfig()) {
    const cfg = await runOnboarding();
    if (!cfg) return; // user aborted
  }

  // If the user chose a directory, point the agent there instead of ./workspace.
  if (dir) setWorkspaceRoot(dir);

  if (task) {
    await runOnce(task);
  } else {
    await startRepl();
  }
}

main().catch((err) => {
  ui.error("Agent crashed: " + err.message);
  process.exit(1);
});
