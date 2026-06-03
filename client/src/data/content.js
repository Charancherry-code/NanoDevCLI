/**
 * content.js
 * Single source of truth for the landing page copy. Keeping data out of the
 * components makes the UI easy to tweak and keeps JSX clean.
 */

export const NPM_INSTALL = "npm install -g nano-dev";
export const GITHUB_URL = "https://github.com/your-username/nano-dev";
export const NPM_URL = "https://www.npmjs.com/package/nano-dev";

export const FEATURES = [
  {
    icon: "loop",
    title: "The agent loop",
    body: "Type a task in plain English. nano-dev decides which tool to call, runs it, reads the result, and repeats until the job is done.",
  },
  {
    icon: "tools",
    title: "Six real tools",
    body: "read, write, edit, delete, list, and run. Surgical edits patch only the lines that change instead of rewriting whole files.",
  },
  {
    icon: "shield",
    title: "Safety first",
    body: "Sandboxed to one folder. Destructive shell commands are blocked, risky ones need your approval, and a step cap stops runaway loops.",
  },
  {
    icon: "brain",
    title: "Memory that lasts",
    body: "Sessions persist across launches and a NANO.md file keeps project context in mind, so it picks up right where you left off.",
  },
  {
    icon: "bolt",
    title: "Streaming + tokens",
    body: "Watch responses stream token by token, with a live token counter so you always know what a task costs.",
  },
  {
    icon: "plug",
    title: "Any model",
    body: "Bring your own Gemini or OpenAI-compatible key, or start instantly on the free default tier. Swap providers without touching code.",
  },
];

export const STEPS = [
  {
    n: "01",
    title: "Install once",
    body: "One command puts nano-dev on your PATH. No config files to wrestle with.",
    code: "$ npm install -g nano-dev",
  },
  {
    n: "02",
    title: "Pick a key",
    body: "Use the free default tier, or bring your own key for unlimited runs. Switch anytime with /config.",
    code: "$ nano-dev",
  },
  {
    n: "03",
    title: "Describe the task",
    body: "Tell it what you want in plain English. It plans the steps, edits files, and runs your code.",
    code: "you › build an express api",
  },
];

export const TERMINAL_LINES = [
  { type: "prompt", text: "build a CLI weather app" },
  { type: "step", text: "• Writing weather.js" },
  { type: "ok", text: "  ✓ 1.2 kB" },
  { type: "step", text: "• Running npm install" },
  { type: "ok", text: "  ✓ 4 packages added" },
  { type: "step", text: "• Running node weather.js Tokyo" },
  { type: "ok", text: "  ✓ Tokyo: 18°C, clear skies" },
  { type: "agent", text: "Done — try: node weather.js <city>" },
  { type: "tokens", text: "tokens: 2,418 (in 2,090, out 328)" },
];

export const COMMANDS = [
  ["/help", "Show all commands"],
  ["/tools", "List the agent's tools"],
  ["/model", "Show active model + provider"],
  ["/config", "Switch default key / your own key"],
  ["/tokens", "Tokens used this session"],
  ["/remember", "Save a note to project memory"],
  ["/clear", "Reset the conversation"],
  ["/exit", "Quit nano-dev"],
];
