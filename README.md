# nano-dev

A minimal **CLI AI coding agent**. You type a task in plain English, and it reads, writes, and runs code in your project by letting an LLM call tools in a loop until the task is done.

> The LLM is the **brain**. The tools are the **hands**. The safety layer is the **guardrails**.

```
$ nano-dev "create fib.js with a fib(n) function, then run fib(10)"

step 1/15
  → write_file {"path":"fib.js", ...}        ✓ write_file (112b → fib.js)
step 2/15
  → write_file {"path":"run.js", ...}        ✓ write_file (53b → run.js)
step 3/15
  → run_command {"command":"node run.js"}    ✓ run_command (ran)
step 4/15

I created fib.js and run.js, ran it, and the output was 55.
✔ Done in 4 step(s).
```

---

## Why this project

Modern coding assistants (Cursor, Copilot, and others) all share one core idea: an **agentic tool-calling loop**. This project implements that loop from scratch in ~400 lines of Node.js, so you can see exactly how an AI agent decides what to do and acts on it — without the magic.

It demonstrates the skills most in demand for 2026 AI roles: **agent building, LLM function calling, tool design, and production safety thinking.**

---

## How it works — the agent loop

The whole project is one idea repeated until the task is done:

```
        ┌─────────────────────────────────────────────┐
        │  You type a task in plain English            │
        └───────────────────────┬─────────────────────┘
                                 ▼
   ┌──────────────────────────────────────────────────────┐
   │                    THE AGENT LOOP                      │
   │                                                        │
   │   1. Send task + tool list to the LLM                  │
   │   2. LLM replies: "call write_file with these args"    │
   │   3. Run that tool                                     │
   │   4. Send the result back to the LLM                   │
   │   5. Repeat until the LLM says "done"                  │
   │      (hard-capped by MAX_STEPS so it can't loop forever)│
   └───────────────┬────────────────────────┬───────────────┘
                   ▼                         ▼
          ┌─────────────────┐      ┌────────────────────────┐
          │   LLM CLIENT    │      │        TOOLS           │
          │ function calling │      │  read_file  write_file │
          │ (provider-agnostic)│    │  list_files run_command│
          └─────────────────┘      └───────────┬────────────┘
                                                ▼
                                    ┌────────────────────────┐
                                    │     SAFETY LAYER       │
                                    │  folder lockdown        │
                                    │  command block/confirm  │
                                    │  step limit             │
                                    └───────────┬────────────┘
                                                ▼
                                       Your project files
```

---

## Features

**Core**
- Plain-English tasks from the terminal
- Four tools the agent can call (read / write / list / run)
- A provider-agnostic LLM client using **function calling**
- Live, color-coded output so you watch the agent think and act
- Automatic self-correction (it reads errors and fixes its own mistakes)

**Safety (three independent guardrails)**
- **Folder lockdown** — the agent can only touch files inside a sandboxed `workspace/` folder; `../` escapes are blocked
- **Command classification** — every shell command is sorted into *block / confirm / allow*
  - destructive commands (`rm -rf /`, disk format, `shutdown`) are refused outright
  - risky commands (deletes, `git push`, `npm install`, network calls) require a y/N confirmation
- **Step limit** — the loop is hard-capped so it can never run forever or burn unlimited tokens

**Polish**
- Colored output (chalk) and a "thinking" spinner (ora)
- Automatic retry on free-tier rate limits (HTTP 429)

---

## The tools

| Tool | Arguments | What it does |
|------|-----------|--------------|
| `read_file` | `path` | Read a file's contents |
| `write_file` | `path`, `content` | Create or overwrite a file (full content) |
| `list_files` | `path` | List files and folders |
| `run_command` | `command` | Run a shell command (install, test) — safety-gated |

Adding a fifth tool is just creating a file in `src/tools/` and registering it in `src/tools/index.js`.

---

## Project structure

