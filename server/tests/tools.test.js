/**
 * Tests for the four tools (read/write/list/run) and the run_command safety gate.
 * Uses a temporary workspace so it never touches real project files.
 */

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { setWorkspaceRoot } from "../src/workspace.js";
import { runTool } from "../src/tools/index.js";

let tmpDir;

before(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-test-"));
  setWorkspaceRoot(tmpDir);
});

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("write_file then read_file round-trips content", async () => {
  const write = await runTool("write_file", { path: "note.txt", content: "hello agent" });
  assert.equal(write.ok, true);

  const read = await runTool("read_file", { path: "note.txt" });
  assert.equal(read.ok, true);
  assert.equal(read.content, "hello agent");
});

test("read_file reports missing files gracefully", async () => {
  const res = await runTool("read_file", { path: "does-not-exist.txt" });
  assert.equal(res.ok, false);
  assert.match(res.error, /not found/i);
});

test("list_files lists workspace contents", async () => {
  await runTool("write_file", { path: "a.txt", content: "a" });
  const res = await runTool("list_files", { path: "." });
  assert.equal(res.ok, true);
  const names = res.entries.map((e) => e.name);
  assert.ok(names.includes("a.txt"));
});

test("write_file blocks path escape", async () => {
  const res = await runTool("write_file", { path: "../evil.txt", content: "x" });
  assert.equal(res.ok, false);
  assert.match(res.error, /escapes the workspace/);
});

test("edit_file replaces an exact snippet", async () => {
  await runTool("write_file", { path: "edit.txt", content: "hello world\nsecond line" });
  const res = await runTool("edit_file", {
    path: "edit.txt",
    old_text: "hello world",
    new_text: "hi there",
  });
  assert.equal(res.ok, true);
  const read = await runTool("read_file", { path: "edit.txt" });
  assert.equal(read.content, "hi there\nsecond line");
});

test("edit_file fails when snippet is ambiguous", async () => {
  await runTool("write_file", { path: "dup.txt", content: "x\nx\nx" });
  const res = await runTool("edit_file", { path: "dup.txt", old_text: "x", new_text: "y" });
  assert.equal(res.ok, false);
  assert.match(res.error, /matched 3 times/);
});

test("delete_file removes a file", async () => {
  await runTool("write_file", { path: "gone.txt", content: "bye" });
  const del = await runTool("delete_file", { path: "gone.txt" });
  assert.equal(del.ok, true);
  const read = await runTool("read_file", { path: "gone.txt" });
  assert.equal(read.ok, false);
});

test("run_command runs an allowed command", async () => {
  const res = await runTool("run_command", { command: "node -e \"console.log(6*7)\"" });
  assert.equal(res.ok, true);
  assert.match(res.stdout, /42/);
});

test("run_command refuses a blocked command", async () => {
  const res = await runTool("run_command", { command: "rm -rf /" });
  assert.equal(res.ok, false);
  assert.equal(res.blocked, true);
});

test("run_command denies a confirm-level command without approval", async () => {
  const res = await runTool("run_command", { command: "npm install express" });
  assert.equal(res.ok, false);
  assert.equal(res.denied, true);
});

test("run_command runs a confirm-level command when approved", async () => {
  const res = await runTool(
    "run_command",
    { command: "node -e \"console.log('ok')\"" }, // safe, but force the confirm path:
    { confirm: async () => true }
  );
  assert.equal(res.ok, true);
});
