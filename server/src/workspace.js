/**
 * workspace.js
 * Resolves and locks the workspace root — the only folder the agent may touch.
 *
 * Every tool resolves its paths through here so a tool can never read or write
 * outside the workspace. Phase 5 adds the full safety layer on top of this.
 */

import path from "node:path";
import fs from "node:fs";

// By default the agent works in the directory the user launched it from
// (like Claude Code / aider). --dir can point it somewhere else.
const DEFAULT_WORKSPACE = path.resolve(process.env.AGENT_WORKSPACE || process.cwd());

let workspaceRoot = DEFAULT_WORKSPACE;

export function getWorkspaceRoot() {
  return workspaceRoot;
}

export function setWorkspaceRoot(dir) {
  workspaceRoot = path.resolve(dir);
  return workspaceRoot;
}

/**
 * Make sure the workspace folder exists before the agent runs.
 * We never inject files into the user's folder — the agent only creates what
 * the task asks for.
 */
export function ensureWorkspace() {
  fs.mkdirSync(workspaceRoot, { recursive: true });
  return workspaceRoot;
}

/**
 * Resolve a user/LLM-supplied relative path against the workspace root and
 * guarantee the result stays inside it. Throws on escape attempts (../, abs paths).
 */
export function resolveInWorkspace(relativePath) {
  if (typeof relativePath !== "string" || relativePath.trim() === "") {
    throw new Error("Path must be a non-empty string.");
  }

  const resolved = path.resolve(workspaceRoot, relativePath);
  const rel = path.relative(workspaceRoot, resolved);

  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`Path "${relativePath}" escapes the workspace. Blocked.`);
  }

  return resolved;
}
