/**
 * Tests for the workspace folder-lockdown logic.
 * Verifies that paths can't escape the sandbox.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { resolveInWorkspace, getWorkspaceRoot } from "../src/workspace.js";

test("resolves a normal relative path inside the workspace", () => {
  const resolved = resolveInWorkspace("src/index.js");
  assert.ok(resolved.startsWith(getWorkspaceRoot()));
});

test("blocks parent-directory escape with ../", () => {
  assert.throws(() => resolveInWorkspace("../package.json"), /escapes the workspace/);
});

test("blocks deep escape attempts", () => {
  assert.throws(() => resolveInWorkspace("../../../../etc/passwd"), /escapes the workspace/);
});

test("blocks absolute paths outside the workspace", () => {
  const outside = path.resolve("/etc/passwd");
  assert.throws(() => resolveInWorkspace(outside), /escapes the workspace/);
});

test("rejects empty paths", () => {
  assert.throws(() => resolveInWorkspace(""), /non-empty string/);
});
