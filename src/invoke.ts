import { invokeTool } from "./celina-api.js";
import type { BotEnv } from "./env.js";
import { formatToolError, formatToolResult } from "./format/format-result.js";
import {
  editMessageText,
  sendChatAction,
  sendDocument,
  sendMessage,
} from "./telegram.js";

export type InvokeTarget = {
  chatId: number;
  existingMessageId?: number;
};

export async function invokeWithLoading(
  env: BotEnv,
  target: InvokeTarget,
  tool: string,
  params: Record<string, unknown>,
  options?: { json?: boolean },
): Promise<void> {
  const token = env.TELEGRAM_BOT_TOKEN;
  const placeholder = `⏳ Fetching ${tool}…`;

  await sendChatAction(token, target.chatId);

  let messageId = target.existingMessageId;
  if (messageId !== undefined) {
    const edited = await editMessageText(token, target.chatId, messageId, placeholder);
    if (!edited) {
      const sent = await sendMessage(token, target.chatId, placeholder);
      messageId = sent.message_id;
    }
  } else {
    const sent = await sendMessage(token, target.chatId, placeholder);
    messageId = sent.message_id;
  }

  const invoked = await invokeTool(env, tool, params);

  const deliver = async (text: string, parseMode?: "HTML") => {
    const ok = await editMessageText(token, target.chatId, messageId!, text, {
      parseMode,
    });
    if (!ok) {
      await sendMessage(token, target.chatId, text, { parseMode });
    }
  };

  if (!invoked.ok) {
    await deliver(formatToolError(tool, invoked.error), "HTML");
    return;
  }

  const formatted = formatToolResult(tool, invoked.result, { json: options?.json });
  if (formatted.kind === "html") {
    await deliver(formatted.text, "HTML");
    return;
  }

  const captionEdited = await editMessageText(
    token,
    target.chatId,
    messageId!,
    formatted.caption,
  );
  if (!captionEdited) {
    await sendMessage(token, target.chatId, formatted.caption);
  }
  await sendDocument(
    token,
    target.chatId,
    formatted.filename,
    formatted.body,
    formatted.caption,
  );
}
