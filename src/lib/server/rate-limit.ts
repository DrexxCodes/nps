import "server-only";
import { AppError } from "./errors";

/**
 * Best-effort in-memory limiter (per serverless instance). Good enough to blunt abuse of
 * enrollment/login-adjacent routes; swap for Upstash/Redis for strict global limits.
 */
const hits = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.reset < now) {
    hits.set(key, { count: 1, reset: now + windowMs });
    if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
    return;
  }
  if (++entry.count > limit) throw new AppError("RATE_LIMITED");
}

export const clientIp = (req: Request): string => req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
