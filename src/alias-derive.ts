/** Telegram BotFather slash-command max length. */
export const TELEGRAM_COMMAND_MAX = 32;

const STRIP_VERBS = ["get_", "check_", "verify_", "resolve_", "call_"] as const;

export function stripLeadingVerb(name: string): string {
  for (const verb of STRIP_VERBS) {
    if (name.startsWith(verb)) {
      const rest = name.slice(verb.length);
      if (rest.length > 0) return rest;
    }
  }
  return name;
}

/** Keep the first word, abbreviate the rest to `width` letters. */
export function compressAlias(name: string, width: number): string {
  const parts = name.split("_").filter(Boolean);
  if (parts.length === 0) return name.slice(0, TELEGRAM_COMMAND_MAX);
  if (parts.length === 1) return parts[0].slice(0, TELEGRAM_COMMAND_MAX);
  const first = parts[0];
  const rest = parts.slice(1).map((word) => word.slice(0, width));
  return [first, ...rest].join("_");
}

export function fitAlias(name: string): string {
  if (name.length <= TELEGRAM_COMMAND_MAX) return name;
  for (let width = 5; width >= 1; width--) {
    const candidate = compressAlias(name, width);
    if (candidate.length <= TELEGRAM_COMMAND_MAX) return candidate;
  }
  return name.slice(0, TELEGRAM_COMMAND_MAX);
}

export function derivePreferredAlias(toolName: string): string {
  return fitAlias(stripLeadingVerb(toolName));
}

function differingSegmentIndex(a: string[], b: string[]): number {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) return i;
  }
  return len;
}

function expandDifferingSegment(
  toolName: string,
  otherToolName: string,
): string {
  const a = toolName.split("_");
  const b = otherToolName.split("_");
  const index = differingSegmentIndex(a, b);
  const stripped = stripLeadingVerb(toolName);
  const parts = stripped.split("_");
  // Prefer keeping more of the original name when the collision came from stripping.
  const full = fitAlias(toolName);
  if (full !== derivePreferredAlias(toolName) || full === toolName) {
    if (full.length <= TELEGRAM_COMMAND_MAX) return full;
  }
  if (index < parts.length) {
    const expanded = [...parts];
    const originalParts = stripLeadingVerb(toolName).split("_");
    expanded[index] = originalParts[index] ?? expanded[index];
    const candidate = fitAlias(expanded.join("_"));
    if (candidate.length <= TELEGRAM_COMMAND_MAX) return candidate;
  }
  return full;
}

/**
 * Assign a unique alias to every tool. Deterministic: tools are processed
 * in lexicographic order when resolving collisions.
 */
export function assignAliases(toolNames: string[]): Map<string, string> {
  const sorted = [...toolNames].sort((a, b) => a.localeCompare(b));
  const preferred = new Map<string, string>();
  for (const name of sorted) {
    preferred.set(name, derivePreferredAlias(name));
  }

  const used = new Map<string, string[]>();
  for (const name of sorted) {
    const alias = preferred.get(name)!;
    const list = used.get(alias) ?? [];
    list.push(name);
    used.set(alias, list);
  }

  const result = new Map<string, string>();
  for (const name of sorted) {
    result.set(name, preferred.get(name)!);
  }

  for (const [alias, names] of used) {
    if (names.length < 2) continue;
    const nextByName = new Map<string, string>();
    for (const name of names) {
      const others = names.filter((other) => other !== name);
      let candidate = expandDifferingSegment(name, others[0] ?? name);
      nextByName.set(name, candidate);
    }
    const remapped = new Map<string, string[]>();
    for (const [name, candidate] of nextByName) {
      const list = remapped.get(candidate) ?? [];
      list.push(name);
      remapped.set(candidate, list);
    }
    for (const [candidate, collided] of remapped) {
      if (collided.length === 1) {
        result.set(collided[0], candidate);
        continue;
      }
      collided.sort((a, b) => a.localeCompare(b));
      collided.forEach((name, index) => {
        if (index === 0) {
          result.set(name, candidate);
          return;
        }
        const suffix = `_${index + 1}`;
        const maxBase = TELEGRAM_COMMAND_MAX - suffix.length;
        result.set(name, `${candidate.slice(0, maxBase)}${suffix}`);
      });
    }
    void alias;
  }

  const claimed = new Map<string, string>();
  const ordered = [...result.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  for (const [tool, alias] of ordered) {
    let next = alias;
    let n = 2;
    while (claimed.has(next) && claimed.get(next) !== tool) {
      const suffix = `_${n}`;
      next = `${alias.slice(0, TELEGRAM_COMMAND_MAX - suffix.length)}${suffix}`;
      n += 1;
    }
    claimed.set(next, tool);
    result.set(tool, next);
  }

  return result;
}
