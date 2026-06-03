# nano-dev

A tiny **AI coding agent that lives in your terminal**. Describe a task in plain
English and nano-dev reads, writes, edits, and runs your code by calling real
tools in a loop — until it's done.

```bash
npm install -g nano-dev
nano-dev
```

## Quick start

```bash
nano-dev                          # interactive session
nano-dev "create an express api"  # one-shot task
nano-dev --here "fix the bug"     # work in the current folder
```

On first launch you choose:

1. **Free default tier** — start instantly, capped at 10,000 tokens.
2. **Bring your own key** — Gemini or any OpenAI-compatible endpoint. Unlimited.

Switch anytime with `/config`.

## What it does

- **6 tools** — read, write, edit (surgical), delete, list, run commands
- **Agent loop** — plans steps, runs tools, reads results, self-corrects
- **Safety** — sandboxed to one folder, risky commands need approval, step cap
- **Memory** — sessions persist; a `NANO.md` file holds project context
- **Streaming + token tracking** — watch output stream, see what each task costs

## In-session commands

| Command | Description |
|---------|-------------|
| `/help` | Show all commands |
| `/tools` | List the agent's tools |
| `/model` | Show active model + provider |
| `/config` | Switch default key / your own key |
| `/tokens` | Tokens used this session |
| `/remember` | Save a note to project memory |
| `/clear` | Reset the conversation |
| `/exit` | Quit |

## Bring your own key

Run `/config`, choose option 1, and paste a key from:
- [Google AI Studio](https://aistudio.google.com/apikey) (Gemini), or
- any OpenAI-compatible endpoint (OpenAI, Groq, etc.)

## License

MIT
