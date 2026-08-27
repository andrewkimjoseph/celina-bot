import { describe, expect, it } from "vitest";
import { GENERATED_ALIASES } from "../src/aliases.generated.js";
import { ALIASES, buildSetMyCommandsPayload } from "../src/aliases.js";
import { TELEGRAM_COMMAND_MAX } from "../src/alias-derive.js";
import { generateAliasEntries } from "../scripts/generate-aliases.js";
import { SETMYCOMMANDS_CAP } from "../src/constants.js";

describe("generated aliases stay in sync with the SDK catalog", () => {
  it("committed aliases.generated.ts matches a fresh generate", () => {
    const fresh = generateAliasEntries();
    expect(GENERATED_ALIASES).toEqual(fresh);
    expect(fresh.length).toBeGreaterThan(20);
  });

  it("every alias fits Telegram's 32-character command limit", () => {
    for (const entry of GENERATED_ALIASES) {
      expect(entry.alias.length).toBeLessThanOrEqual(TELEGRAM_COMMAND_MAX);
      expect(entry.alias).toMatch(/^[a-z0-9_]+$/);
    }
  });

  it("aliases are unique after overrides", () => {
    const aliases = ALIASES.map((entry) => entry.alias);
    expect(new Set(aliases).size).toBe(aliases.length);
  });

  it("setMyCommands payload stays under Telegram's cap", () => {
    const commands = buildSetMyCommandsPayload();
    expect(commands.length).toBeLessThanOrEqual(SETMYCOMMANDS_CAP);
    const names = commands.map((command) => command.command);
    expect(new Set(names).size).toBe(names.length);
  });

  it("applies memorable overrides", async () => {
    const { resolveToolName } = await import("../src/aliases.js");
    expect(resolveToolName("balance")).toBe("get_stablecoin_balances");
    expect(resolveToolName("gov")).toBe("get_actionable_governance_proposals");
    expect(resolveToolName("network")).toBe("get_network_status");
    expect(resolveToolName("network_status")).toBe("get_network_status");
    expect(resolveToolName("get_network_status")).toBe("get_network_status");
  });
});
