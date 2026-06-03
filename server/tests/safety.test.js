/**
 * Tests for the command safety classifier.
 * Pure logic — no LLM, runs instantly.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { assessCommand } from "../src/safety.js";

test("blocks catastrophic commands", () => {
  for (const cmd of ["rm -rf /", "shutdown now", "mkfs.ext4 /dev/sda"]) {
    assert.equal(assessCommand(cmd).decision, "block", `should block: ${cmd}`);
  }
});

test("asks confirmation for risky-but-valid commands", () => {
  for (const cmd of [
    "rm -rf ./src",
    "git push origin main",
    "npm install express",
    "curl http://example.com",
  ]) {
    assert.equal(assessCommand(cmd).decision, "confirm", `should confirm: ${cmd}`);
  }
});

test("allows safe commands", () => {
  for (const cmd of ["node test.js", "npm test", "ls", "node -e \"console.log(1)\""]) {
    assert.equal(assessCommand(cmd).decision, "allow", `should allow: ${cmd}`);
  }
});

test("blocks empty commands", () => {
  assert.equal(assessCommand("").decision, "block");
  assert.equal(assessCommand("   ").decision, "block");
});
