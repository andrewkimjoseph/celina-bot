import { Hono } from "hono";
import { cors } from "hono/cors";
import { buildSetMyCommandsPayload } from "./aliases.js";
import { handleCallbackQuery, handleTextMessage } from "./commands.js";
import { BOT_ABOUT, BOT_DESCRIPTION } from "./constants.js";
import type { BotEnv } from "./env.js";
import {
  setMyCommands,
  setMyDescription,
  setMyShortDescription,
  setWebhook,
  type TelegramUpdate,
} from "./telegram.js";

type AppBindings = { Bindings: BotEnv };

function verifyWebhookSecret(env: BotEnv | undefined, header: string | undefined): boolean {
  const secret = env?.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) return true;
  return header === secret;
}

async function handleUpdate(env: BotEnv, update: TelegramUpdate): Promise<void> {
  try {
    if (update.callback_query) {
      await handleCallbackQuery(env, update.callback_query);
      return;
    }
    if (update.message) {
      await handleTextMessage(env, update.message);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const chatId =
      update.callback_query?.message?.chat.id ?? update.message?.chat.id;
    if (chatId !== undefined && env.TELEGRAM_BOT_TOKEN) {
      try {
        const { sendMessage } = await import("./telegram.js");
        await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, `Something went wrong: ${message}`);
      } catch {
        // ignore
      }
    }
  }
}

export function createApp(): Hono<AppBindings> {
  const app = new Hono<AppBindings>();

  app.use("*", cors());

  app.get("/", (c) =>
    c.json({
      ok: true,
      service: "celina-bot",
      read_only: true,
    }),
  );

  app.get("/health", (c) =>
    c.json({
      ok: true,
      service: "celina-bot",
    }),
  );

  app.post("/telegram/webhook", async (c) => {
    if (!verifyWebhookSecret(c.env, c.req.header("X-Telegram-Bot-Api-Secret-Token"))) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    let update: TelegramUpdate;
    try {
      update = (await c.req.json()) as TelegramUpdate;
    } catch {
      return c.json({ error: "Invalid JSON" }, 400);
    }

    try {
      c.executionCtx.waitUntil(handleUpdate(c.env, update));
    } catch {
      await handleUpdate(c.env, update);
    }
    return c.json({ ok: true });
  });

  app.post("/telegram/setup", async (c) => {
    const secret = c.env.TELEGRAM_WEBHOOK_SECRET;
    const header = c.req.header("X-Telegram-Bot-Api-Secret-Token");
    const bearer = c.req.header("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!secret || (header !== secret && bearer !== secret)) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    if (!c.env.TELEGRAM_BOT_TOKEN) {
      return c.json({ error: "TELEGRAM_BOT_TOKEN is not set" }, 500);
    }
    let body: { url?: string } = {};
    try {
      body = (await c.req.json()) as { url?: string };
    } catch {
      body = {};
    }
    const url = body.url;
    if (!url) {
      return c.json({ error: "JSON body must include url" }, 400);
    }
    await setWebhook(c.env.TELEGRAM_BOT_TOKEN, url, c.env.TELEGRAM_WEBHOOK_SECRET);
    await setMyCommands(c.env.TELEGRAM_BOT_TOKEN, buildSetMyCommandsPayload());
    await setMyShortDescription(c.env.TELEGRAM_BOT_TOKEN, BOT_ABOUT);
    await setMyDescription(c.env.TELEGRAM_BOT_TOKEN, BOT_DESCRIPTION);
    return c.json({
      ok: true,
      webhook: url,
      commands: buildSetMyCommandsPayload().length,
      about: BOT_ABOUT,
      description: BOT_DESCRIPTION,
    });
  });

  return app;
}

export const app = createApp();
