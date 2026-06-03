/**
 * confirm.js
 * A tiny yes/no terminal prompt using Node's built-in readline.
 * Kept separate so the safety logic stays easy to test without real input.
 */

import readline from "node:readline";
import { completer } from "./commands.js";

export async function askYesNo(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${question} [y/N] `, (answer) => {
      rl.close();
      const a = answer.trim().toLowerCase();
      resolve(a === "y" || a === "yes");
    });
  });
}

/**
 * Create a reusable readline interface for an interactive session.
 * Returns { ask, close } where ask(promptText) resolves to the typed line,
 * or null if the input stream closed (EOF / Ctrl+D).
 *
 * Includes tab-completion for slash commands and in-memory history.
 */
export function createPrompt() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    completer,
    history: [],
    historySize: 100,
  });

  let closed = false;
  rl.on("close", () => {
    closed = true;
  });

  let currentPrompt = "";

  return {
    ask(promptText) {
      if (closed) return Promise.resolve(null);
      currentPrompt = promptText;
      return new Promise((resolve) => {
        let answered = false;
        const onClose = () => {
          if (!answered) resolve(null);
        };
        rl.once("close", onClose);
        rl.question(promptText, (answer) => {
          answered = true;
          rl.removeListener("close", onClose);
          resolve(answer);
        });
      });
    },
    // Reprint the current prompt + whatever the user has typed so far.
    // Used after clearing the screen on a terminal resize.
    refresh() {
      try {
        if (typeof rl._refreshLine === "function") rl._refreshLine();
        else process.stdout.write(currentPrompt + (rl.line || ""));
      } catch {
        process.stdout.write(currentPrompt + (rl.line || ""));
      }
    },
    close() {
      if (!closed) rl.close();
    },
  };
}
