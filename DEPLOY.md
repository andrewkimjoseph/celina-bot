# Deploy — Celina Telegram bot (Cloudflare Workers)

Deploy guide for the Celina Telegram bot Worker. This repo does not auto-deploy from CI.

## Prerequisites

- [Cloudflare](https://dash.cloudflare.com) account
- A bot token from [@BotFather](https://t.me/BotFather)
- Node.js ≥ 20
- Repo cloned: [andrewkimjoseph/celina-bot](https://github.com/andrewkimjoseph/celina-bot)

```bash
cd celina-bot
npm install
npx wrangler login
```

## KV namespace

The wizard and saved wallet address use a KV namespace bound as `BOT_SESSIONS`.

```bash
npx wrangler kv namespace create BOT_SESSIONS
```

Copy the returned `id` into [`wrangler.jsonc`](wrangler.jsonc) (`kv_namespaces[0].id`). The placeholder `local-bot-sessions` is enough for `wrangler dev`.

## Secrets and variables

Set in the Cloudflare dashboard (**Workers & Pages → celina-bot → Settings → Variables**) or via Wrangler.

| Variable | Required | Notes |
|----------|----------|-------|
| `TELEGRAM_BOT_TOKEN` | Yes | From BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | Recommended | Random string; Telegram sends it as `X-Telegram-Bot-Api-Secret-Token` |
| `CELINA_API_BASE_URL` | Optional | Default `https://api.usecelina.xyz` |

**Local dev** — copy [`.env.example`](.env.example) to `.dev.vars` and fill in the token.

```bash
cp .env.example .dev.vars
```

**CLI (production):**

```bash
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET
```

## Local dev

```bash
npm install
npm test
npm run dev
```

Default URL: `http://localhost:8787` (or the port Wrangler prints). Use a tunnel if you want Telegram to reach the webhook locally.

## Deploy

From the repo root, on your machine:

```bash
npm run deploy
```

Or:

```bash
npx wrangler deploy
```

Wrangler uses [`wrangler.jsonc`](wrangler.jsonc): `main` → `src/index.ts`, `nodejs_compat` enabled, `BOT_SESSIONS` KV binding.

After deploy, Wrangler prints a `*.workers.dev` URL.

## Custom domain

Suggested production host: **https://bot.usecelina.xyz**

1. Open the Worker in the Cloudflare dashboard
2. **Settings → Domains & Routes → Add Custom Domain**
3. Enter `bot.usecelina.xyz`

## Webhook + slash-command menu

Point Telegram at the Worker and register `/` autocomplete (aliases + builtins). Either:

**A. Setup endpoint** (after secrets are set):

```bash
curl -sS -X POST https://bot.usecelina.xyz/telegram/setup \
  -H "Authorization: Bearer $TELEGRAM_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://bot.usecelina.xyz/telegram/webhook"}'
```

**B. Telegram API directly:**

```bash
curl -sS "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"https://bot.usecelina.xyz/telegram/webhook\",\"secret_token\":\"$TELEGRAM_WEBHOOK_SECRET\",\"allowed_updates\":[\"message\",\"callback_query\"]}"
```

`setMyCommands` is included in `/telegram/setup`. Re-run setup after `npm run sync-aliases` so BotFather autocomplete matches the catalog.

## Smoke test

```bash
curl -sS https://bot.usecelina.xyz/health
```

Expected: `{ "ok": true, "service": "celina-bot" }`. Then message the bot `/start` and `/network` in Telegram.

## Troubleshooting

- **401 on webhook** — `TELEGRAM_WEBHOOK_SECRET` must match the secret passed to `setWebhook`.
- **Wizard "expired"** — KV TTL is 10 minutes; send `/tools` and tap again.
- **Missing KV** — `wrangler deploy` needs a real namespace id in `wrangler.jsonc`.
- **Commands missing from "/"** — re-run `/telegram/setup` after alias sync.
