/**
 * tools/runCommand.js
 * Tool: run_command — runs a shell command inside the workspace.
 *
 * Safety (Phase 5):
 *  - assessCommand() classifies the command: allow | confirm | block.
 *  - "block"   -> refused outright, never executed.
 *  - "confirm" -> a confirm callback (passed in by the agent) must approve it.
 *  - "allow"   -> runs directly.
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import { getWorkspaceRoot } from "../workspace.js";
import { assessCommand } from "../safety.js";

const execAsync = promisify(exec);

export const runCommandTool = {
  name: "run_command",
  description:
    "Run a shell command inside the project workspace (e.g., install deps, run tests). Returns stdout and stderr.",
  parameters: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "The shell command to run, e.g. 'npm test'.",
      },
    },
    required: ["command"],
  },

  /**
   * @param {object} args
   * @param {string} args.command
   * @param {object} [ctx] - execution context.
   * @param {(info: {command: string, reason: string}) => Promise<boolean>} [ctx.confirm]
   *        Called for "confirm"-level commands. If it resolves false, the
   *        command is skipped. If no confirm fn is given, confirm-level
   *        commands are denied by default (safe).
   */
  async execute({ command }, ctx = {}) {
    if (typeof command !== "string" || command.trim() === "") {
      return { ok: false, error: "Command must be a non-empty string." };
    }

    const { decision, reason } = assessCommand(command);

    if (decision === "block") {
      return {
        ok: false,
        blocked: true,
        error: `Command blocked by safety policy: ${reason}`,
      };
    }

    if (decision === "confirm") {
      const approver = ctx.confirm;
      const approved = approver ? await approver({ command, reason }) : false;
      if (!approved) {
        return {
          ok: false,
          denied: true,
          error: `Command requires confirmation and was not approved: ${reason}`,
        };
      }
    }

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: getWorkspaceRoot(),
        timeout: 60_000,
        maxBuffer: 1024 * 1024,
      });
      return { ok: true, command, stdout, stderr };
    } catch (err) {
      return {
        ok: false,
        command,
        error: err.message,
        stdout: err.stdout ?? "",
        stderr: err.stderr ?? "",
        exitCode: err.code ?? null,
      };
    }
  },
};
