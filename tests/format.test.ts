import { describe, expect, it } from "vitest";
import { FORMATTED_SOFT_LIMIT } from "../src/constants.js";
import { formatToolResult } from "../src/format/format-result.js";

describe("formatToolResult", () => {
  it("defaults to labeled lines for network status", () => {
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
    expect(reply.text).not.toContain("<pre>");
  });

  it("treats --human as a no-op", () => {
    const result = {
      network: "mainnet",
      chainId: 42220,
      blockNumber: "123",
    };
    const withFlag = formatToolResult("get_network_status", result, { human: true });
    const without = formatToolResult("get_network_status", result);
    expect(withFlag).toEqual(without);
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

  it("formats the full governance list without a hard cap", () => {
    const reply = formatToolResult("get_governance_proposals", {
      proposals: Array.from({ length: 12 }, (_, i) => ({
        id: i,
        title: `Proposal ${i}`,
      })),
    });
    expect(reply.kind).toBe("html");
    if (reply.kind !== "html") return;
    expect(reply.text).toContain("Proposal 0");
    expect(reply.text).toContain("Proposal 11");
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

  it("keeps JSON when --json is passed", () => {
    const reply = formatToolResult("get_network_status", { chainId: 42220 }, { json: true });
    expect(reply.kind).toBe("html");
    if (reply.kind !== "html") return;
    expect(reply.text).toContain("<pre>");
    expect(reply.text).toContain("42220");
    expect(reply.text).not.toContain("Network status");
  });

  it("prefers JSON when both --human and --json are set", () => {
    const reply = formatToolResult(
      "get_network_status",
      { network: "mainnet", chainId: 42220 },
      { human: true, json: true },
    );
    expect(reply.kind).toBe("html");
    if (reply.kind !== "html") return;
    expect(reply.text).toContain("<pre>");
    expect(reply.text).not.toContain("Network status");
  });

  it("attaches oversized JSON when --json is set", () => {
    const bulky = { items: Array.from({ length: 400 }, (_, i) => ({ id: i, title: `Item ${i}` })) };
    const reply = formatToolResult("get_governance_proposals", bulky, { json: true });
    expect(reply.kind).toBe("document");
    if (reply.kind !== "document") return;
    expect(reply.filename).toBe("get_governance_proposals.json");
    expect(reply.body).toContain("Item 399");
    expect(reply.caption).toMatch(/Result attached as JSON/);
  });

  it("returns a truncated summary plus JSON when human HTML exceeds the limit", () => {
    const bulky = {
      proposals: Array.from({ length: 400 }, (_, i) => ({
        id: i,
        title: `Item ${i}`,
      })),
    };
    const reply = formatToolResult("get_governance_proposals", bulky);
    expect(reply.kind).toBe("summary_document");
    if (reply.kind !== "summary_document") return;
    expect(reply.filename).toBe("get_governance_proposals.json");
    expect(reply.body).toContain("Item 399");
    expect(reply.summaryHtml.length).toBeLessThanOrEqual(FORMATTED_SOFT_LIMIT);
    expect(reply.summaryHtml).toContain("truncated");
    expect(reply.summaryHtml).toContain("full JSON attached");
    expect(reply.caption).toMatch(/Full JSON/);
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
