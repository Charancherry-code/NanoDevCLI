/**
 * tools/index.js
 * The tool registry.
 *
 * Collects every tool (name, JSON schema, execute function) in one place.
 * The agent loop reads this list to tell the LLM what tools exist, and to
 * look up which function to run when the LLM calls a tool by name.
 *
 * Adding a 5th tool later = create a file here and register it below.
 */

import { readFileTool } from "./readFile.js";
import { writeFileTool } from "./writeFile.js";
import { editFileTool } from "./editFile.js";
import { listFilesTool } from "./listFiles.js";
import { runCommandTool } from "./runCommand.js";
import { deleteFileTool } from "./deleteFile.js";

export const tools = [
  readFileTool,
  writeFileTool,
  editFileTool,
  listFilesTool,
  runCommandTool,
  deleteFileTool,
];

// name -> tool, for quick lookup when the LLM calls a tool.
export const toolsByName = Object.fromEntries(tools.map((t) => [t.name, t]));

/**
 * Run a tool by name with the given args. Returns the tool's result object.
 * `ctx` carries execution context (e.g. a confirm callback for run_command).
 * Used by the agent loop in Phase 4.
 */
export async function runTool(name, args, ctx = {}) {
  const tool = toolsByName[name];
  if (!tool) {
    return { ok: false, error: `Unknown tool: ${name}` };
  }
  try {
    return await tool.execute(args ?? {}, ctx);
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
