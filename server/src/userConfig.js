/**
 * userConfig.js
 * Stores the user's onboarding choice and settings in their home directory:
 *   ~/.nano-dev/config.json
 *
 * This is separate from the project .env (used for local development). When a
 * user installs nano-dev from npm, this file is how their choice persists
 * across runs.
 *
 * Shape:
 * {
 *   "mode": "own" | "default",
 *   "provider": "openai" | "gemini",
 *   "apiKey": "...",          // only for "own" mode
 *   "baseURL": "...",         // optional, for "own" mode openai-compatible
 *   "model": "...",
 *   "usage": { "totalTokens": 0 }   // tracked for "default" mode budget
 * }
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

function dir() {
  return path.join(os.homedir(), ".nano-dev");
}

function file() {
  return path.join(dir(), "config.json");
}

export function configPath() {
  return file();
}

export function hasUserConfig() {
  return fs.existsSync(file());
}

export function loadUserConfig() {
  try {
    return JSON.parse(fs.readFileSync(file(), "utf8"));
  } catch {
    return null;
  }
}

export function saveUserConfig(cfg) {
  try {
    fs.mkdirSync(dir(), { recursive: true });
    fs.writeFileSync(file(), JSON.stringify(cfg, null, 2), "utf8");
    return true;
  } catch {
    return false;
  }
}

/** Add tokens to the persisted usage counter (used for the default tier). */
export function addUsage(tokens) {
  const cfg = loadUserConfig();
  if (!cfg) return;
  cfg.usage = cfg.usage || { totalTokens: 0 };
  cfg.usage.totalTokens += tokens || 0;
  saveUserConfig(cfg);
  return cfg.usage.totalTokens;
}

export function getUsage() {
  const cfg = loadUserConfig();
  return cfg?.usage?.totalTokens || 0;
}

export function resetConfig() {
  try {
    fs.rmSync(file(), { force: true });
  } catch {
    /* ignore */
  }
}
