import type { ToolMeta } from "./celina-api.js";
import type { BotEnv } from "./env.js";
import { code, escapeHtml } from "./format/escape.js";
import { invokeWithLoading } from "./invoke.js";
import { skipKeyboard } from "./keyboards.js";
import { coerceWizardValue } from "./parse-args.js";
import { fieldQueue, usingSavedNote } from "./params.js";
import {
  clearWizardState,
  getWizardState,
  putWizardState,
  type WizardState,
} from "./session.js";
import { sendMessage } from "./telegram.js";

function inputByName(tool: ToolMeta, name: string) {
  return tool.inputs.find((input) => input.name === name);
}

export async function promptNextField(
  env: BotEnv,
  chatId: number,
  tool: ToolMeta,
  state: WizardState,
  saved?: string,
): Promise<void> {
  const next = state.remaining[0];
  if (!next) {
    await clearWizardState(env, chatId);
    await invokeWithLoading(env, { chatId }, state.tool, state.collected, {
      json: state.json,
    });
    return;
  }

  const input = inputByName(tool, next);
  const required = input?.required ?? true;
  const optionalLeft = state.remaining.filter((name) => {
    const field = inputByName(tool, name);
    return field ? !field.required : false;
  }).length;

  const lines = [
    `Send the ${code(next)} for ${code(tool.name)}`,
  ];
  if (input?.description) lines.push(escapeHtml(input.description));
  if (input?.type) lines.push(`Type: ${escapeHtml(input.type)}`);
  if (!required) lines.push("Optional — tap Skip to leave it unset.");
  const note = usingSavedNote(tool, state.collected, saved);
  if (note) lines.push(escapeHtml(note));

  state.asking = next;
  await putWizardState(env, chatId, state);

  await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, lines.join("\n"), {
    parseMode: "HTML",
    replyMarkup: required
      ? { force_reply: true, selective: true }
      : skipKeyboard(optionalLeft > 1),
  });
}

export async function startWizard(
  env: BotEnv,
  chatId: number,
  tool: ToolMeta,
  collected: Record<string, unknown>,
  options?: { json?: boolean; saved?: string },
): Promise<void> {
  const remaining = fieldQueue(tool, collected);
  const state: WizardState = {
    tool: tool.name,
    collected,
    remaining,
    json: options?.json,
  };
  if (remaining.length === 0) {
    await invokeWithLoading(env, { chatId }, tool.name, collected, {
      json: options?.json,
    });
    return;
  }
  await promptNextField(env, chatId, tool, state, options?.saved);
}

export async function handleWizardAnswer(
  env: BotEnv,
  chatId: number,
  tool: ToolMeta,
  text: string,
  saved?: string,
): Promise<boolean> {
  const state = await getWizardState(env, chatId);
  if (!state || state.tool !== tool.name) return false;
  const asking = state.asking ?? state.remaining[0];
  if (!asking) return false;
  const input = inputByName(tool, asking);
  state.collected[asking] = coerceWizardValue(text, input?.type ?? "string");
  state.remaining = state.remaining.filter((name) => name !== asking);
  state.asking = undefined;
  await promptNextField(env, chatId, tool, state, saved);
  return true;
}

export async function handleWizardSkip(
  env: BotEnv,
  chatId: number,
  tool: ToolMeta,
  skipAll: boolean,
  saved?: string,
): Promise<void> {
  const state = await getWizardState(env, chatId);
  if (!state) {
    await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, "No prompt in progress. Send /tools to start.");
    return;
  }
  if (skipAll) {
    const requiredStill = state.remaining.filter((name) => {
      const field = inputByName(tool, name);
      return field?.required;
    });
    if (requiredStill.length > 0) {
      state.remaining = requiredStill;
      await promptNextField(env, chatId, tool, state, saved);
      return;
    }
    state.remaining = [];
    state.asking = undefined;
    await promptNextField(env, chatId, tool, state, saved);
    return;
  }
  const asking = state.asking ?? state.remaining[0];
  if (asking) {
    state.remaining = state.remaining.filter((name) => name !== asking);
  }
  state.asking = undefined;
  await promptNextField(env, chatId, tool, state, saved);
}

export async function cancelWizard(env: BotEnv, chatId: number): Promise<void> {
  await clearWizardState(env, chatId);
  await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, "Cancelled.");
}
