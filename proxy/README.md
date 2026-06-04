# nano-dev proxy

A tiny serverless function that powers nano-dev's **free default tier** without
shipping the API key inside the npm package.

## Why

A key bundled in a published CLI can be extracted by anyone who installs it.
Instead, the CLI calls this proxy, which holds the real Groq key in a Vercel
environment variable and forwards requests to Groq. The key never leaves the
server, and abuse guards (model allowlist + output cap) live here too.

It speaks the OpenAI chat-completions protocol, so nano-dev's existing `openai`
provider works against it unchanged.

```
CLI (default tier)  ──►  /v1/chat/completions  ──►  Groq
   no key                  this proxy (holds key)
```

## Endpoint

```
POST /v1/chat/completions
```
Standard OpenAI request body. Streaming, tool calling, and usage pass through.

## Deploy (Vercel)

1. Install the CLI and log in:
   ```bash
   npm i -g vercel
   vercel login
   ```
2. From this `proxy/` folder:
   ```bash
   vercel
   ```
3. Add the secrets in the Vercel dashboard
   (Project → Settings → Environment Variables):
   ```
   UPSTREAM_URL  = https://models.github.ai/inference/chat/completions
   UPSTREAM_KEY  = <your GitHub PAT with the "models" permission>
   DEFAULT_MODEL = openai/gpt-4o-mini
   ```
4. Redeploy to production:
   ```bash
   vercel --prod
   ```
5. Copy the production URL and set it as `DEFAULT_CONFIG.baseURL` (with `/v1`)
   in `server/src/defaults.js`.

## Local testing

```bash
echo "UPSTREAM_KEY=<github_pat>" > .env.local
vercel dev
# then point the CLI's default baseURL at http://localhost:3000/v1
```

## Switching providers

The upstream is fully env-driven — to use Groq, OpenAI, or any other
OpenAI-compatible provider instead of GitHub Models, just change `UPSTREAM_URL`,
`UPSTREAM_KEY`, `DEFAULT_MODEL`, and `ALLOWED_MODELS` in Vercel. No code changes.

## Guards

- **Model allowlist** — only models in `ALLOWED_MODELS` are permitted on the shared key.
- **Output cap** — `max_tokens` is clamped server-side (`MAX_OUTPUT_TOKENS`).
- The CLI also enforces a 10k-token free-tier budget per user.