```
nano-dev/
├── bin/
│   └── index.js          # CLI entry point — parses the task, renders output
├── src/
│   ├── agent.js          # THE agent loop (the heart of the project)
│   ├── llm.js            # provider-agnostic LLM client
│   ├── providers/
│   │   └── gemini.js     # Gemini function-calling implementation
│   ├── tools/
│   │   ├── index.js      # tool registry + runTool()
│   │   ├── readFile.js
│   │   ├── writeFile.js
│   │   ├── listFiles.js
│   │   └── runCommand.js # safety-gated command execution
│   ├── safety.js         # command classification (block/confirm/allow)
│   ├── confirm.js        # y/N terminal prompt
│   ├── workspace.js      # folder lockdown + path resolution
│   ├── prompts.js        # the system prompt that guides the agent
│   ├── config.js         # loads .env, central config
│   └── ui.js             # colors + spinner
├── .env.example          # config template (copy to .env)
├── package.json
└── README.md
```

**The three layers, mapped to files:**
- **Brain** → `llm.js` + `providers/gemini.js`
- **Hands** → `tools/`
- **Guardrails** → `safety.js` + `workspace.js` + the step cap in `agent.js`

---

## Getting started

### 1. Prerequisites
- Node.js 18+ (developed on Node 25)
- A Gemini API key (free tier works) from [Google AI Studio](https://aistudio.google.com/apikey)

### 2. Install
```bash
npm install
```

### 3. Configure
```bash
cp .env.example .env
```
Then open `.env` and add your key:
```ini
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_real_key_here
GEMINI_MODEL=gemini-2.5-flash
MAX_STEPS=15
```
> `.env` is gitignored — your key never gets committed.

### 4. Run

**Install the command globally (from the project folder):**
```bash
npm link
```
This makes `nano-dev` available as a command anywhere on your machine.

**Interactive mode** (launch once, then chat with it):
```bash
nano-dev
```

**One-shot mode** (run a single task and exit):
```bash
nano-dev "create a hello.js that prints hello world, then run it"
```

Or without installing the command, run it directly:
```bash
node bin/index.js "your task here"
```

The agent works inside a sandboxed `workspace/` folder created on first run.

Inside interactive mode: `/help` for commands, `/clear` to reset the conversation, `/exit` to quit.

---

## Installing as a published package

Once published to npm:
```bash
npm install -g nano-dev      # install globally
nano-dev "build me an express server"
```
Or zero-install with npx:
```bash
npx nano-dev "build me an express server"
```

---

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `LLM_PROVIDER` | `gemini` | Which LLM backend to use |
| `GEMINI_API_KEY` | — | Your Gemini API key |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Model name |
| `MAX_STEPS` | `15` | Max loop iterations before stopping |
| `AGENT_WORKSPACE` | `./workspace` | Folder the agent is allowed to touch |

---

## Swapping the LLM provider

The agent loop never talks to Gemini directly — it calls `chatWithTools()` in `src/llm.js`, which returns a normalized response:

```js
{ text: string, toolCalls: [{ name, args }] }
```

To add OpenAI or Ollama: create `src/providers/<name>.js` exporting a `chat(messages, tools, opts)` function with the same shape, then register it in the `providers` map in `src/llm.js`. No other code changes.

---

## Design decisions worth knowing

- **Function calling over text parsing.** Tools are described as JSON schemas and the model returns structured calls — no brittle string parsing.
- **Sandboxed workspace.** Every path is resolved against a single root and validated, so a tool can never read or write outside it.
- **Risk-classified commands.** A coding agent that can run shell commands is dangerous; classifying commands and requiring human approval for risky ones is the safety backbone.
- **Step cap.** A confused model could loop forever and burn tokens — the cap makes cost and behavior bounded.
- **Provider abstraction.** The loop is decoupled from the LLM vendor so the project isn't locked to one API.

---

## Limitations & possible next steps

- Edits rewrite whole files; a `apply_diff` tool would allow surgical edits.
- No semantic codebase search yet (would help on larger projects).
- Single-provider (Gemini) implemented; OpenAI/Ollama are stubbed via the abstraction.
- A web UI (React + Monaco) could wrap the same engine for a clickable demo.

---

## License

MIT
