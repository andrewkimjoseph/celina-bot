import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleTextMessage } from "../src/commands.js";
import type { BotEnv } from "../src/env.js";
import { getSavedAddress, isPendingSetAddress } from "../src/session.js";
import type { TelegramMessage } from "../src/telegram.js";

const CHAT_ID = 42;
const ADDRESS = "0xA3872860EE9FeAB369c1a5E911CeCc2F4c40f702";

class MemoryKV {
  private store = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}

function message(text: string): TelegramMessage {
  return {
    message_id: 1,
    chat: { id: CHAT_ID, type: "private" },
    text,
  };
}

describe("/setaddress prompt", () => {
  const sent: Array<Record<string, unknown>> = [];
  let kv: MemoryKV;
  let env: BotEnv;

  beforeEach(() => {
    sent.length = 0;
    kv = new MemoryKV();
    env = {
      TELEGRAM_BOT_TOKEN: "test-token",
      SESSIONS: kv as unknown as KVNamespace,
    };
    vi.stubGlobal(
      "fetch",
      async (_url: string, init?: RequestInit) => {
        const body = typeof init?.body === "string" ? JSON.parse(init.body) : {};
        sent.push(body as Record<string, unknown>);
        return new Response(
          JSON.stringify({
            ok: true,
            result: { message_id: sent.length, chat: { id: CHAT_ID, type: "private" } },
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("saves a follow-up 0x address after bare /setaddress", async () => {
    await handleTextMessage(env, message("/setaddress"));
    expect(await isPendingSetAddress(env, CHAT_ID)).toBe(true);
    expect(sent.at(-1)?.text).toMatch(/Send a Celo address/);
    expect(sent.at(-1)?.reply_markup).toEqual({ force_reply: true, selective: true });

    await handleTextMessage(env, message(ADDRESS));
    expect(await isPendingSetAddress(env, CHAT_ID)).toBe(false);
    expect(await getSavedAddress(env, CHAT_ID)).toBe(ADDRESS);
    expect(String(sent.at(-1)?.text)).toMatch(/Saved/);
  });

  it("keeps the prompt pending when the follow-up is not an address", async () => {
    await handleTextMessage(env, message("/setaddress"));
    await handleTextMessage(env, message("not-an-address"));
    expect(await isPendingSetAddress(env, CHAT_ID)).toBe(true);
    expect(await getSavedAddress(env, CHAT_ID)).toBeUndefined();
    expect(sent.at(-1)?.text).toMatch(/Send a Celo address/);
    expect(sent.some((row) => String(row.text).includes("Unknown message"))).toBe(false);
  });

  it("still saves in one shot with /setaddress 0x…", async () => {
    await handleTextMessage(env, message(`/setaddress ${ADDRESS}`));
    expect(await isPendingSetAddress(env, CHAT_ID)).toBe(false);
    expect(await getSavedAddress(env, CHAT_ID)).toBe(ADDRESS);
    expect(String(sent.at(-1)?.text)).toMatch(/Saved/);
  });

  it("cancels a pending setaddress prompt", async () => {
    await handleTextMessage(env, message("/setaddress"));
    await handleTextMessage(env, message("/cancel"));
    expect(await isPendingSetAddress(env, CHAT_ID)).toBe(false);
    expect(sent.at(-1)?.text).toBe("Cancelled.");

    await handleTextMessage(env, message(ADDRESS));
    expect(await getSavedAddress(env, CHAT_ID)).toBeUndefined();
    expect(String(sent.at(-1)?.text)).toMatch(/Unknown message/);
  });
});
