/**
 * tools/editFile.js
 * Tool: edit_file — surgical edit. Replaces an exact snippet of a file with new
 * text, instead of rewriting the whole file. Cheaper on tokens and safer.
 */

import fs from "node:fs/promises";
import { resolveInWorkspace } from "../workspace.js";

export const editFileTool = {
  name: "edit_file",
  description:
    "Make a surgical edit to an existing file by replacing an exact text snippet with new text. " +
    "Prefer this over write_file when changing only part of a file. The old_text must match exactly once.",
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Workspace-relative path to the file to edit.",
      },
      old_text: {
        type: "string",
        description: "The exact text to find and replace. Must appear exactly once in the file.",
      },
      new_text: {
        type: "string",
        description: "The text to insert in place of old_text.",
      },
    },
    required: ["path", "old_text", "new_text"],
  },

  async execute({ path: relPath, old_text, new_text }) {
    const abs = resolveInWorkspace(relPath);

    let content;
    try {
      content = await fs.readFile(abs, "utf8");
    } catch (err) {
      if (err.code === "ENOENT") return { ok: false, error: `File not found: ${relPath}` };
      return { ok: false, error: err.message };
    }

    if (typeof old_text !== "string" || old_text === "") {
      return { ok: false, error: "old_text must be a non-empty string." };
    }

    const occurrences = content.split(old_text).length - 1;
    if (occurrences === 0) {
      return {
        ok: false,
        error: "old_text was not found in the file. Read the file first to copy the exact text.",
      };
    }
    if (occurrences > 1) {
      return {
        ok: false,
        error: `old_text matched ${occurrences} times. Include more surrounding context so it matches exactly once.`,
      };
    }

    const updated = content.replace(old_text, new_text ?? "");
    try {
      await fs.writeFile(abs, updated, "utf8");
    } catch (err) {
      return { ok: false, error: err.message };
    }

    const before = old_text.split("\n").length;
    const after = (new_text ?? "").split("\n").length;
    return { ok: true, path: relPath, linesBefore: before, linesAfter: after };
  },
};
