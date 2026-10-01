# Deploy — Celina Telegram bot (Cloudflare Workers)

Deploy with the Wrangler CLI. [`wrangler.jsonc`](wrangler.jsonc) pins `account_id` to the CELINA Cloudflare account.

```bash
npx wrangler deploy
```

If Wrangler reports an authentication or account error, delete `node_modules/.cache/wrangler/wrangler-account.json` in this repo and retry. That file can keep a previous login's account after you switch accounts.

## Prerequisites

- [Cloudflare](https://dash.cloudflare.com) account
- A bot token from [@BotFather](https://t.me/BotFather) — production bot is [@thecelinabot](https://t.me/thecelinabot)
- Node.js ≥ 20
- Repo cloned: [andrewkimjoseph/celina-bot](https://github.com/andrewkimjoseph/celina-bot)

```bash
cd celina-bot
npm install
```

## KV namespace

The wizard and saved wallet address use a KV namespace bound as `SESSIONS`. Cloudflare names the provisioned namespace `{worker}-{binding}` → **celina-bot-sessions**.

[`wrangler.jsonc`](wrangler.jsonc) pins the `SESSIONS` binding to the existing `celina-bot-sessions` namespace id. Do not replace that id with a placeholder — a fake id fails production with code 10042.

List namespaces with `npx wrangler kv namespace list` if you need to confirm the id.

If an older namespace named `celina-bot-bot-sessions` exists, delete it in **Storage → KV** — it was created from the previous `BOT_SESSIONS` binding.

## Secrets and variables

Set with Wrangler (`npx wrangler secret put NAME`), reading the value from `.dev.vars` or `.env.local`. Do not commit those files.

| Variable | Required | Notes |
|----------|----------|-------|
| `TELEGRAM_BOT_TOKEN` | Yes | From BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | Recommended | Random string; Telegram sends it as `X-Telegram-Bot-Api-Secret-Token` |
| `CELINA_API_BASE_URL` | Optional | Default `https://api.usecelina.xyz` |

**Local `wrangler dev`** — copy [`.env.example`](.env.example) to `.dev.vars` and fill in the token. Production secrets use `npx wrangler secret put`.

## Local dev

```bash
npm install
npm test
npm run dev
```

Default URL: `http://localhost:8787` (or the port Wrangler prints). Use a tunnel if you want Telegram to reach the webhook locally.

## Deploy

```bash
npx wrangler deploy
```

[`wrangler.jsonc`](wrangler.jsonc) binds `SESSIONS` (pinned namespace id), custom domain `bot.usecelina.xyz`, `account_id`, and `nodejs_compat`. Commit and push the submodule after the deploy so the parent pointer can move.

## Custom domain

Production host **https://bot.usecelina.xyz** is declared in [`wrangler.jsonc`](wrangler.jsonc) so `npx wrangler deploy` keeps the custom domain.

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

`setMyCommands`, About, and Description are included in `/telegram/setup`. Re-run setup after `npm run sync-aliases` so BotFather autocomplete matches the catalog.

The profile **photo** is not set by the Worker — upload it in BotFather with `/setuserpic`.

## BotFather profile

Username: **@thecelinabot**

`/setabouttext` (max 120 characters):

```
Read-only Celo mainnet tools — balances, quotes, governance. No keys, no signing.
```

`/setdescription` (max 512 characters; shown with the profile photo):

```
Read-only Celo mainnet in Telegram.

Look up balances, quotes, governance, and staking. Tap Tools, or save a wallet with /setaddress so you don't retype it.

Celina never asks for keys and never signs. Data comes from the public Celina API.

Tap Start · usecelina.xyz
```

`/setuserpic` — upload the profile image you created.

## Smoke test

```bash
curl -sS https://bot.usecelina.xyz/health
```

Expected: `{ "ok": true, "service": "celina-bot", "checks": { "telegramToken": true, "sessionsKv": true } }` (HTTP 503 when the token is missing or KV is unreachable). Then message the bot `/start` and `/network` in Telegram.

## Troubleshooting

- **401 on webhook** — `TELEGRAM_WEBHOOK_SECRET` must match the secret passed to `setWebhook`.
- **KV namespace '…' is not valid (10042)** — `wrangler.jsonc` has a wrong `SESSIONS` id. Set it to the `celina-bot-sessions` id from `npx wrangler kv namespace list`.
- **Wizard "expired"** — KV TTL is 10 minutes; send `/tools` and tap again.
- **Commands missing from "/"** — re-run `/telegram/setup` after alias sync.
