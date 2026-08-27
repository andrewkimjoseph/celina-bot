import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

const secretEnv = {
  TELEGRAM_WEBHOOK_SECRET: "test-secret",
  TELEGRAM_BOT_TOKEN: "test-token",
};

describe("HTTP surface", () => {
  const app = createApp();

  it("GET /health", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      service: "celina-bot",
    });
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
