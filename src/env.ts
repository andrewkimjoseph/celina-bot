export type BotEnv = {
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  CELINA_API_BASE_URL?: string;
  BOT_SESSIONS: KVNamespace;
};

export const DEFAULT_CELINA_API_BASE_URL = "https://api.usecelina.xyz";
