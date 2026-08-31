import { getAliasForTool, resolveToolName } from "./aliases.js";
import { sanitizeCatalogDescription } from "./catalog-copy.js";
import { findCachedTool, getCachedTools } from "./catalog-cache.js";
import type { ToolMeta } from "./celina-api.js";
import { KEYBOARD } from "./constants.js";
import type { BotEnv } from "./env.js";
import { code, escapeHtml, shortenAddress } from "./format/escape.js";
import { invokeWithLoading } from "./invoke.js";
import {
  categoriesKeyboard,
  decodeCallback,
  persistentKeyboard,
  toolsInCategoryKeyboard,
} from "./keyboards.js";
import { parseAddress, parseCallArgs, parseParamsText } from "./parse-args.js";
import { applySavedAddress, missingRequiredFields } from "./params.js";
import {
  clearSavedAddress,
  clearWizardState,
  getSavedAddress,
  getWizardState,
  putSavedAddress,
} from "./session.js";
import {
  answerCallbackQuery,
  editMessageText,
  parseSlashCommand as parseSlashFromTelegram,
  sendMessage,
  type TelegramCallbackQuery,
  type TelegramMessage,
} from "./telegram.js";
import {
  cancelWizard,
  handleWizardAnswer,
  handleWizardSkip,
  startWizard,
} from "./wizard.js";

const START_TEXT = [
  "<b>Celina</b> — read-only Celo mainnet tools.",
  "",
  "Tap <b>Tools</b> to browse, or set a wallet with /setaddress so balance lookups skip the address prompt.",
  "",
  "/help — commands",
  "/tools — browse by category",
  "/call &lt;tool&gt; key=value — power-user path",
].join("\n");

const HELP_TEXT = [
  "<b>Commands</b>",
  "/start — shortcut keyboard",
  "/tools — browse tools",
  "/call &lt;tool&gt; [key=value …] — invoke directly",
  "/setaddress 0x… — save a default wallet",
  "/clearaddress — forget it",
  "/whoami — show saved wallet",
  "/cancel — abort a prompt",
  "/help &lt;tool&gt; — inputs for one tool",
  "",
  "Replies are pretty JSON. Add <code>--human</code> for labeled chat text. Large payloads attach as a .json file.",
].join("\n");

function helpForTool(tool: ToolMeta): string {
  const lines = [
    `<b>${escapeHtml(tool.title)}</b>`,
    code(tool.name),
    escapeHtml(sanitizeCatalogDescription(tool.description)),
    "",
  ];
  if (tool.inputs.length === 0) {
    lines.push("No inputs — invoke with the command or /tools.");
    return lines.join("\n");
  }
  for (const input of tool.inputs) {
    const req = input.required ? "required" : "optional";
    const description = sanitizeCatalogDescription(input.description);
    const suffix = description ? ` — ${escapeHtml(description)}` : "";
    lines.push(
      `• ${code(input.name)} (${escapeHtml(input.type)}, ${req})${suffix}`,
    );
  }
  const alias = getAliasForTool(tool.name);
  if (alias) lines.push("", `Alias: /${alias}`);
  return lines.join("\n");
}

async function resolveAndRun(
  env: BotEnv,
  chatId: number,
  toolName: string,
  params: Record<string, unknown>,
  flags?: { human?: boolean; json?: boolean },
  existingMessageId?: number,
): Promise<void> {
  const tool = await findCachedTool(env, toolName);
  if (!tool) {
    await sendMessage(
      env.TELEGRAM_BOT_TOKEN,
      chatId,
      `Unknown tool: ${toolName}. Try /tools.`,
    );
    return;
  }
  const saved = await getSavedAddress(env, chatId);
  const filled = applySavedAddress(tool.inputs, params, saved);
  const missing = missingRequiredFields(tool.inputs, filled);
  if (missing.length > 0) {
    await startWizard(env, chatId, tool, filled, {
      human: flags?.human,
      json: flags?.json,
      saved,
    });
    return;
  }
  await invokeWithLoading(
    env,
    { chatId, existingMessageId },
    tool.name,
    filled,
    { human: flags?.human, json: flags?.json },
  );
}

