import { afterEach, describe, expect, it, vi } from "vitest";
import { getTool, invokeTool, listTools } from "../src/celina-api.js";
import { CELINA_CLIENT_ID } from "../src/constants.js";
import type { BotEnv } from "../src/env.js";

const env = {
  TELEGRAM_BOT_TOKEN: "test-token",
  CELINA_API_BASE_URL: "https://api.example.test",
} as BotEnv;

afterEach(() => {
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("X-Celina-Client", () => {
  it("listTools sends celina_bot", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ tools: [{ name: "get_network_status", title: "Network", description: "", inputs: [] }] }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await listTools(env);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(headers["X-Celina-Client"]).toBe(CELINA_CLIENT_ID);
  });

  it("getTool sends celina_bot", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ name: "get_network_status", title: "Network", description: "", inputs: [] }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await getTool(env, "get_network_status");

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(headers["X-Celina-Client"]).toBe(CELINA_CLIENT_ID);
  });

  it("invokeTool sends celina_bot on POST", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ network: "mainnet" }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await invokeTool(env, "get_network_status", {});

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.method).toBe("POST");
    const headers = init?.headers as Record<string, string>;
    expect(headers["X-Celina-Client"]).toBe("celina_bot");
    expect(headers["Content-Type"]).toBe("application/json");
  });
});
