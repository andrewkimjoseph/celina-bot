import { CELINA_CLIENT_ID } from "./constants.js";
import { DEFAULT_CELINA_API_BASE_URL, type BotEnv } from "./env.js";

export type ToolInput = {
  name: string;
  type: string;
  required: boolean;
  description: string;
};

export type ToolMeta = {
  name: string;
  title: string;
  description: string;
  inputs: ToolInput[];
};

export type CelinaError = {
  error: string;
  status: number;
};

export function apiBase(env: BotEnv): string {
  return (env.CELINA_API_BASE_URL ?? DEFAULT_CELINA_API_BASE_URL).replace(/\/$/, "");
}

function clientHeaders(extra?: Record<string, string>): Record<string, string> {
  return { "X-Celina-Client": CELINA_CLIENT_ID, ...extra };
}

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { error: text };
  }
}

export async function listTools(env: BotEnv): Promise<ToolMeta[]> {
  const res = await fetch(`${apiBase(env)}/v1/tools`, {
    headers: clientHeaders(),
  });
  const body = (await readJson(res)) as { tools?: ToolMeta[]; error?: string };
  if (!res.ok) {
    throw new Error(body.error ?? `Failed to list tools (${res.status})`);
  }
  return body.tools ?? [];
}

export async function getTool(env: BotEnv, name: string): Promise<ToolMeta | undefined> {
  const res = await fetch(`${apiBase(env)}/v1/${encodeURIComponent(name)}`, {
    headers: clientHeaders(),
  });
  if (res.status === 404) return undefined;
  const body = (await readJson(res)) as ToolMeta & { error?: string };
  if (!res.ok) {
    throw new Error(body.error ?? `Failed to load tool ${name} (${res.status})`);
  }
  return body;
}

export async function invokeTool(
  env: BotEnv,
  name: string,
  params: Record<string, unknown>,
): Promise<{ ok: true; result: unknown } | { ok: false; error: string; status: number }> {
  const res = await fetch(`${apiBase(env)}/v1/${encodeURIComponent(name)}`, {
    method: "POST",
    headers: clientHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(params),
  });
  const body = (await readJson(res)) as { error?: string } & Record<string, unknown>;
  if (!res.ok) {
    return {
      ok: false,
      error: typeof body.error === "string" ? body.error : `HTTP ${res.status}`,
      status: res.status,
    };
  }
  return { ok: true, result: body };
}
