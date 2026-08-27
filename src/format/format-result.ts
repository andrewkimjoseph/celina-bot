import { FORMATTED_SOFT_LIMIT } from "../constants.js";
import {
  escapeHtml,
  finalizeFormattedHtml,
  formatBytes,
  pre,
} from "./escape.js";
import { formatByShape } from "./shapes.js";
import {
  formatAccount,
  formatBalanceList,
  formatEns,
  formatGovernance,
  formatNetworkStatus,
  formatQuote,
} from "./tools/specific.js";

export type FormattedReply =
  | { kind: "html"; text: string }
  | { kind: "document"; filename: string; body: string; caption: string };

type ToolFormatter = (result: unknown) => string | undefined;

const TOOL_FORMATTERS: Record<string, ToolFormatter> = {
  get_network_status: formatNetworkStatus,
  get_stablecoin_balances: formatBalanceList,
  get_celo_balances: formatBalanceList,
  get_token_balance: formatBalanceList,
  get_aave_balances: formatBalanceList,
  get_mento_fx_quote: formatQuote,
  get_uniswap_quote: formatQuote,
  get_gooddollar_reserve_quote: formatQuote,
  get_actionable_governance_proposals: formatGovernance,
  get_queued_proposals: formatGovernance,
  get_votable_proposals: formatGovernance,
  get_governance_proposals: formatGovernance,
  resolve_ens: formatEns,
  get_account: formatAccount,
};

function jsonDocument(tool: string, pretty: string): FormattedReply {
  return {
    kind: "document",
    filename: `${tool}.json`,
    body: pretty,
    caption: `Result attached as JSON (${formatBytes(pretty.length)}) — ${tool}`,
  };
}

function jsonReply(tool: string, result: unknown): FormattedReply {
  const pretty = JSON.stringify(result, null, 2);
  if (pretty.length <= FORMATTED_SOFT_LIMIT) {
    return { kind: "html", text: pre(pretty) };
  }
  return jsonDocument(tool, pretty);
}

export function formatToolResult(
  tool: string,
  result: unknown,
  options?: { json?: boolean },
): FormattedReply {
  if (options?.json) {
    return jsonReply(tool, result);
  }

  const specific = TOOL_FORMATTERS[tool]?.(result);
  const heuristic = specific ?? formatByShape(result);
  if (heuristic) {
    return { kind: "html", text: finalizeFormattedHtml(heuristic) };
  }

  const pretty = JSON.stringify(result, null, 2);
  if (pretty.length <= FORMATTED_SOFT_LIMIT) {
    return { kind: "html", text: pre(pretty) };
  }
  return jsonDocument(tool, pretty);
}

export function formatToolError(tool: string, message: string): string {
  return `Couldn't run ${tool}: ${escapeHtml(message)}`;
}
