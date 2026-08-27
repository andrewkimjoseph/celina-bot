import { describe, expect, it } from "vitest";
import {
  assignAliases,
  compressAlias,
  derivePreferredAlias,
  fitAlias,
  stripLeadingVerb,
  TELEGRAM_COMMAND_MAX,
} from "../src/alias-derive.js";

describe("alias derivation", () => {
  it("strips leading get_ when the remainder is descriptive", () => {
    expect(stripLeadingVerb("get_actionable_governance_proposals")).toBe(
      "actionable_governance_proposals",
    );
    expect(derivePreferredAlias("get_actionable_governance_proposals")).toBe(
      "actionable_governance_proposals",
    );
    expect(derivePreferredAlias("get_actionable_governance_proposals").length).toBeLessThanOrEqual(
      TELEGRAM_COMMAND_MAX,
    );
  });

  it("compresses names that stay over 32 characters", () => {
    const long = "gooddollar_whitelisting_information_extra";
    expect(long.length).toBeGreaterThan(TELEGRAM_COMMAND_MAX);
    const compressed = fitAlias(long);
    expect(compressed.length).toBeLessThanOrEqual(TELEGRAM_COMMAND_MAX);
    expect(compressed.startsWith("gooddollar_")).toBe(true);
    expect(compressAlias("gooddollar_whitelisting_info", 5)).toBe("gooddollar_white_info");
  });

  it("assigns a unique alias to every tool", () => {
    const names = [
      "get_foo_bar",
      "check_foo_bar",
      "get_network_status",
      "call_contract_function",
    ];
    const aliases = assignAliases(names);
    expect(aliases.size).toBe(names.length);
    const values = [...aliases.values()];
    expect(new Set(values).size).toBe(values.length);
    for (const alias of values) {
      expect(alias.length).toBeGreaterThan(0);
      expect(alias.length).toBeLessThanOrEqual(TELEGRAM_COMMAND_MAX);
      expect(alias).toMatch(/^[a-z0-9_]+$/);
    }
  });

  it("is deterministic", () => {
    const names = ["get_zeta", "get_alpha", "check_alpha"];
    expect([...assignAliases(names).entries()]).toEqual([
      ...assignAliases([...names].reverse()).entries(),
    ].sort((a, b) => a[0].localeCompare(b[0])));
  });
});
