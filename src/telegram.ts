export type TelegramUser = {
  id: number;
  username?: string;
  first_name?: string;
};

export type TelegramChat = {
  id: number;
  type: string;
};

export type TelegramMessage = {
  message_id: number;
  chat: TelegramChat;
  from?: TelegramUser;
  text?: string;
  reply_to_message?: TelegramMessage;
};

export type TelegramCallbackQuery = {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};

export type InlineKeyboardButton = {
  text: string;
  callback_data: string;
};

export type ReplyMarkup =
  | { inline_keyboard: InlineKeyboardButton[][] }
  | {
      keyboard: Array<Array<{ text: string }>>;
      resize_keyboard?: boolean;
      is_persistent?: boolean;
    }
  | { force_reply: true; selective?: boolean }
  | { remove_keyboard: true };

type TelegramOk<T> = { ok: true; result: T };
type TelegramErr = { ok: false; description?: string };

async function telegramCall<T>(
  token: string,
  method: string,
  body: Record<string, unknown> | FormData,
): Promise<T> {
  const url = `https://api.telegram.org/bot${token}/${method}`;
  const init: RequestInit =
    body instanceof FormData
      ? { method: "POST", body }
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        };
  const res = await fetch(url, init);
  const json = (await res.json()) as TelegramOk<T> | TelegramErr;
  if (!json.ok) {
    throw new Error(json.description ?? `Telegram ${method} failed`);
  }
  return json.result;
}

export async function sendMessage(
  token: string,
  chatId: number,
  text: string,
  extra?: {
    parseMode?: "HTML";
    replyMarkup?: ReplyMarkup;
    replyTo?: number;
  },
): Promise<TelegramMessage> {
  return telegramCall<TelegramMessage>(token, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: extra?.parseMode,
    reply_markup: extra?.replyMarkup,
    reply_to_message_id: extra?.replyTo,
    disable_web_page_preview: true,
  });
}

export async function editMessageText(
  token: string,
  chatId: number,
  messageId: number,
  text: string,
  extra?: { parseMode?: "HTML"; replyMarkup?: ReplyMarkup | { inline_keyboard: never[] } },
): Promise<boolean> {
  try {
    await telegramCall(token, "editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: extra?.parseMode,
      reply_markup: extra?.replyMarkup,
      disable_web_page_preview: true,
    });
    return true;
  } catch {
    return false;
  }
}

export async function answerCallbackQuery(
  token: string,
  callbackQueryId: string,
  text?: string,
): Promise<void> {
  try {
    await telegramCall(token, "answerCallbackQuery", {
      callback_query_id: callbackQueryId,
      text,
    });
  } catch {
    // already answered or expired
  }
}

export async function sendChatAction(
  token: string,
  chatId: number,
  action = "typing",
): Promise<void> {
  try {
    await telegramCall(token, "sendChatAction", {
      chat_id: chatId,
      action,
    });
  } catch {
    // ignore
  }
}

export async function sendDocument(
  token: string,
  chatId: number,
  filename: string,
  body: string,
  caption?: string,
): Promise<TelegramMessage> {
  const form = new FormData();
  form.append("chat_id", String(chatId));
  form.append(
    "document",
    new Blob([body], { type: "application/json" }),
    filename,
  );
  if (caption) form.append("caption", caption.slice(0, 1024));
  return telegramCall<TelegramMessage>(token, "sendDocument", form);
}

export async function setMyCommands(
  token: string,
  commands: Array<{ command: string; description: string }>,
): Promise<void> {
  await telegramCall(token, "setMyCommands", { commands });
}

export async function setWebhook(
  token: string,
  url: string,
  secretToken?: string,
): Promise<void> {
  await telegramCall(token, "setWebhook", {
    url,
    secret_token: secretToken,
    allowed_updates: ["message", "callback_query"],
  });
}

export function parseSlashCommand(
  text: string,
): { command: string; args: string } | undefined {
  const match = text.match(/^\/([a-zA-Z0-9_]+)(?:@[\w]+)?(?:\s+([\s\S]*))?$/);
  if (!match) return undefined;
  return { command: match[1].toLowerCase(), args: (match[2] ?? "").trim() };
}
