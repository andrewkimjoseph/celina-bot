import { getToolCategory } from "./aliases.js";
import { listTools, type ToolMeta } from "./celina-api.js";
import type { BotEnv } from "./env.js";

const CACHE_TTL_MS = 5 * 60 * 1000;

let cached:
  | {
      at: number;
      tools: ToolMeta[];
    }
  | undefined;

export async function getCachedTools(env: BotEnv, force = false): Promise<ToolMeta[]> {
  const now = Date.now();
  if (!force && cached && now - cached.at < CACHE_TTL_MS) {
    return cached.tools;
  }
  const tools = await listTools(env);
  cached = { at: now, tools };
  return tools;
}

export async function findCachedTool(
  env: BotEnv,
  name: string,
): Promise<ToolMeta | undefined> {
  const tools = await getCachedTools(env);
  return tools.find((tool) => tool.name === name);
}

export function categoriesFromTools(tools: ToolMeta[]): string[] {
  const set = new Set<string>();
  for (const tool of tools) {
    set.add(getToolCategory(tool.name));
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}