export async function handleStart(env: BotEnv, chatId: number): Promise<void> {
  await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, START_TEXT, {
    parseMode: "HTML",
    replyMarkup: persistentKeyboard(),
  });
}

export async function handleHelp(
  env: BotEnv,
  chatId: number,
  args: string,
): Promise<void> {
  if (!args) {
    await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, HELP_TEXT, {
      parseMode: "HTML",
    });
    return;
  }
  const resolved = resolveToolName(args) ?? args;
  const tool = await findCachedTool(env, resolved);
  if (!tool) {
    await sendMessage(
      env.TELEGRAM_BOT_TOKEN,
      chatId,
      `Unknown tool: ${escapeHtml(args)}`,
      { parseMode: "HTML" },
    );
    return;
  }
  await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, helpForTool(tool), {
    parseMode: "HTML",
  });
}

export async function handleTools(env: BotEnv, chatId: number): Promise<void> {
  const tools = await getCachedTools(env);
  await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, "Pick a category:", {
    replyMarkup: categoriesKeyboard(tools),
  });
}

export async function handleCall(
  env: BotEnv,
  chatId: number,
  args: string,
): Promise<void> {
  const parsed = parseCallArgs(args);
  if (parsed.error || !parsed.tool) {
    await sendMessage(
      env.TELEGRAM_BOT_TOKEN,
      chatId,
      parsed.error ?? "Usage: /call <tool> [key=value …] [--human]",
    );
    return;
  }
  const resolved = resolveToolName(parsed.tool) ?? parsed.tool;
  await resolveAndRun(env, chatId, resolved, parsed.params, {
    human: parsed.human,
    json: parsed.json,
  });
}

export async function handleSetAddress(
  env: BotEnv,
  chatId: number,
  args: string,
): Promise<void> {
  const address = parseAddress(args);
  if (!address) {
    await sendMessage(
      env.TELEGRAM_BOT_TOKEN,
      chatId,
      "Usage: /setaddress 0x followed by 40 hex characters.",
    );
    return;
  }
  await putSavedAddress(env, chatId, address);
  await sendMessage(
    env.TELEGRAM_BOT_TOKEN,
    chatId,
    `Saved ${code(shortenAddress(address))} as your default wallet.`,
    { parseMode: "HTML" },
  );
}

export async function handleClearAddress(env: BotEnv, chatId: number): Promise<void> {
  await clearSavedAddress(env, chatId);
  await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, "Saved wallet address cleared.");
}

export async function handleWhoami(env: BotEnv, chatId: number): Promise<void> {
  const saved = await getSavedAddress(env, chatId);
  if (!saved) {
    await sendMessage(
      env.TELEGRAM_BOT_TOKEN,
      chatId,
      "No saved wallet. Use /setaddress 0x…",
    );
    return;
  }
  await sendMessage(
    env.TELEGRAM_BOT_TOKEN,
    chatId,
    `Saved wallet: ${code(saved)}`,
    { parseMode: "HTML" },
  );
}

