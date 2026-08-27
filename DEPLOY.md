# Deploy — Celina Telegram bot (Cloudflare Workers)

Git-connected Cloudflare Workers Builds deploy this repo. Do not use a local Wrangler login that belongs to another Cloudflare account.

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

The wizard and saved wallet address use a KV namespace bound as `BOT_SESSIONS`.

[`wrangler.jsonc`](wrangler.jsonc) lists the binding **without** an `id` so Cloudflare Workers Builds can provision KV on git deploy. Do not put a placeholder like `local-bot-sessions` in `id` — that fails production with code 10042.

Create or inspect the namespace in the **Cloudflare dashboard** for this Worker (Storage → KV), not with a local Wrangler login (that CLI may be pointed at a different account).

After the first successful deploy, copy the namespace id from the dashboard into `wrangler.jsonc` (`kv_namespaces[0].id`) so later builds reuse it instead of trying to create a second namespace.

## Secrets and variables

Set in the Cloudflare dashboard (**Workers & Pages → celina-bot → Settings → Variables**).

| Variable | Required | Notes |
|----------|----------|-------|
| `TELEGRAM_BOT_TOKEN` | Yes | From BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | Recommended | Random string; Telegram sends it as `X-Telegram-Bot-Api-Secret-Token` |
| `CELINA_API_BASE_URL` | Optional | Default `https://api.usecelina.xyz` |

**Local `wrangler dev`** — copy [`.env.example`](.env.example) to `.dev.vars` and fill in the token. Do not use a Wrangler CLI login that belongs to another Cloudflare account to create production KV or secrets.

## Local dev

```bash
npm install
npm test
npm run dev
```

Default URL: `http://localhost:8787` (or the port Wrangler prints). Use a tunnel if you want Telegram to reach the webhook locally.

## Deploy

Git-connected Cloudflare Workers Builds run `npx wrangler deploy` on this repo. Commit and push — do not deploy from a local Wrangler login that belongs to another project.

[`wrangler.jsonc`](wrangler.jsonc) binds `BOT_SESSIONS`, custom domain `bot.usecelina.xyz`, and `nodejs_compat`.

## Custom domain

Production host **https://bot.usecelina.xyz** is declared in [`wrangler.jsonc`](wrangler.jsonc) so git deploys do not wipe the dashboard route.

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

Expected: `{ "ok": true, "service": "celina-bot" }`. Then message the bot `/start` and `/network` in Telegram.

## Troubleshooting

- **401 on webhook** — `TELEGRAM_WEBHOOK_SECRET` must match the secret passed to `setWebhook`.
- **KV namespace '…' is not valid (10042)** — `wrangler.jsonc` had a fake `id`. Leave `id` off so Builds can provision, or paste the real id from the Cloudflare dashboard (this Worker’s account).
- **Wizard "expired"** — KV TTL is 10 minutes; send `/tools` and tap again.
- **Commands missing from "/"** — re-run `/telegram/setup` after alias sync.
