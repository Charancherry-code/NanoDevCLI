# nano-dev

A tiny **AI coding agent that lives in your terminal**. Describe a task in plain
English and nano-dev reads, writes, edits, and runs your code by calling real
tools in a loop — until it's done.

[![npm](https://img.shields.io/npm/v/nano-dev?color=4fd1c5)](https://www.npmjs.com/package/nano-dev)

```bash
npm install -g nano-dev
nano-dev
```

> The LLM is the **brain**. The tools are the **hands**. The safety layer is the **guardrails**.

```
you › build a CLI weather app
  • Writing weather.js              ✓ 1.2 kB
  • Running npm install             ✓ 4 packages added
  • Running node weather.js Tokyo   ✓ Tokyo: 18°C, clear skies

agent › Done — try: node weather.js <city>
tokens: 2,418 (in 2,090, out 328)
```

---

## Why this project

Modern coding assistants all share one core idea: an **agentic tool-calling
loop**. nano-dev implements that loop from scratch in plain Node.js, so you can
see exactly how an AI agent decides what to do and acts on it — no magic.

It demonstrates the skills most in demand for AI roles in 2026: **agent
building, LLM function calling, tool design, persistent memory, and production
safety + deployment thinking.**

---

## Repository layout

This is a monorepo with three deployable pieces:

```
.
├── server/   # the nano-dev CLI  → published to npm
├── proxy/    # serverless key proxy for the free tier → deployed to Vercel
└── client/   # the landing page (React + Vite) → deployed to Vercel
```

| Piece | What it is | Ships to |
|-------|-----------|----------|
| `server/` | The CLI agent (tools, loop, safety, memory) | [npm](https://www.npmjs.com/package/nano-dev) |
| `proxy/` | Holds the shared API key server-side for the free tier | Vercel |
| `client/` | Marketing/landing page | Vercel |

---

## Quick start

```bash
npm install -g nano-dev
nano-dev                          # interactive session
nano-dev "create an express api"  # one-shot task
nano-dev --here "fix the bug"     # work in the current folder
```

On first launch you choose:

1. **Free default tier** — start instantly, capped at 10,000 tokens (routes
   through the hosted proxy, no key needed).
2. **Bring your own key** — Gemini or any OpenAI-compatible endpoint. Unlimited.

Switch anytime with `/config`.

---

## How it works — the agent loop

```
        You type a task in plain English
                       │
                       ▼
   ┌──────────────────────────────────────────────┐
   │                THE AGENT LOOP                  │
   │  1. Send task + tools to the LLM               │
   │  2. LLM replies with a tool call               │
   │  3. Run the tool                               │
   │  4. Send the result back                       │
   │  5. Repeat until done (capped by MAX_STEPS)    │
   └───────────────┬───────────────────┬────────────┘
                   ▼                   ▼
            LLM client            Tools (read / write /
         (function calling)        edit / delete / list / run)
                                        │
                                        ▼
                                  Safety layer
                          (sandbox · confirm · step cap)
```

## Features

- **6 tools** — `read_file`, `write_file`, `edit_file` (surgical), `delete_file`, `list_files`, `run_command`
- **Self-correcting** — reads its own errors and fixes them
- **Safety** — sandboxed to one folder, destructive commands blocked, risky ones need approval, hard step cap
- **Memory** — sessions persist across launches; a `NANO.md` file holds project context
- **Streaming + token tracking** — live output and a per-session token counter
- **Any model** — Gemini or any OpenAI-compatible endpoint; provider-agnostic core

## In-session commands

| Command | Description |
|---------|-------------|
| `/help` | Show all commands |
| `/tools` | List the agent's tools |
| `/model` | Show active model + provider |
| `/config` | Switch default key / your own key |
| `/tokens` | Tokens used this session |
| `/remember` | Save a note to project memory (NANO.md) |
| `/clear` | Reset the conversation |
| `/exit` | Quit |

---

## Local development

```bash
cd server
npm install
cp .env.example .env     # add a key for local dev
npm start                # or: node bin/index.js "your task"
npm test                 # run the test suite
```

The free-tier default key never ships in the package — it lives in the `proxy/`
deployment's environment variables. See `proxy/README.md` for deploy steps.

## License

MIT
