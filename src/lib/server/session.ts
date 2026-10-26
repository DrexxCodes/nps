import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/constants";
import { isAccountBlocked, resolveRole } from "@/lib/roles";
import type { Role, SessionUser } from "@/types";
import { adminAuth } from "./firebase-admin";
import { AppError } from "./errors";
import { loadUserForSession } from "./shared-user";

async function resolveFromToken(sessionCookie: string | undefined): Promise<SessionUser | null> {
  if (!sessionCookie) return null;
  try {
    const decoded = await adminAuth().verifySessionCookie(sessionCookie, true);
    // users/{uid} is shared with DARS. loadUserForSession completes accounts DARS created, and resolveRole combines
    // NPS's `role` with DARS's `admin` flag (any DARS admin is an NPS Admin). Never read `data.role` directly for access decisions.
    const data = await loadUserForSession(decoded.uid);
    if (!data || isAccountBlocked(data)) return null;
    return { uid: decoded.uid, role: resolveRole(data), email: decoded.email ?? null };
  } catch {
    return null;
  }
}

/** For server components. Memoized per request. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  return resolveFromToken(jar.get(SESSION_COOKIE)?.value);
});

/** For route handlers. Throws UNAUTHORIZED / FORBIDDEN. */
export async function requireUser(req: Request, roles?: Role[]): Promise<SessionUser> {
  const raw = req.headers.get("cookie")?.split(/;\s*/).find((c) => c.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  const user = await resolveFromToken(raw ? decodeURIComponent(raw) : undefined);
  if (!user) throw new AppError("UNAUTHORIZED");
  if (roles && !roles.includes(user.role)) throw new AppError("FORBIDDEN");
  return user;
}

/** For protected pages. Redirects anonymous users; returns null-safe user or renders forbidden via redirect. */
export async function requirePageUser(roles?: Role[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (roles && !roles.includes(user.role)) redirect("/forbidden");
  return user;
}

export const ADMIN_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN"];
export const OPS_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "STAFF"];
