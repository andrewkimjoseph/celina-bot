import { describe, expect, it } from "vitest";
import { parseCallArgs, parseParamsText, parseAddress, coerceWizardValue } from "../src/parse-args.js";

describe("parseCallArgs", () => {
  it("parses key=value pairs and --json", () => {
    const parsed = parseCallArgs(
      "get_token_balance token=CELO address=0xabc --json",
    );
    expect(parsed.tool).toBe("get_token_balance");
    expect(parsed.params).toEqual({ token: "CELO", address: "0xabc" });
    expect(parsed.json).toBe(true);
  });

  it("parses a JSON object body", () => {
    const parsed = parseCallArgs(
      `get_token_balance {"token":"CELO","address":"0xabc"}`,
    );
    expect(parsed.params).toEqual({ token: "CELO", address: "0xabc" });
    expect(parsed.json).toBe(false);
  });

  it("treats json=1 as the escape hatch", () => {
    const parsed = parseCallArgs("get_network_status json=1");
    expect(parsed.tool).toBe("get_network_status");
    expect(parsed.json).toBe(true);
  });

  it("errors when the tool name is missing", () => {
    expect(parseCallArgs("").error).toMatch(/Usage/);
  });
});

describe("parseParamsText", () => {
  it("returns empty params for blank input", () => {
    expect(parseParamsText("")).toEqual({ params: {}, json: false });
  });

  it("coerces booleans and numbers", () => {
    const { params } = parseParamsText("include_zero=true count=5");
    expect(params).toEqual({ include_zero: true, count: 5 });
  });
});

describe("parseAddress", () => {
  it("accepts a 0x-prefixed 40-hex address", () => {
    expect(parseAddress("0x" + "ab".repeat(20))).toMatch(/^0xab/);
    expect(parseAddress("not-an-address")).toBeUndefined();
  });
});

describe("coerceWizardValue", () => {
  it("parses booleans, numbers, and JSON arrays", () => {
    expect(coerceWizardValue("yes", "boolean")).toBe(true);
    expect(coerceWizardValue("3", "number")).toBe(3);
    expect(coerceWizardValue("[\"CELO\",\"USDm\"]", "array")).toEqual(["CELO", "USDm"]);
  });
});
