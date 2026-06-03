/**
 * safety.js
 * The guardrails layer for shell commands.
 *
 * Three layers of protection in this project:
 *  1. Folder lockdown  -> workspace.js (paths can't escape the workspace)
 *  2. Step limit       -> agent.js (loop can never run forever)
 *  3. Command safety    -> this file (classify + confirm risky commands)
 *
 * assessCommand() sorts a command into one of three buckets:
 *   - "block":   catastrophic, never run (e.g. rm -rf /, disk format, fork bomb)
 *   - "confirm": destructive / network / global — ask the user first
 *   - "allow":   safe to run (e.g. node, npm test, listing files)
 */

// Patterns we refuse to run under any circumstances.
const BLOCKED_PATTERNS = [
  /\brm\s+-rf?\s+\/(?!\w)/i,        // rm -rf / (root)
  /\brm\s+-rf?\s+~(?!\w)/i,         // rm -rf ~ (home)
  /\b(mkfs|format)\b/i,             // formatting a disk
  /\bdd\s+if=.*of=\/dev\//i,        // raw disk writes
  /:\(\)\s*\{.*\};:/,               // fork bomb
  />\s*\/dev\/sda/i,                // overwrite a disk device
  /\bshutdown\b|\breboot\b/i,       // power control
  /\bdel\s+\/[sff]/i,               // Windows recursive/forced delete
  /\bformat\s+[a-z]:/i,             // Windows drive format
];

// Patterns that are allowed but should be confirmed by a human first.
const CONFIRM_PATTERNS = [
  /\brm\b|\brmdir\b|\bdel\b|\berase\b/i,        // deletions
  /\bmv\b|\bmove\b/i,                            // moves/renames
  /\bgit\s+push\b/i,                             // pushing to a remote
  /\bgit\s+reset\s+--hard\b/i,                   // destructive git
  /\bnpm\s+(install|i|publish)\b|\byarn\s+add\b/i, // dependency / publish
  /\bcurl\b|\bwget\b|\bInvoke-WebRequest\b/i,    // network fetches
  /\bsudo\b/i,                                   // privilege escalation
  /\b(npx)\b/i,                                  // runs arbitrary remote code
];

/**
 * @param {string} command
 * @returns {{ decision: "allow"|"confirm"|"block", reason: string }}
 */
export function assessCommand(command) {
  const cmd = String(command ?? "").trim();

  if (!cmd) {
    return { decision: "block", reason: "Empty command." };
  }

  for (const re of BLOCKED_PATTERNS) {
    if (re.test(cmd)) {
      return {
        decision: "block",
        reason: "Matches a blocked, potentially destructive pattern.",
      };
    }
  }

  for (const re of CONFIRM_PATTERNS) {
    if (re.test(cmd)) {
      return {
        decision: "confirm",
        reason: "Command may modify files, install packages, or access the network.",
      };
    }
  }

  return { decision: "allow", reason: "No risky pattern detected." };
}
