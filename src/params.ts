import type { ToolInput, ToolMeta } from "./celina-api.js";
import { isWalletField } from "./constants.js";
import { shortenAddress } from "./format/escape.js";

export function applySavedAddress(
  inputs: ToolInput[],
  params: Record<string, unknown>,
  saved?: string,
): Record<string, unknown> {
  if (!saved) return { ...params };
  const next = { ...params };
  for (const input of inputs) {
    if (isWalletField(input.name) && (next[input.name] === undefined || next[input.name] === "")) {
      next[input.name] = saved;
    }
  }
  return next;
}

export function missingRequiredFields(
  inputs: ToolInput[],
  params: Record<string, unknown>,
): ToolInput[] {
  return inputs.filter((input) => {
    if (!input.required) return false;
    const value = params[input.name];
    return value === undefined || value === "";
  });
}

export function remainingOptionalFields(
  inputs: ToolInput[],
  params: Record<string, unknown>,
): ToolInput[] {
  return inputs.filter((input) => {
    if (input.required) return false;
    const value = params[input.name];
    return value === undefined || value === "";
  });
}

export function fieldQueue(tool: ToolMeta, params: Record<string, unknown>): string[] {
  const required = missingRequiredFields(tool.inputs, params).map((input) => input.name);
  if (required.length === 0) return [];
  const optional = remainingOptionalFields(tool.inputs, params).map((input) => input.name);
  return [...required, ...optional];
}

export function usingSavedNote(
  tool: ToolMeta,
  params: Record<string, unknown>,
  saved?: string,
): string | undefined {
  if (!saved) return undefined;
  const used = tool.inputs.some(
    (input) => isWalletField(input.name) && params[input.name] === saved,
  );
  if (!used) return undefined;
  return `(using saved address ${shortenAddress(saved)})`;
}
