/**
 * tools/listFiles.js
 * Tool: list_files — lists files and folders in the workspace.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { resolveInWorkspace, getWorkspaceRoot } from "../workspace.js";

export const listFilesTool = {
  name: "list_files",
  description: "List files and folders inside a directory of the project workspace.",
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Workspace-relative directory to list. Use '.' for the workspace root.",
      },
    },
    required: [],
  },

  async execute({ path: relPath = "." } = {}) {
    const abs = relPath === "." ? getWorkspaceRoot() : resolveInWorkspace(relPath);
    try {
      const entries = await fs.readdir(abs, { withFileTypes: true });
      const items = entries.map((e) => ({
        name: e.name,
        type: e.isDirectory() ? "dir" : "file",
      }));
      return { ok: true, path: relPath, entries: items };
    } catch (err) {
      if (err.code === "ENOENT") {
        return { ok: false, error: `Directory not found: ${relPath}` };
      }
      return { ok: false, error: err.message };
    }
  },
};
