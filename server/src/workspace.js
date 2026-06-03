/**
 * workspace.js
 * Resolves and locks the workspace root — the only folder the agent may touch.
 *
 * Every tool resolves its paths through here so a tool can never read or write
 * outside the workspace. Phase 5 adds the full safety layer on top of this.
 */

import path from "node:path";
import fs from "node:fs";

// The default sandbox folder used when the user doesn't choose a directory.
const DEFAULT_WORKSPACE = path.resolve(
  process.env.AGENT_WORKSPACE || path.join(process.cwd(), "workspace")
);

// The workspace defaults to ./workspace; --here / --dir can change it.
let workspaceRoot = DEFAULT_WORKSPACE;
let isDefaultSandbox = true;

export function getWorkspaceRoot() {
  return workspaceRoot;
}

export function setWorkspaceRoot(dir) {
  workspaceRoot = path.resolve(dir);
  isDefaultSandbox = workspaceRoot === DEFAULT_WORKSPACE;
  return workspaceRoot;
}

/**
 * Make sure the workspace folder exists before the agent runs.
 *
 * Only the default sandbox gets a seeded CommonJS package.json (so generated
 * `.js` files using require()/module.exports run as expected). When the user
 * points the agent at a real project with --here/--dir, we never inject files.
 */
export function ensureWorkspace() {
  fs.mkdirSync(workspaceRoot, { recursive: true });
  if (!isDefaultSandbox) return workspaceRoot;

  const pkgPath = path.join(workspaceRoot, "package.json");
  if (!fs.existsSync(pkgPath)) {
    fs.writeFileSync(
      pkgPath,
      JSON.stringify({ name: "agent-workspace", version: "1.0.0", private: true }, null, 2) + "\n",
      "utf8"
    );
  }
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
