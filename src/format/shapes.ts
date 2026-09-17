import { escapeHtml, isAddressLike, labeled, labelize } from "./escape.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isScalar(value: unknown): boolean {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function formatScalar(value: unknown): string {
  if (value === null) return "—";
  if (typeof value === "boolean") return value ? "yes" : "no";
  return String(value);
}

function pickTitle(item: Record<string, unknown>): string | undefined {
  for (const key of ["title", "name", "symbol", "token", "stage"]) {
    const value = item[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
}

function pickId(item: Record<string, unknown>): string | undefined {
  for (const key of ["id", "proposalId", "proposal_id", "index"]) {
    const value = item[key];
    if (typeof value === "string" || typeof value === "number") {
      return String(value);
    }
  }
  return undefined;
}

function listFields(obj: Record<string, unknown>): unknown[] | undefined {
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (Array.isArray(value)) return value;
  }
  return undefined;
}

function formatListItems(items: unknown[]): string {
  const objects = items.filter(isRecord);
  return objects
    .map((item) => {
      const id = pickId(item);
      const title = pickTitle(item);
      const stage = typeof item.stage === "string" ? item.stage : undefined;
      const parts = [id ? `#${id}` : undefined, title, stage].filter(Boolean);
      return `• ${escapeHtml(parts.join(" — ") || JSON.stringify(item))}`;
    })
    .join("\n");
}

function preferFormattedValue(
  key: string,
  value: unknown,
  obj: Record<string, unknown>,
): unknown | undefined {
  if (key === "raw" || key.endsWith("Wei") || key.endsWith("_wei")) {
    return undefined;
  }
  if (key === "formatted" || key.endsWith("Formatted") || key.endsWith("_formatted")) {
    return value;
  }
  const formattedKey = `${key}Formatted`;
  if (formattedKey in obj) return obj[formattedKey];
  return value;
}

function formatShallowObject(obj: Record<string, unknown>): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (key === "raw" || key.endsWith("Wei")) continue;
    const picked = preferFormattedValue(key, value, obj);
    if (picked === undefined) continue;
    if (!isScalar(picked)) continue;
    lines.push(
      labeled(labelize(key), formatScalar(picked), { code: isAddressLike(picked) }),
    );
  }
  return lines.join("\n");
}

export type ShapeFormat = { html: string; incomplete: boolean };

function complete(html: string): ShapeFormat {
  return { html, incomplete: false };
}

/** Period only on empty-state sentences, not list-heading fragments. */
export function punctuateSentence(text: string): string {
  const trimmed = text.trim();
  if (/[.!?]$/.test(trimmed)) return trimmed;
  if (!/^[A-Z]/.test(trimmed) || !trimmed.includes(" ")) return trimmed;
  return `${trimmed}.`;
}

export function formatByShape(result: unknown): ShapeFormat | undefined {
  if (typeof result === "string" || typeof result === "number" || typeof result === "boolean") {
    return complete(escapeHtml(formatScalar(result)));
  }
  if (Array.isArray(result)) {
    if (result.length === 0) return complete("No items.");
    if (result.every(isRecord) && result.some((item) => pickId(item) || pickTitle(item))) {
      return complete(formatListItems(result));
    }
    return undefined;
  }
  if (!isRecord(result)) return undefined;

  const list = listFields(result);
  const emptyLists =
    list !== undefined &&
    Object.values(result).every(
      (value) => !Array.isArray(value) || value.length === 0,
    );
  if (typeof result.message === "string" && emptyLists) {
    return complete(escapeHtml(punctuateSentence(result.message)));
  }

  if (Array.isArray(list) && list.length > 0 && list.every(isRecord)) {
    const heading =
      typeof result.message === "string" ? `${escapeHtml(result.message)}\n` : "";
    const body = formatListItems(list);
    if (body) return complete(`${heading}${body}`.trim());
  }

  const scalarKeys = Object.entries(result).filter(([, value]) => isScalar(value));
  const nestedKeys = Object.entries(result).filter(
    ([, value]) => !isScalar(value) && value !== undefined,
  );
  if (scalarKeys.length > 0 && scalarKeys.length <= 12 && nestedKeys.length === 0) {
    return complete(formatShallowObject(result));
  }
  if (scalarKeys.length > 0 && nestedKeys.length > 0 && scalarKeys.length <= 12) {
    const summary = formatShallowObject(
      Object.fromEntries(scalarKeys) as Record<string, unknown>,
    );
    return {
      html: `${summary}\n${escapeHtml("Nested details omitted — full JSON attached")}`,
      incomplete: true,
    };
  }

  return undefined;
}
