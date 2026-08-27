import { bold, code, escapeHtml, shortenAddress } from "../escape.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function formatNetworkStatus(result: unknown): string | undefined {
  if (!isRecord(result)) return undefined;
  const network = result.network ?? result.chain;
  const chainId = result.chainId ?? result.chain_id;
  const block = result.blockNumber ?? result.block_number ?? result.latestBlock;
  const gas = result.gasPriceWei ?? result.gas_price_wei ?? result.gasPrice;
  const lines = [bold("Network status")];
  if (network !== undefined) lines.push(`Network: ${escapeHtml(String(network))}`);
  if (chainId !== undefined) lines.push(`Chain ID: ${escapeHtml(String(chainId))}`);
  if (block !== undefined) lines.push(`Latest block: ${code(String(block))}`);
  if (gas !== undefined) lines.push(`Gas: ${escapeHtml(String(gas))} wei`);
  return lines.length > 1 ? lines.join("\n") : undefined;
}

function formatBalanceLine(item: Record<string, unknown>): string | undefined {
  const symbol = String(item.symbol ?? item.token ?? item.name ?? "");
  const formatted = item.formatted ?? item.balanceFormatted;
  const raw = item.raw;
  if (!symbol && formatted === undefined) return undefined;
  const amount = formatted !== undefined ? String(formatted) : String(raw ?? "0");
  if (amount === "0" || amount === "0.0") return undefined;
  return `${escapeHtml(symbol || "token")}: ${code(amount)}`;
}

export function formatBalanceList(result: unknown): string | undefined {
  if (!isRecord(result)) return undefined;
  const address =
    typeof result.address === "string"
      ? result.address
      : typeof result.accountAddress === "string"
        ? result.accountAddress
        : undefined;
  const lists = [result.balances, result.stablecoins, result.tokens].find(Array.isArray);
  const heading = [bold("Balances")];
  if (address) heading.push(code(shortenAddress(address)));

  if (lists && Array.isArray(lists)) {
    const lines = (lists as unknown[])
      .filter(isRecord)
      .map(formatBalanceLine)
      .filter((line): line is string => Boolean(line));
    if (lines.length === 0) {
      heading.push("No non-zero balances.");
      return heading.join("\n");
    }
    return [...heading, ...lines].join("\n");
  }

  if (result.formatted !== undefined || result.symbol !== undefined) {
    const symbol = String(result.symbol ?? result.token ?? "token");
    const amount = String(result.formatted ?? result.raw ?? "");
    heading.push(`${escapeHtml(symbol)}: ${code(amount)}`);
    return heading.join("\n");
  }
  return undefined;
}

export function formatQuote(result: unknown): string | undefined {
  if (!isRecord(result)) return undefined;
  const tokenIn = result.tokenIn ?? result.token_in;
  const tokenOut = result.tokenOut ?? result.token_out;
  const amountIn = result.amountIn ?? result.amount_in;
  const expectedOut = result.expectedOut ?? result.expected_out ?? result.amountOut;
  if (tokenIn === undefined || tokenOut === undefined) return undefined;
  const protocol = result.protocol ? String(result.protocol) : "Quote";
  const lines = [
    bold(protocol.replace(/_/g, " ")),
    `${code(String(amountIn ?? "?"))} ${escapeHtml(String(tokenIn))} → ${code(String(expectedOut ?? "?"))} ${escapeHtml(String(tokenOut))}`,
  ];
  if (result.routeHops !== undefined) {
    lines.push(`Hops: ${escapeHtml(String(result.routeHops))}`);
  }
  if (result.slippageTolerance !== undefined) {
    lines.push(`Slippage: ${escapeHtml(String(result.slippageTolerance))}`);
  }
  if (result.amountSide !== undefined) {
    lines.push(`Amount side: ${escapeHtml(String(result.amountSide))}`);
  }
  return lines.join("\n");
}

function proposalLine(item: Record<string, unknown>): string {
  const id = item.proposalId ?? item.proposal_id ?? item.id;
  const title = item.title;
  const stage = item.stage;
  const parts = [
    id !== undefined ? `#${id}` : undefined,
    typeof title === "string" ? title : undefined,
    typeof stage === "string" ? stage : undefined,
  ].filter(Boolean);
  return `• ${escapeHtml(parts.join(" — "))}`;
}

export function formatGovernance(result: unknown): string | undefined {
  if (!isRecord(result)) return undefined;
  const queued = Array.isArray(result.queued) ? result.queued.filter(isRecord) : [];
  const referendum = Array.isArray(result.referendum)
    ? result.referendum.filter(isRecord)
    : [];
  const proposals = Array.isArray(result.proposals)
    ? result.proposals.filter(isRecord)
    : [];
  const items = [...queued, ...referendum, ...proposals];
  if (items.length === 0 && typeof result.message === "string") {
    return escapeHtml(result.message);
  }
  const lines = [bold("Governance")];
  if (typeof result.message === "string") lines.push(escapeHtml(result.message));
  const cap = 8;
  for (const item of items.slice(0, cap)) {
    lines.push(proposalLine(item));
  }
  if (items.length > cap) {
    lines.push(escapeHtml(`…and ${items.length - cap} more — omit --human for the rest`));
  }
  return lines.length > 1 ? lines.join("\n") : undefined;
}

export function formatEns(result: unknown): string | undefined {
  if (!isRecord(result)) return undefined;
  const name = result.name ?? result.normalizedName;
  const address = result.address;
  if (name === undefined || address === undefined) return undefined;
  const chain = result.chain ?? result.resolvedVia;
  const lines = [
    bold("ENS"),
    `${code(String(name))} → ${code(String(address))}`,
  ];
  if (chain !== undefined) lines.push(`Chain: ${escapeHtml(String(chain))}`);
  return lines.join("\n");
}

export function formatAccount(result: unknown): string | undefined {
  if (!isRecord(result)) return undefined;
  if (result.balanceCelo === undefined && result.nonce === undefined) {
    return undefined;
  }
  const lines = [bold("Account")];
  if (typeof result.address === "string") lines.push(code(result.address));
  if (result.balanceCelo !== undefined) {
    lines.push(`CELO: ${code(String(result.balanceCelo))}`);
  } else if (result.balanceWei !== undefined) {
    lines.push(`Balance: ${code(String(result.balanceWei))} wei`);
  }
  if (result.nonce !== undefined) lines.push(`Nonce: ${escapeHtml(String(result.nonce))}`);
  if (typeof result.isContract === "boolean") {
    lines.push(`Contract: ${result.isContract ? "yes" : "no"}`);
  }
  return lines.join("\n");
}
