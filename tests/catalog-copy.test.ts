import { describe, expect, it } from "vitest";
import { sanitizeCatalogDescription } from "../src/catalog-copy.js";

describe("sanitizeCatalogDescription", () => {
  it("strips the MCP connected-wallet omit sentence", () => {
    expect(
      sanitizeCatalogDescription(
        "Wallet on Celo mainnet. Omit to use the connected wallet or the configured MCP signer (CELO or Self agent).",
      ),
    ).toBe("Wallet on Celo mainnet.");
  });

  it("strips the CELO_PRIVATE_KEY session-wallet omit sentence", () => {
    expect(
      sanitizeCatalogDescription(
        'Read supplied Aave V3 balances. Omit address to use the session wallet when CELO_PRIVATE_KEY is set.',
      ),
    ).toBe("Read supplied Aave V3 balances.");
  });

  it("leaves unrelated catalog copy unchanged", () => {
    expect(
      sanitizeCatalogDescription("Human-readable amount of token_in, e.g. 100"),
    ).toBe("Human-readable amount of token_in, e.g. 100");
  });
});
