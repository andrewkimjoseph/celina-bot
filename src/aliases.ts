import { TELEGRAM_COMMAND_MAX } from "./alias-derive.js";
import { GENERATED_ALIASES } from "./aliases.generated.js";
import { ALIAS_OVERRIDES } from "./aliases.overrides.js";
import {
  BUILTIN_COMMANDS,
  SETMYCOMMANDS_CAP,
} from "./constants.js";

export type AliasEntry = {
  tool: string;
  alias: string;
  title: string;
  category: string;
};

const builtinSet = new Set<string>(BUILTIN_COMMANDS);

function mergeAliases(): AliasEntry[] {
  const entries: AliasEntry[] = GENERATED_ALIASES.map((entry) => ({ ...entry }));
  const overridden = new Set<string>();

  for (const entry of entries) {
    const override = ALIAS_OVERRIDES[entry.tool];
    if (!override) continue;
    if (override.length > TELEGRAM_COMMAND_MAX) continue;
    if (builtinSet.has(override)) continue;
    entry.alias = override;
    overridden.add(entry.tool);
  }

  const claimed = new Map<string, string>();
  for (const entry of entries) {
    if (!overridden.has(entry.tool)) continue;
    claimed.set(entry.alias, entry.tool);
  }

  for (const entry of entries) {
    if (overridden.has(entry.tool)) continue;
    let alias = entry.alias;
    let n = 2;
    while (claimed.has(alias) || builtinSet.has(alias)) {
      const suffix = `_${n}`;
      alias = `${entry.alias.slice(0, TELEGRAM_COMMAND_MAX - suffix.length)}${suffix}`;
      n += 1;
    }
    entry.alias = alias;
    claimed.set(alias, entry.tool);
  }

  return entries;
}

export const ALIASES: AliasEntry[] = mergeAliases();

const aliasToTool = new Map<string, string>();
const toolToAlias = new Map<string, string>();
const toolMeta = new Map<string, AliasEntry>();

for (const entry of GENERATED_ALIASES) {
  aliasToTool.set(entry.alias, entry.tool);
  aliasToTool.set(entry.tool, entry.tool);
}
for (const entry of ALIASES) {
  aliasToTool.set(entry.alias, entry.tool);
  aliasToTool.set(entry.tool, entry.tool);
  toolToAlias.set(entry.tool, entry.alias);
  toolMeta.set(entry.tool, entry);
}

export function resolveToolName(command: string): string | undefined {
  return aliasToTool.get(command);
}

export function getAliasForTool(tool: string): string | undefined {
  return toolToAlias.get(tool);
}

export function getToolCategory(tool: string): string {
  return toolMeta.get(tool)?.category ?? "Other";
}

export function getToolTitle(tool: string): string {
  return toolMeta.get(tool)?.title ?? tool;
}

export type BotCommand = { command: string; description: string };

const BUILTIN_BOT_COMMANDS: BotCommand[] = [
  { command: "start", description: "Welcome and show the shortcut keyboard" },
  { command: "help", description: "How to use Celina, or /help <tool>" },
  { command: "tools", description: "Browse read tools by category" },
  { command: "call", description: "Power-user: /call <tool> key=value" },
  { command: "setaddress", description: "Save a default wallet address" },
  { command: "clearaddress", description: "Forget the saved wallet address" },
  { command: "whoami", description: "Show the saved wallet address" },
];

export function buildSetMyCommandsPayload(): BotCommand[] {
  const remaining = SETMYCOMMANDS_CAP - BUILTIN_BOT_COMMANDS.length;
  const aliasCommands: BotCommand[] = [];
  for (const entry of ALIASES) {
    if (aliasCommands.length >= remaining) break;
    if (builtinSet.has(entry.alias)) continue;
    aliasCommands.push({
      command: entry.alias,
      description: entry.title.slice(0, 250),
    });
  }
  return [...BUILTIN_BOT_COMMANDS, ...aliasCommands];
}
