export const WALLET_FIELDS = [
  "address",
  "wallet_address",
  "from",
  "from_address",
] as const;

export type WalletField = (typeof WALLET_FIELDS)[number];

export function isWalletField(name: string): name is WalletField {
  return (WALLET_FIELDS as readonly string[]).includes(name);
}

export const BUILTIN_COMMANDS = [
  "start",
  "help",
  "tools",
  "call",
  "setaddress",
  "clearaddress",
  "whoami",
  "cancel",
] as const;

export const SETMYCOMMANDS_CAP = 100;

export const WIZARD_TTL_SECONDS = 10 * 60;

export const KEYBOARD = {
  tools: "📋 Tools",
  balance: "💰 Balance",
  gov: "🏛 Gov",
  network: "⚙️ Network",
} as const;

export const FORMATTED_SOFT_LIMIT = 3500;
export const TELEGRAM_TEXT_LIMIT = 4096;

export const BOT_USERNAME = "thecelinabot";

/** BotFather About / Telegram `setMyShortDescription` (max 120). */
export const BOT_ABOUT =
  "Read-only Celo mainnet tools — balances, quotes, governance. No keys, no signing.";

/** BotFather Description / Telegram `setMyDescription` (max 512). Shown with the profile photo. */
export const BOT_DESCRIPTION = `Read-only Celo mainnet in Telegram.

Look up balances, quotes, governance, and staking. Tap Tools, or save a wallet with /setaddress so you don't retype it.

Celina never asks for keys and never signs. Data comes from the public Celina API.

Tap Start · usecelina.xyz`;
