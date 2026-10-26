import type { ApiResult } from "@/types";

/** Thin fetch wrapper that always resolves to the standard envelope (never throws on HTTP errors). */
export async function api<T extends object = object>(path: string, init?: RequestInit & { json?: unknown }): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, {
      ...init,
      headers: { ...(init?.json !== undefined ? { "Content-Type": "application/json" } : {}), ...init?.headers },
      body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
      credentials: "same-origin",
    });
    return (await res.json()) as ApiResult<T>;
  } catch {
    return { ok: false, code: "NETWORK", message: "You appear to be offline. Check your connection and try again." };
  }
}
