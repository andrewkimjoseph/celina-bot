import { describe, expect, it } from "vitest";
import { applySavedAddress, fieldQueue, missingRequiredFields } from "../src/params.js";
import { encodeCallback } from "../src/keyboards.js";
import type { ToolMeta } from "../src/celina-api.js";

const sample: ToolMeta = {
  name: "get_token_balance",
  title: "Get Token Balance",
  description: "Balance for one registry token.",
  inputs: [
    { name: "token", type: "string", required: true, description: "token" },
    { name: "address", type: "string", required: true, description: "wallet" },
  ],
};

describe("saved address autofill", () => {
  it("fills address when missing", () => {
    const filled = applySavedAddress(sample.inputs, { token: "CELO" }, "0xabc");
    expect(filled).toEqual({ token: "CELO", address: "0xabc" });
    expect(missingRequiredFields(sample.inputs, filled)).toEqual([]);
  });

  it("does not start a wizard when only optionals remain", () => {
    const noRequired: ToolMeta = {
      ...sample,
      name: "get_latest_blocks",
      inputs: [{ name: "count", type: "number", required: false, description: "count" }],
    };
    expect(fieldQueue(noRequired, {})).toEqual([]);
  });
});

describe("callback_data", () => {
  it("stays under Telegram's 64-byte limit", () => {
    const payloads = [
      encodeCallback({ type: "cats", page: 99 }),
      encodeCallback({ type: "cat", catIndex: 12, page: 3 }),
      encodeCallback({ type: "tool", toolIndex: 47 }),
      encodeCallback({ type: "skip" }),
      encodeCallback({ type: "skipall" }),
      encodeCallback({ type: "cancel" }),
    ];
    for (const data of payloads) {
      expect(new TextEncoder().encode(data).length).toBeLessThanOrEqual(64);
    }
  });
});
