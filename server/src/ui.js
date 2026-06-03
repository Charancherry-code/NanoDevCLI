/**
 * ui.js
 * Centralized terminal styling (colors + spinner) so the CLI stays readable
 * and the look is consistent. Uses chalk for color and ora for spinners.
 */

import chalk from "chalk";
import ora from "ora";
import { COMMANDS } from "./commands.js";

// Brand color — the same teal used on the landing page (#4fd1c5).
// Using a hex keeps it consistent across terminals instead of the bluish
// default "cyan" ANSI color.
const teal = chalk.hex("#4fd1c5");
const tealBold = chalk.hex("#4fd1c5").bold;

// Full-size ASCII banner (needs ~68 cols).
const LOGO_FULL = [
  "███╗   ██╗ █████╗ ███╗   ██╗ ██████╗     ██████╗ ███████╗██╗   ██╗",
  "████╗  ██║██╔══██╗████╗  ██║██╔═══██╗    ██╔══██╗██╔════╝██║   ██║",
  "██╔██╗ ██║███████║██╔██╗ ██║██║   ██║    ██║  ██║█████╗  ██║   ██║",
  "██║╚██╗██║██╔══██║██║╚██╗██║██║   ██║    ██║  ██║██╔══╝  ╚██╗ ██╔╝",
  "██║ ╚████║██║  ██║██║ ╚████║╚██████╔╝    ██████╔╝███████╗ ╚████╔╝ ",
  "╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝     ╚═════╝ ╚══════╝  ╚═══╝  ",
];

// Compact banner for medium terminals (~40 cols).
const LOGO_SMALL = [
  " _ _  __ _ _ _  ___    _  _____   __",
  "| ' \\/ _` | ' \\/ _ \\  | ||/ -_) \\ / /",
  "|_||_\\__,_|_||_\\___/  |_,_\\___|\\_/\\_\\",
];

// Random tips shown in the "Did you know?" box.
const TIPS = [
  "Type a task in plain English and nano-dev plans the steps and runs the tools itself.",
  "Risky shell commands pause for your approval. Destructive ones are blocked outright.",
  "Everything runs inside a sandboxed workspace/ folder, so the agent can't touch the rest of your system.",
  "Use /clear to start a fresh conversation without restarting nano-dev.",
  "The agent reads its own errors and self-corrects, watch it fix a failing run.",
  "Swap the LLM by editing LLM_PROVIDER in your .env. The agent loop stays the same.",
];

// Current terminal width, with a sane fallback when not a TTY (piped output).
function termWidth() {
  return process.stdout.columns || 80;
}

// Pick a box width that fits the terminal: leaves a 2-space margin each side,
// clamped between a readable minimum and a comfortable maximum.
function boxWidth() {
  const w = termWidth();
  return Math.max(20, Math.min(64, w - 6));
}

// Wrap a long string into lines that fit a given width.
function wrap(text, width) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > width) {
      if (line) lines.push(line.trim());
      // A single word longer than the width: hard-split it.
      if (w.length > width) {
        let rest = w;
        while (rest.length > width) {
          lines.push(rest.slice(0, width));
          rest = rest.slice(width);
        }
        line = rest;
      } else {
        line = w;
      }
    } else {
      line = (line + " " + w).trim();
    }
  }
  if (line) lines.push(line.trim());
  return lines;
}

// Truncate a string to width with an ellipsis if needed.
function truncate(text, width) {
  if (text.length <= width) return text;
  if (width <= 1) return text.slice(0, width);
  return text.slice(0, width - 1) + "…";
}

// Render one centered line inside the box.
function boxCenter(text, width, color = chalk.bold.white) {
  const total = width - text.length;
  const left = Math.max(0, Math.floor(total / 2));
  const right = Math.max(0, total - left);
  return teal("  │") + " ".repeat(left) + color(text) + " ".repeat(right) + teal("│");
}

// Render one left-aligned line inside the box.
function boxLine(text, width, color = chalk.gray) {
  const pad = Math.max(0, width - 1 - text.length);
  return teal("  │ ") + color(text) + " ".repeat(pad) + teal("│");
}

