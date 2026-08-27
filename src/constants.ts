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
