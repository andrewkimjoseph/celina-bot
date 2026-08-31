<p align="center">
  <img src="https://raw.githubusercontent.com/andrewkimjoseph/celina-sdk/main/assets/celina-banner.svg" alt="Celina — Give your LLM a wallet on Celo">
</p>

# Celina Telegram bot

Telegram bot: [**@thecelinabot**](https://t.me/thecelinabot)

Read-only Celo mainnet tools — balances, quotes, governance. No keys, no signing.

Talks to the public [Celina API](https://api.usecelina.xyz). Deployed as a **Cloudflare Worker** (Hono + `wrangler`).

Suggested production host: `https://bot.usecelina.xyz`

## Commands

| Command | What it does |
|---------|----------------|
| `/start` | Welcome + shortcut keyboard |
| `/tools` | Browse tools by category (tap to run or fill params) |
| `/call <tool> [key=value …] [--human]` | Power-user invoke |
| `/setaddress 0x…` | Save a default wallet for `address` / `from` fields |
| `/clearaddress` | Forget the saved wallet |
| `/whoami` | Show the saved wallet |
| `/help` / `/help <tool>` | Commands, or one tool's inputs |
| `/cancel` | Abort a param prompt |
| `/<alias>` | Generated short name for each catalog tool (e.g. `/network`, `/balance`) |

Successful tool replies are pretty JSON by default (`<pre>` in chat, or a `.json` file when the payload is large). Add `--human` (or `human=1`) for labeled chat text. `--json` is still accepted and keeps JSON.

Shortcut keyboard after `/start`: Tools, Balance, Gov, Network.

## Local dev

```bash
npm install
cp .env.example .dev.vars
# set TELEGRAM_BOT_TOKEN (and optional TELEGRAM_WEBHOOK_SECRET)
npm test
npm run dev
```

Requires Node.js ≥ 20. The Worker talks to `https://api.usecelina.xyz` at runtime — it does **not** embed `@andrewkimjoseph/celina-sdk`. The SDK is a **devDependency** used only by `npm run sync-aliases`.

## Sync aliases after an SDK bump

Tool slash-command aliases are generated from the public read catalog (same filter as Celina API). After bumping `@andrewkimjoseph/celina-sdk`:

```bash
npm run sync-aliases
npm test
```

Do not hand-edit `src/aliases.generated.ts`. Optional memorable aliases live in `src/aliases.overrides.ts` (`balance`, `gov`, `network`).

## Deploy

See **[DEPLOY.md](DEPLOY.md)** for secrets, KV, webhook URL, and BotFather copy. Production deploys from git (Cloudflare Workers Builds). Do not use a local Wrangler login that belongs to another Cloudflare account.