export const ui = {
  banner(title, subtitle) {
    console.log(tealBold(`\n${title}`));
    if (subtitle) console.log(chalk.gray(subtitle));
  },

  // Clear the terminal screen and move the cursor to the top-left.
  clearScreen() {
    process.stdout.write("\x1b[2J\x1b[3J\x1b[H");
  },

  // First-run onboarding intro with the two options.
  onboardIntro(limit) {
    console.log("");
    for (const line of LOGO_FULL) console.log("  " + teal(line));
    console.log(chalk.gray("\n  Welcome! Let's set up nano-dev (one time).\n"));

    console.log("  " + chalk.bold.white("1) Bring your own API key"));
    console.log("     " + chalk.gray("Use your own Gemini or OpenAI-compatible key. Unlimited."));
    console.log("");
    console.log("  " + chalk.bold.white("2) Use the default key"));
    console.log(
      "     " + chalk.gray(`Free, no signup. Capped at ${Number(limit).toLocaleString()} tokens.`)
    );
  },

  onboardSaved(line1, line2) {
    console.log(chalk.green("\n  ✓ " + line1));
    if (line2) console.log(chalk.gray("    " + line2));
    console.log(chalk.gray("    Settings saved to ~/.nano-dev/config.json  (change with /reset)\n"));
  },

  limitReached(used, limit) {
    console.log(chalk.bold.yellow("\n  ■ Free-tier limit reached"));
    console.log(
      chalk.gray(`    You've used ${Number(used).toLocaleString()} of ${Number(limit).toLocaleString()} tokens.`)
    );
    console.log(chalk.gray("    Run ") + chalk.white("nano-dev --reset") + chalk.gray(" to switch to your own API key.\n"));
  },

  welcome(model, workspace) {
    const w = termWidth();
    const bw = boxWidth();

    // Choose a logo that fits the terminal width; on very narrow ones, skip it.
    console.log("");
    let logo = null;
    if (w >= 70) logo = LOGO_FULL;
    else if (w >= 40) logo = LOGO_SMALL;
    if (logo) {
      for (const line of logo) console.log("  " + teal(line));
    } else {
      console.log("  " + tealBold("nano-dev"));
    }

    const tagline = "a tiny AI coding agent that lives in your terminal";
    console.log("\n  " + chalk.gray(truncate(tagline, w - 4)) + "\n");

    const tip = TIPS[Math.floor(Math.random() * TIPS.length)];

    console.log(teal("  ┌" + "─".repeat(bw) + "┐"));
    console.log(boxCenter("Did you know?", bw, chalk.bold.white));
    console.log(boxLine("", bw));
    for (const l of wrap(tip, bw - 4)) console.log(boxLine(l, bw));
    console.log(boxLine("", bw));
    console.log(teal("  └" + "─".repeat(bw) + "┘"));

    // Command hints: full on wide terminals, stacked on narrow ones.
    if (w >= 56) {
      console.log(
        "\n  " +
          chalk.white("/help") + chalk.gray(" all commands") +
          chalk.gray("   ·   ") +
          chalk.white("/clear") + chalk.gray(" reset chat") +
          chalk.gray("   ·   ") +
          chalk.white("/exit") + chalk.gray(" quit")
      );
    } else {
      console.log("\n  " + chalk.white("/help") + chalk.gray("  ") + chalk.white("/clear") + chalk.gray("  ") + chalk.white("/exit"));
    }

    console.log(chalk.gray("  " + "─".repeat(bw + 2)));

    // Status line: stack model/workspace when the terminal is narrow.
    if (w >= 70) {
      console.log(
        chalk.green("  ● ") +
          chalk.gray("model ") + chalk.white(model) +
          chalk.gray("   ·   workspace ") + chalk.white(truncate(workspace, w - 30))
      );
    } else {
      console.log(chalk.green("  ● ") + chalk.gray("model ") + chalk.white(truncate(model, w - 12)));
      console.log(chalk.gray("    workspace ") + chalk.white(truncate(workspace, w - 14)));
    }
  },

  help() {
    console.log(chalk.gray("\n  Commands"));
    for (const c of COMMANDS) {
      console.log("    " + teal(c.name.padEnd(8)) + chalk.gray(c.description));
    }
    console.log(
      chalk.gray("\n  Tip: type ") + chalk.white("/") + chalk.gray(" then press ") +
        chalk.white("Tab") + chalk.gray(" to autocomplete commands.")
    );
    console.log(chalk.gray("  Anything that isn't a command is sent to the agent as a task.\n"));
  },

  toolsList(tools) {
    console.log(chalk.gray("\n  Tools the agent can use"));
    for (const t of tools) {
      console.log("    " + teal(t.name.padEnd(14)) + chalk.gray(t.description));
    }
    console.log("");
  },

  modelInfo(provider, model, baseURL) {
    console.log(chalk.gray("\n  Provider ") + chalk.white(provider));
    console.log(chalk.gray("  Model    ") + chalk.white(model));
    if (baseURL) console.log(chalk.gray("  Endpoint ") + chalk.white(baseURL));
    console.log("");
  },

  agentLabel(text) {
    console.log(chalk.green("\n  agent ") + chalk.gray("›"));
    console.log("  " + teal(text));
  },

  // Streaming output: print the agent label once, then stream tokens.
  streamStart() {
    process.stdout.write(chalk.green("\n  agent ") + chalk.gray("›\n  "));
  },
  streamToken(t) {
    // Indent new lines so streamed text stays aligned under the label.
    process.stdout.write(teal(t.replace(/\n/g, "\n  ")));
  },
  streamEnd() {
    process.stdout.write("\n");
  },

  // Token usage summary, shown after a turn completes.
  tokens(usage) {
    if (!usage || !usage.totalTokens) return;
    const suffix = usage.estimated ? chalk.gray(" (est.)") : "";
    console.log(
      chalk.gray(
        `  tokens: ${usage.totalTokens} ` +
          `(in ${usage.promptTokens}, out ${usage.completionTokens})`
      ) + suffix
    );
  },

  info(msg) {
    console.log(chalk.gray("  " + msg));
  },

  field(label, value) {
    console.log(chalk.gray(`${label} `) + chalk.white(value));
  },

  rule() {
    const w = Math.min(54, (process.stdout.columns || 80) - 2);
    console.log(chalk.gray("─".repeat(Math.max(10, w))));
  },

  step(n, max) {
    // Kept subtle — the humanized action lines carry the narration now.
    void max;
    return n;
  },

  // Humanized, present-tense narration of what the agent is doing, like a
  // professional coding agent ("Reading index.html", "Creating styles.css").
  action(name, args) {
    const a = args || {};
    let verb, target;
    switch (name) {
      case "read_file":
        verb = "Reading"; target = a.path; break;
      case "write_file":
        verb = "Writing"; target = a.path; break;
      case "edit_file":
        verb = "Editing"; target = a.path; break;
      case "delete_file":
        verb = "Deleting"; target = a.path; break;
      case "list_files":
        verb = "Scanning"; target = a.path === "." || !a.path ? "workspace" : a.path; break;
      case "run_command":
        verb = "Running"; target = a.command; break;
      default:
        verb = name; target = JSON.stringify(a);
    }
    process.stdout.write(
      "  " + teal("•") + " " + chalk.white(verb) + " " + chalk.gray(target ?? "")
    );
  },

  actionDone(name, res) {
    let detail = "";
    if (name === "write_file" && res.ok) detail = `${res.bytesWritten} bytes`;
    else if (name === "list_files" && res.ok) detail = `${res.entries.length} items`;
    else if (name === "run_command" && res.ok) detail = "done";
    else if (res.ok) detail = "done";

    if (res.ok) {
      console.log("  " + chalk.green("✓") + (detail ? chalk.gray("  " + detail) : ""));
    } else {
      console.log("  " + chalk.red("✗") + chalk.red("  " + (res.error || "failed")));
    }
  },

  // Legacy hooks kept for the one-shot renderer.
  toolCall(name, args) {
    const argStr = chalk.gray(JSON.stringify(args));
    console.log(`  ${chalk.yellow("→")} ${chalk.bold(name)} ${argStr}`);
  },

  toolOk(name, detail) {
    console.log(`  ${chalk.green("✓")} ${name}${detail ? chalk.gray(" " + detail) : ""}`);
  },

  toolErr(name, msg) {
    console.log(`  ${chalk.red("✗")} ${name} ${chalk.red(msg)}`);
  },

  safetyWarn(command, reason) {
    console.log(chalk.bold.yellow("\n  ⚠ safety check"));
    console.log("    " + chalk.white(command));
    console.log("    " + chalk.gray(reason));
  },

  summary(text) {
    console.log("\n" + teal(text));
  },

  done(msg) {
    console.log(chalk.bold.green("\n✔ " + msg));
  },

  stopped(msg) {
    console.log(chalk.bold.yellow("\n■ " + msg));
  },

  error(msg) {
    console.log(chalk.bold.red("\n✗ " + msg));
  },

  spinner(text) {
    return ora({ text: chalk.gray(text), color: "cyan" });
  },
};
