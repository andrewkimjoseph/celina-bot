import { FORMATTED_SOFT_LIMIT } from "../constants.js";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function shortenAddress(address: string): string {
  if (address.length < 14) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}b`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)}kb`;
  return `${(kb / 1024).toFixed(1)}mb`;
}

const TRUNCATION_NOTE = "… (truncated — omit --human for the full JSON payload)";

/** Truncate raw text first, then escape, so entities are never split. */
export function escapeAndTruncate(
  raw: string,
  limit = FORMATTED_SOFT_LIMIT,
): { html: string; truncated: boolean } {
  if (raw.length <= limit) {
    return { html: escapeHtml(raw), truncated: false };
  }
  const note = `\n${TRUNCATION_NOTE}`;
  const body = raw.slice(0, Math.max(0, limit - note.length));
  return { html: escapeHtml(body + note), truncated: true };
}

export function finalizeFormattedHtml(html: string, limit = FORMATTED_SOFT_LIMIT): string {
  if (html.length <= limit) return html;
  const note = escapeHtml(`\n${TRUNCATION_NOTE}`);
  const budget = Math.max(0, limit - note.length);
  let cut = html.slice(0, budget);
  const lastLt = cut.lastIndexOf("<");
  const lastGt = cut.lastIndexOf(">");
  if (lastLt > lastGt) {
    cut = cut.slice(0, lastLt);
  }
  return `${cut}${note}`;
}

export function bold(text: string): string {
  return `<b>${escapeHtml(text)}</b>`;
}

export function code(text: string): string {
  return `<code>${escapeHtml(text)}</code>`;
}

export function pre(text: string): string {
  return `<pre>${escapeHtml(text)}</pre>`;
}

export function labelize(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^\w/, (ch) => ch.toUpperCase());
}
