/**
 * commands.js
 * Central definition of slash commands so the REPL, the help screen, and the
 * tab-completion all stay in sync (one source of truth).
 */

export const COMMANDS = [
  { name: "/help", description: "Show all available commands" },
  { name: "/clear", description: "Reset the conversation (also clears saved session)" },
  { name: "/tools", description: "List the tools the agent can use" },
  { name: "/model", description: "Show the active model and provider" },
  { name: "/config", description: "Switch between the default key and your own key" },
  { name: "/tokens", description: "Show tokens used this session" },
  { name: "/remember", description: "Save a note to project memory (NANO.md)" },
  { name: "/cwd", description: "Show the folder the agent is working in" },
  { name: "/exit", description: "Quit nano-dev (also: /quit)" },
];

export const COMMAND_NAMES = COMMANDS.map((c) => c.name);

/**
 * readline completer: given the current input line, return matching commands.
 * Only completes when the line starts with "/".
 */
export function completer(line) {
  const trimmed = line.trimStart();
  if (!trimmed.startsWith("/")) return [[], line];

  const hits = COMMAND_NAMES.filter((c) => c.startsWith(trimmed));
  // If nothing matches, show all commands as suggestions.
  return [hits.length ? hits : COMMAND_NAMES, trimmed];
}
