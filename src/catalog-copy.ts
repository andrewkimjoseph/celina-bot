const MCP_WALLET_OMIT =
  /\s*Omit to use the connected wallet or the configured MCP signer \(CELO or Self agent\)\.?/gi;

const SESSION_WALLET_OMIT =
  /\s*Omit address to use the session wallet when CELO_PRIVATE_KEY is set\.?/gi;

/** Strip MCP / session-signer copy that does not apply in Telegram. */
export function sanitizeCatalogDescription(text: string): string {
  return text
    .replace(MCP_WALLET_OMIT, " ")
    .replace(SESSION_WALLET_OMIT, " ")
    .replace(/\s+/g, " ")
    .trim();
}
