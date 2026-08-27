import { WIZARD_TTL_SECONDS } from "./constants.js";
import type { BotEnv } from "./env.js";

export type WizardState = {
  tool: string;
  collected: Record<string, unknown>;
  remaining: string[];
  asking?: string;
  json?: boolean;
};

function wizardKey(chatId: number): string {
  return `wizard:${chatId}`;
}

function addressKey(chatId: number): string {
  return `address:${chatId}`;
}

export async function getWizardState(
  env: BotEnv,
  chatId: number,
): Promise<WizardState | undefined> {
  const raw = await env.SESSIONS.get(wizardKey(chatId));
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as WizardState;
  } catch {
    return undefined;
  }
}

export async function putWizardState(
  env: BotEnv,
  chatId: number,
  state: WizardState,
): Promise<void> {
  await env.SESSIONS.put(wizardKey(chatId), JSON.stringify(state), {
    expirationTtl: WIZARD_TTL_SECONDS,
  });
}

export async function clearWizardState(env: BotEnv, chatId: number): Promise<void> {
  await env.SESSIONS.delete(wizardKey(chatId));
}

export async function getSavedAddress(
  env: BotEnv,
  chatId: number,
): Promise<string | undefined> {
  const value = await env.SESSIONS.get(addressKey(chatId));
  return value ?? undefined;
}

export async function putSavedAddress(
  env: BotEnv,
  chatId: number,
  address: string,
): Promise<void> {
  await env.SESSIONS.put(addressKey(chatId), address);
}

export async function clearSavedAddress(env: BotEnv, chatId: number): Promise<void> {
  await env.SESSIONS.delete(addressKey(chatId));
}
