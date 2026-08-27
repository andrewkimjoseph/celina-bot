export type ParsedCall = {
  tool?: string;
  params: Record<string, unknown>;
  json: boolean;
  human: boolean;
  error?: string;
};

/** Telegram text stays a string — do not guess numbers or booleans. */
function coerceValue(raw: string): string {
  return raw;
}

/** JSON `/call` bodies type numbers as numbers; stringify those primitives. */
export function stringifyJsonNumbers(value: unknown): unknown {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value;
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (typeof nested === "number" && Number.isFinite(nested)) {
        out[key] = String(nested);
      } else if (
        nested !== null &&
        typeof nested === "object" &&
        !Array.isArray(nested)
      ) {
        out[key] = stringifyJsonNumbers(nested);
      } else {
        out[key] = nested;
      }
    }
    return out;
  }
  return value;
}

function stripOutputFlags(tokens: string[]): {
  tokens: string[];
  json: boolean;
  human: boolean;
} {
  let json = false;
  let human = false;
  const kept: string[] = [];
  for (const token of tokens) {
    if (token === "--json" || token === "json=1" || token === "json=true") {
      json = true;
      continue;
    }
    if (token === "--human" || token === "human=1" || token === "human=true") {
      human = true;
      continue;
    }
    kept.push(token);
  }
  return { tokens: kept, json, human };
}

export function parseParamsText(text: string): {
  params: Record<string, unknown>;
  json: boolean;
  human: boolean;
} {
  const trimmed = text.trim();
  if (!trimmed) return { params: {}, json: false, human: false };

  const roughTokens = trimmed.split(/\s+/);
  const { tokens, json: flagFromTokens, human: humanFromTokens } =
    stripOutputFlags(roughTokens);
  const remainder = tokens.join(" ").trim();

  if (remainder.startsWith("{")) {
    try {
      const parsed = JSON.parse(remainder) as unknown;
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        return { params: {}, json: flagFromTokens, human: humanFromTokens };
      }
      const obj = parsed as Record<string, unknown>;
      const json = flagFromTokens || obj.json === 1 || obj.json === true;
      const human =
        humanFromTokens || obj.human === 1 || obj.human === true;
      delete obj.json;
      delete obj.human;
      return {
        params: stringifyJsonNumbers(obj) as Record<string, unknown>,
        json,
        human,
      };
    } catch {
      return { params: {}, json: flagFromTokens, human: humanFromTokens };
    }
  }

  const params: Record<string, unknown> = {};
  let json = flagFromTokens;
  let human = humanFromTokens;
  for (const token of tokens) {
    const eq = token.indexOf("=");
    if (eq <= 0) continue;
    const key = token.slice(0, eq);
    const value = token.slice(eq + 1);
    if (key === "json") {
      json = value === "1" || value === "true";
      continue;
    }
    if (key === "human") {
      human = value === "1" || value === "true";
      continue;
    }
    params[key] = coerceValue(value);
  }
  return { params, json, human };
}

export function parseCallArgs(text: string): ParsedCall {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      params: {},
      json: false,
      human: false,
      error: "Usage: /call <tool> [key=value …] [--human]",
    };
  }
  const [tool, ...rest] = trimmed.split(/\s+/);
  if (!tool) {
    return {
      params: {},
      json: false,
      human: false,
      error: "Usage: /call <tool> [key=value …] [--human]",
    };
  }
  const { params, json, human } = parseParamsText(rest.join(" "));
  return { tool, params, json, human };
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
  return trimmed;
}