export async function handleTextMessage(
  env: BotEnv,
  message: TelegramMessage,
): Promise<void> {
  const chatId = message.chat.id;
  const text = message.text?.trim() ?? "";
  if (!text) return;

  const parsed = parseSlashFromTelegram(text);
  const wizard = await getWizardState(env, chatId);

  if (parsed?.command === "cancel") {
    await cancelWizard(env, chatId);
    return;
  }

  if (wizard && !parsed) {
    const tool = await findCachedTool(env, wizard.tool);
    if (!tool) {
      await clearWizardState(env, chatId);
      await sendMessage(
        env.TELEGRAM_BOT_TOKEN,
        chatId,
        "That prompt expired. Send /tools to start again.",
      );
      return;
    }
    const saved = await getSavedAddress(env, chatId);
    await handleWizardAnswer(env, chatId, tool, text, saved);
    return;
  }

  if (text === KEYBOARD.tools) {
    await handleTools(env, chatId);
    return;
  }
  if (text === KEYBOARD.balance) {
    await resolveAndRun(env, chatId, "get_stablecoin_balances", {});
    return;
  }
  if (text === KEYBOARD.gov) {
    await resolveAndRun(env, chatId, "get_actionable_governance_proposals", {});
    return;
  }
  if (text === KEYBOARD.network) {
    await resolveAndRun(env, chatId, "get_network_status", {});
    return;
  }

  if (!parsed) {
    await sendMessage(
      env.TELEGRAM_BOT_TOKEN,
      chatId,
      "Unknown message. Try /tools or /help.",
    );
    return;
  }

  switch (parsed.command) {
    case "start":
      await handleStart(env, chatId);
      return;
    case "help":
      await handleHelp(env, chatId, parsed.args);
      return;
    case "tools":
      await handleTools(env, chatId);
      return;
    case "call":
      await handleCall(env, chatId, parsed.args);
      return;
    case "setaddress":
      await handleSetAddress(env, chatId, parsed.args);
      return;
    case "clearaddress":
      await handleClearAddress(env, chatId);
      return;
    case "whoami":
      await handleWhoami(env, chatId);
      return;
    default:
      break;
  }

  const toolName = resolveToolName(parsed.command);
  if (toolName) {
    const { params, json, human } = parseParamsText(parsed.args);
    await resolveAndRun(env, chatId, toolName, params, { human, json });
    return;
  }

  await sendMessage(
    env.TELEGRAM_BOT_TOKEN,
    chatId,
    `Unknown command /${parsed.command}. Try /help.`,
  );
}

export async function handleCallbackQuery(
  env: BotEnv,
  query: TelegramCallbackQuery,
): Promise<void> {
  const token = env.TELEGRAM_BOT_TOKEN;
  await answerCallbackQuery(token, query.id);

  const chatId = query.message?.chat.id;
  if (chatId === undefined) return;

  const action = decodeCallback(query.data ?? "");
  if (!action) {
    await sendMessage(token, chatId, "That button expired. Send /tools to start again.");
    return;
  }

  if (action.type === "cancel") {
    await cancelWizard(env, chatId);
    return;
  }

  if (action.type === "skip" || action.type === "skipall") {
    const state = await getWizardState(env, chatId);
    if (!state) {
      await sendMessage(token, chatId, "No prompt in progress. Send /tools to start.");
      return;
    }
    const tool = await findCachedTool(env, state.tool);
    if (!tool) {
      await clearWizardState(env, chatId);
      await sendMessage(token, chatId, "That prompt expired. Send /tools to start again.");
      return;
    }
    const saved = await getSavedAddress(env, chatId);
    await handleWizardSkip(env, chatId, tool, action.type === "skipall", saved);
    return;
  }

  const tools = await getCachedTools(env);
  const messageId = query.message?.message_id;

  if (action.type === "cats") {
    const markup = categoriesKeyboard(tools, action.page);
    if (messageId !== undefined) {
      const ok = await editMessageText(token, chatId, messageId, "Pick a category:", {
        replyMarkup: markup,
      });
      if (ok) return;
    }
    await sendMessage(token, chatId, "Pick a category:", { replyMarkup: markup });
    return;
  }

  if (action.type === "cat") {
    const page = toolsInCategoryKeyboard(tools, action.catIndex, action.page);
    if (!page) {
      await sendMessage(token, chatId, "That category expired. Send /tools to start again.");
      return;
    }
    if (messageId !== undefined) {
      const ok = await editMessageText(token, chatId, messageId, page.text, {
        replyMarkup: page.markup,
      });
      if (ok) return;
    }
    await sendMessage(token, chatId, page.text, { replyMarkup: page.markup });
    return;
  }

  const tool = tools[action.toolIndex];
  if (!tool) {
    await sendMessage(token, chatId, "That tool list expired. Send /tools to start again.");
    return;
  }
  await resolveAndRun(env, chatId, tool.name, {}, undefined, messageId);
}
