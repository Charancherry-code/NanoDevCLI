/**
 * memory.js
 * Persistent memory for nano-dev.
 *
 * Two layers, both stored in a .nano/ folder inside the working directory:
 *  1. session.json  — the full conversation history, reloaded on next launch
 *                     so the agent remembers what you were doing.
 *  2. NANO.md       — a human-editable project memory file. Its contents are
 *                     injected into the system prompt so the agent always knows
 *                     project-specific context (like Claude Code's CLAUDE.md).
 */

import fs from "node:fs";
import path from "node:path";
import { getWorkspaceRoot } from "./workspace.js";

function memDir() {
  return path.join(getWorkspaceRoot(), ".nano");
}

function sessionFile() {
  return path.join(memDir(), "session.json");
}

function nanoMdFile() {
  return path.join(getWorkspaceRoot(), "NANO.md");
}

/** Load saved conversation history, or [] if none exists. */
export function loadSession() {
  try {
    const raw = fs.readFileSync(sessionFile(), "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data.messages) ? data.messages : [];
  } catch {
    return [];
  }
}

/** Persist the conversation history to disk. */
export function saveSession(messages) {
  try {
    fs.mkdirSync(memDir(), { recursive: true });
    fs.writeFileSync(
      sessionFile(),
      JSON.stringify({ savedAt: new Date().toISOString(), messages }, null, 2),
      "utf8"
    );
    return true;
  } catch {
    return false;
  }
}

/** Delete the saved session (used by /clear). */
export function clearSession() {
  try {
    fs.rmSync(sessionFile(), { force: true });
  } catch {
    /* ignore */
  }
}

/** Read the NANO.md project memory file, or "" if it doesn't exist. */
export function loadProjectMemory() {
  try {
    return fs.readFileSync(nanoMdFile(), "utf8").trim();
  } catch {
    return "";
  }
}

/** Append a note to NANO.md (creating it if needed). */
export function rememberNote(note) {
  try {
    const file = nanoMdFile();
    const exists = fs.existsSync(file);
    const header = exists ? "" : "# Project Memory\n\nNotes nano-dev remembers about this project.\n\n";
    fs.appendFileSync(file, `${header}- ${note}\n`, "utf8");
    return true;
  } catch {
    return false;
  }
}

export const memoryPaths = { sessionFile, nanoMdFile };
