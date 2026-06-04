/**
 * tools/writeFile.js
 * Tool: write_file — creates or overwrites a file in the workspace.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { resolveInWorkspace } from "../workspace.js";

export const writeFileTool = {
  name: "write_file",
  description: "Create a new file or overwrite an existing file inside the project workspace.",
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Workspace-relative path to write, e.g. 'src/server.js'.",
      },
      content: {
        type: "string",
        description:
          "The full text content to write. Must be properly formatted multi-line " +
          "source code with real newlines and 2-space indentation — never put the " +
          "whole file on one line.",
      },
    },
    required: ["path", "content"],
  },

  async execute({ path: relPath, content }) {
    const abs = resolveInWorkspace(relPath);
    try {
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, content ?? "", "utf8");
      const bytes = Buffer.byteLength(content ?? "", "utf8");
      return { ok: true, path: relPath, bytesWritten: bytes };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
};
