import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

const secretEnv = {
  TELEGRAM_WEBHOOK_SECRET: "test-secret",
  TELEGRAM_BOT_TOKEN: "test-token",
};

describe("HTTP surface", () => {
  const app = createApp();

  it("GET /health checks the token and session store", async () => {
    const res = await app.request(
      "/health",
      {},
      {
        TELEGRAM_BOT_TOKEN: "test-token",
        SESSIONS: { get: async () => null },
      },
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      service: "celina-bot",
      checks: { telegramToken: true, sessionsKv: true },
    });
  });

  it("GET /health is 503 without a bot token", async () => {
    const res = await app.request(
      "/health",
      {},
      { SESSIONS: { get: async () => null } },
    );
    expect(res.status).toBe(503);
    const body = (await res.json()) as { ok: boolean; checks: { telegramToken: boolean } };
    expect(body.ok).toBe(false);
    expect(body.checks.telegramToken).toBe(false);
  });

  it("GET /health is 503 when the session store throws", async () => {
    const res = await app.request(
      "/health",
      {},
      {
        TELEGRAM_BOT_TOKEN: "test-token",
        SESSIONS: {
          get: async () => {
            throw new Error("kv down");
          },
        },
      },
    );
    expect(res.status).toBe(503);
    const body = (await res.json()) as { ok: boolean; checks: { sessionsKv: boolean } };
    expect(body.ok).toBe(false);
    expect(body.checks.sessionsKv).toBe(false);
  });

  it("GET /", async () => {
    const res = await app.request("/");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { service: string; read_only: boolean };
    expect(body.service).toBe("celina-bot");
    expect(body.read_only).toBe(true);
  });

  it("rejects webhook posts without the configured secret", async () => {
    const res = await app.request(
      "/telegram/webhook",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ update_id: 1 }),
      },
      secretEnv,
    );
    expect(res.status).toBe(401);
  });

  it("accepts webhook posts with the configured secret", async () => {
    const res = await app.request(
      "/telegram/webhook",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Telegram-Bot-Api-Secret-Token": "test-secret",
        },
        body: JSON.stringify({ update_id: 1 }),
      },
      secretEnv,
    );
    expect(res.status).toBe(200);
  });
});
