export type ParsedCall = {
  tool?: string;
  params: Record<string, unknown>;
  json: boolean;
  error?: string;
};

function coerceValue(raw: string): unknown {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(raw)) {
    const asNumber = Number(raw);
    if (Number.isFinite(asNumber)) return asNumber;
  }
  if (
    (raw.startsWith("{") && raw.endsWith("}")) ||
    (raw.startsWith("[") && raw.endsWith("]"))
  ) {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return raw;
    }
  }
  return raw;
}

function stripJsonFlag(tokens: string[]): { tokens: string[]; json: boolean } {
  let json = false;
  const kept: string[] = [];
  for (const token of tokens) {
    if (token === "--json" || token === "json=1" || token === "json=true") {
      json = true;
      continue;
    }
    kept.push(token);
  }
  return { tokens: kept, json };
}

export function parseParamsText(text: string): { params: Record<string, unknown>; json: boolean } {
  const trimmed = text.trim();
  if (!trimmed) return { params: {}, json: false };

  const roughTokens = trimmed.split(/\s+/);
  const { tokens, json: flagFromTokens } = stripJsonFlag(roughTokens);
  const remainder = tokens.join(" ").trim();

  if (remainder.startsWith("{")) {
    try {
      const parsed = JSON.parse(remainder) as unknown;
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        return { params: {}, json: flagFromTokens };
      }
      const obj = parsed as Record<string, unknown>;
      const json = flagFromTokens || obj.json === 1 || obj.json === true;
      delete obj.json;
      return { params: obj, json };
    } catch {
      return { params: {}, json: flagFromTokens };
    }
  }

  const params: Record<string, unknown> = {};
  let json = flagFromTokens;
  for (const token of tokens) {
    const eq = token.indexOf("=");
    if (eq <= 0) continue;
    const key = token.slice(0, eq);
    const value = token.slice(eq + 1);
    if (key === "json") {
      json = value === "1" || value === "true";
      continue;
    }
    params[key] = coerceValue(value);
  }
  return { params, json };
}

export function parseCallArgs(text: string): ParsedCall {
  const trimmed = text.trim();
  if (!trimmed) {
    return { params: {}, json: false, error: "Usage: /call <tool> [json | key=value …]" };
  }
  const [tool, ...rest] = trimmed.split(/\s+/);
  if (!tool) {
    return { params: {}, json: false, error: "Usage: /call <tool> [json | key=value …]" };
  }
  const { params, json } = parseParamsText(rest.join(" "));
  return { tool, params, json };
}

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export function parseAddress(text: string): string | undefined {
  const trimmed = text.trim();
  if (ADDRESS_RE.test(trimmed)) return trimmed;
  return undefined;
}

export function coerceWizardValue(raw: string, type: string): unknown {
  const trimmed = raw.trim();
  if (type === "boolean") {
    const lower = trimmed.toLowerCase();
    if (["true", "yes", "1", "y"].includes(lower)) return true;
    if (["false", "no", "0", "n"].includes(lower)) return false;
  }
  if (type === "number") {
    const asNumber = Number(trimmed);
    if (Number.isFinite(asNumber)) return asNumber;
  }
  if (type === "array") {
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      return trimmed.split(",").map((part) => part.trim()).filter(Boolean);
    }
  }
  return coerceValue(trimmed);
}
