/**
 * tools/readFile.js
 * Tool: read_file — reads the contents of a file in the workspace.
 *
 * Token optimization: by default we return only the first MAX_LINES lines.
 * Most edits only need the top of a file, and re-sending huge files every
 * agent step is the biggest token cost. If the agent needs more, it can pass
 * `offset` to page further, or `max_lines` to ask for a bigger chunk.
 */

import fs from "node:fs/promises";
import { resolveInWorkspace } from "../workspace.js";

const DEFAULT_MAX_LINES = 200;

export const readFileTool = {
  name: "read_file",
  description:
    "Read a file inside the project workspace. Returns up to 200 lines by default. " +
    "Use 'offset' (1-based start line) and 'max_lines' to read more of a large file.",
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Workspace-relative path to the file, e.g. 'src/index.js'.",
      },
      offset: {
        type: "number",
        description: "1-based line number to start reading from. Defaults to 1.",
      },
      max_lines: {
        type: "number",
        description: "Maximum number of lines to return. Defaults to 200.",
      },
    },
    required: ["path"],
  },

  async execute({ path: relPath, offset = 1, max_lines = DEFAULT_MAX_LINES }) {
    const abs = resolveInWorkspace(relPath);
    try {
      const full = await fs.readFile(abs, "utf8");
      const lines = full.split("\n");
      const totalLines = lines.length;

      const start = Math.max(0, (Number(offset) || 1) - 1);
      const count = Math.max(1, Number(max_lines) || DEFAULT_MAX_LINES);
      const slice = lines.slice(start, start + count);
      const end = start + slice.length;

      const truncated = end < totalLines || start > 0;
      const content = slice.join("\n");

      const result = { ok: true, path: relPath, content, totalLines };
      if (truncated) {
        result.shownLines = `${start + 1}-${end} of ${totalLines}`;
        result.note =
          end < totalLines
            ? `File has ${totalLines} lines. Showing ${start + 1}-${end}. Pass offset=${end + 1} to read more.`
            : `Showing lines ${start + 1}-${end} of ${totalLines}.`;
      }
      return result;
    } catch (err) {
      if (err.code === "ENOENT") {
        return { ok: false, error: `File not found: ${relPath}` };
      }
      return { ok: false, error: err.message };
    }
  },
};
