/**
 * tools/readFile.js
 * Tool: read_file — reads the contents of a file in the workspace.
 */

import fs from "node:fs/promises";
import { resolveInWorkspace } from "../workspace.js";

export const readFileTool = {
  name: "read_file",
  description: "Read the full contents of a file inside the project workspace.",
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Workspace-relative path to the file, e.g. 'src/index.js'.",
      },
    },
    required: ["path"],
  },

  async execute({ path: relPath }) {
    const abs = resolveInWorkspace(relPath);
    try {
      const content = await fs.readFile(abs, "utf8");
      return { ok: true, path: relPath, content };
    } catch (err) {
      if (err.code === "ENOENT") {
        return { ok: false, error: `File not found: ${relPath}` };
      }
      return { ok: false, error: err.message };
    }
  },
};
