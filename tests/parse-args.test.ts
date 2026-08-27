import { describe, expect, it } from "vitest";
import {
  parseCallArgs,
  parseParamsText,
  parseAddress,
  coerceWizardValue,
  stringifyJsonNumbers,
} from "../src/parse-args.js";

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

  it("stringifies numbers in a JSON object body", () => {
    const parsed = parseCallArgs(`get_uniswap_quote {"amount":23,"token_in":"CELO"}`);
    expect(parsed.params).toEqual({ amount: "23", token_in: "CELO" });
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

  it("keeps key=value scalars as strings", () => {
    const { params } = parseParamsText("include_zero=true count=5 amount=23");
    expect(params).toEqual({
      include_zero: "true",
      count: "5",
      amount: "23",
    });
  });
});

describe("stringifyJsonNumbers", () => {
  it("stringifies primitive numbers and leaves booleans and arrays", () => {
    expect(
      stringifyJsonNumbers({
        amount: 23,
        include_zero: true,
        tokens: [1, 2],
      }),
    ).toEqual({
      amount: "23",
      include_zero: true,
      tokens: [1, 2],
    });
  });
});

describe("parseAddress", () => {
  it("accepts a 0x-prefixed 40-hex address", () => {
    expect(parseAddress("0x" + "ab".repeat(20))).toMatch(/^0xab/);
    expect(parseAddress("not-an-address")).toBeUndefined();
  });
});

describe("coerceWizardValue", () => {
  it("parses booleans, numbers, and JSON arrays when the catalog type says so", () => {
    expect(coerceWizardValue("yes", "boolean")).toBe(true);
    expect(coerceWizardValue("3", "number")).toBe(3);
    expect(coerceWizardValue("[\"CELO\",\"USDm\"]", "array")).toEqual(["CELO", "USDm"]);
  });

  it("keeps string (and unknown) types as trimmed text", () => {
    expect(coerceWizardValue("23", "string")).toBe("23");
    expect(coerceWizardValue(" 23 ", "string")).toBe("23");
    expect(coerceWizardValue("true", "string")).toBe("true");
  });
});
