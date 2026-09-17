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
    expect(reply.text).toContain("<b>Network status</b>");
    expect(reply.text).toContain("<b>Network</b>");
    expect(reply.text).toContain("mainnet");
    expect(reply.text).toContain("<b>Chain ID</b>");
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
    expect(reply.text).toContain("<b>USDm</b>");
    expect(reply.text).toContain("10.5");
    expect(reply.text).not.toContain("USDT");
  });

  it("formats account fields with bold labels", () => {
    const reply = formatToolResult("get_account", {
      address: "0x68961aC3376fa6c2aa20689307Be57f107031B31",
      balanceCelo: "19.25",
      nonce: 537,
      isContract: false,
    });
    expect(reply.kind).toBe("html");
    if (reply.kind !== "html") return;
    expect(reply.text).toContain("<b>Account</b>");
    expect(reply.text).toContain("<b>CELO</b>");
    expect(reply.text).toContain("<b>Nonce</b>");
    expect(reply.text).toContain("537");
    expect(reply.text).toContain("<b>Contract</b>");
    expect(reply.text).not.toContain("yes");
    expect(reply.text).toContain("no");
  });

  it("shows the empty governance message", () => {
    const reply = formatToolResult("get_actionable_governance_proposals", {
      queued: [],
      referendum: [],
      message: "No actionable proposals",
    });
    expect(reply.kind).toBe("html");
    if (reply.kind !== "html") return;
    expect(reply.text).toContain("No actionable proposals.");
  });

  it("punctuates an empty get_governance_votes sentence", () => {
    const reply = formatToolResult("get_governance_votes", {
      referendumVotes: [],
      upvote: null,
      message: "No governance votes found for this address",
    });
    expect(reply.kind).toBe("html");
    if (reply.kind !== "html") return;
    expect(reply.text).toContain("No governance votes found for this address.");
    expect(reply.text).not.toContain("No governance votes found for this address..");
  });

  it("does not punctuate a get_governance_votes list heading", () => {
    const reply = formatToolResult("get_governance_votes", {
      referendumVotes: [
        { proposalId: 99, title: "CGP-99", stage: "Referendum" },
      ],
      message: "1 referendum vote(s)",
    });
    expect(reply.kind).toBe("html");
    if (reply.kind !== "html") return;
    expect(reply.text).toContain("1 referendum vote(s)");
    expect(reply.text).not.toContain("1 referendum vote(s).");
    expect(reply.text).toContain("CGP-99");
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
    expect(reply.text).toContain("<b>Hops</b>");
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
    expect(reply.text).toContain("<b>Network</b>");
    expect(reply.text).toContain("mainnet");
  });

  it("attaches JSON when nested details are omitted even if the summary is short", () => {
    const reply = formatToolResult("get_agentkarma_reputation", {
      address: "0x68961ac3376fa6c2aa20689307be57f107031b31",
      chain: "celo",
      face: "both",
      txCount: 0,
      lastActive: "2026-06-11T13:27:31.238+00:00",
      rankScore: 59.5,
      breakdown: { onchain: 40, identity: 19.5 },
    });
    expect(reply.kind).toBe("summary_document");
    if (reply.kind !== "summary_document") return;
    expect(reply.summaryHtml.length).toBeLessThan(FORMATTED_SOFT_LIMIT);
    expect(reply.summaryHtml).toContain("Nested details omitted — full JSON attached");
    expect(reply.summaryHtml).toContain("<b>Address</b>");
    expect(reply.summaryHtml).toContain("<b>Rank Score</b>");
    expect(reply.summaryHtml).toContain("59.5");
    expect(reply.summaryHtml).not.toContain("<b>Rank Score</b>: 59.5</b>");
    expect(reply.body).toContain("onchain");
    expect(reply.body).toContain("19.5");
    expect(reply.filename).toBe("get_agentkarma_reputation.json");
    expect(reply.caption).toMatch(/Full JSON/);
  });
});
