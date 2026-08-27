import { describe, expect, it } from "vitest";
import { formatToolResult } from "../src/format/format-result.js";

describe("formatToolResult", () => {
  it("formats network status as labeled lines", () => {
    const reply = formatToolResult("get_network_status", {
      network: "mainnet",
      chainId: 42220,
      blockNumber: "123",
      gasPriceWei: "100",
    });
    expect(reply.kind).toBe("html");
    if (reply.kind !== "html") return;
    expect(reply.text).toContain("Network status");
    expect(reply.text).toContain("mainnet");
    expect(reply.text).toContain("42220");
    expect(reply.text).toContain("123");
  });

  it("formats stablecoin balances and skips zeros", () => {
    const reply = formatToolResult("get_stablecoin_balances", {
      address: "0x1234567890abcdef1234567890abcdef12345678",
      stablecoins: [
        { symbol: "USDm", formatted: "10.5", raw: "10500000" },
        { symbol: "USDT", formatted: "0", raw: "0" },
      ],
    });
    expect(reply.kind).toBe("html");
    if (reply.kind !== "html") return;
    expect(reply.text).toContain("USDm");
    expect(reply.text).toContain("10.5");
    expect(reply.text).not.toContain("USDT");
  });

  it("shows the empty governance message", () => {
    const reply = formatToolResult("get_actionable_governance_proposals", {
      queued: [],
      referendum: [],
      message: "No actionable proposals",
    });
    expect(reply.kind).toBe("html");
    if (reply.kind !== "html") return;
    expect(reply.text).toContain("No actionable proposals");
  });

  it("formats quotes as in → out", () => {
    const reply = formatToolResult("get_mento_fx_quote", {
      protocol: "mento_fx",
      tokenIn: "CELO",
      tokenOut: "USDm",
      amountIn: "10",
      expectedOut: "4.2",
      routeHops: 1,
    });
    expect(reply.kind).toBe("html");
    if (reply.kind !== "html") return;
    expect(reply.text).toContain("CELO");
    expect(reply.text).toContain("USDm");
    expect(reply.text).toContain("10");
    expect(reply.text).toContain("4.2");
  });

  it("escapes HTML in dynamic strings", () => {
    const reply = formatToolResult("get_network_status", {
      network: "mainnet <script>",
      chainId: 1,
    });
    expect(reply.kind).toBe("html");
    if (reply.kind !== "html") return;
    expect(reply.text).toContain("&lt;script&gt;");
    expect(reply.text).not.toContain("<script>");
  });

  it("returns inline pre JSON when --json fits", () => {
    const reply = formatToolResult("get_network_status", { chainId: 42220 }, { json: true });
    expect(reply.kind).toBe("html");
    if (reply.kind !== "html") return;
    expect(reply.text).toContain("<pre>");
    expect(reply.text).toContain("42220");
  });

  it("attaches oversized JSON instead of truncating --json", () => {
    const bulky = { items: Array.from({ length: 400 }, (_, i) => ({ id: i, title: `Item ${i}` })) };
    const reply = formatToolResult("get_governance_proposals", bulky, { json: true });
    expect(reply.kind).toBe("document");
    if (reply.kind !== "document") return;
    expect(reply.filename).toBe("get_governance_proposals.json");
    expect(reply.body).toContain("Item 399");
    expect(reply.caption).toMatch(/Result attached as JSON/);
  });

  it("falls through to shape heuristics for unknown tools", () => {
    const reply = formatToolResult("some_unknown_tool", {
      network: "mainnet",
      ok: true,
    });
    expect(reply.kind).toBe("html");
    if (reply.kind !== "html") return;
    expect(reply.text).toContain("Network");
    expect(reply.text).toContain("mainnet");
  });
});
