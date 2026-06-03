/**
 * tools/deleteFile.js
 * Tool: delete_file — deletes a file (or empty folder) in the workspace.
 */

import fs from "node:fs/promises";
import { resolveInWorkspace } from "../workspace.js";

export const deleteFileTool = {
  name: "delete_file",
  description: "Delete a file inside the project workspace. Use with care.",
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Workspace-relative path of the file to delete, e.g. 'old.js'.",
      },
    },
    required: ["path"],
  },

  /**
   * @param {object} args
   * @param {string} args.path
   * @param {object} [ctx] - execution context.
   * @param {(info: {command: string, reason: string}) => Promise<boolean>} [ctx.confirm]
   *        Called before deleting. If it resolves false, the delete is skipped.
   *        If no confirm fn is given, deletion proceeds (e.g. in tests).
   */
  async execute({ path: relPath }, ctx = {}) {
    const abs = resolveInWorkspace(relPath);

    // Deleting is destructive — ask for confirmation when an approver exists.
    if (ctx.confirm) {
      const approved = await ctx.confirm({
        command: `delete ${relPath}`,
        reason: "Deleting a file is destructive and cannot be undone.",
      });
      if (!approved) {
        return { ok: false, denied: true, error: `Deletion of ${relPath} was not approved.` };
      }
    }

    try {
      const stat = await fs.stat(abs);
      if (stat.isDirectory()) {
        await fs.rmdir(abs); // only removes empty directories
        return { ok: true, path: relPath, deleted: "directory" };
      }
      await fs.unlink(abs);
      return { ok: true, path: relPath, deleted: "file" };
    } catch (err) {
      if (err.code === "ENOENT") {
        return { ok: false, error: `File not found: ${relPath}` };
      }
      if (err.code === "ENOTEMPTY") {
        return { ok: false, error: `Directory not empty: ${relPath}` };
      }
      return { ok: false, error: err.message };
    }
  },
};
