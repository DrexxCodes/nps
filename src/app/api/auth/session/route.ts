import { cookies } from "next/headers";
import { z } from "zod";
import { SESSION_COOKIE, SESSION_MAX_AGE_MS } from "@/constants";
import { adminAuth } from "@/lib/server/firebase-admin";
import { AppError, ok, route } from "@/lib/server/errors";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import { isAccountBlocked } from "@/lib/roles";
import { loadUserForSession } from "@/lib/server/shared-user";

/** Exchanges a fresh Firebase ID token for an httpOnly session cookie. */
export const POST = route(async (req: Request) => {
  rateLimit(`session:${clientIp(req)}`, 20, 60_000);
  const { idToken } = z.object({ idToken: z.string().min(20) }).parse(await req.json());
  const decoded = await adminAuth().verifyIdToken(idToken, true);
  if (Date.now() / 1000 - decoded.auth_time > 300) throw new AppError("UNAUTHORIZED");
  // Same Firebase Auth user as DARS: refuse banned/suspended accounts here instead of issuing a cookie that every page then rejects.
  const profile = await loadUserForSession(decoded.uid);
  if (!profile) throw new AppError("FORBIDDEN", undefined, "Account profile not found. Please contact an administrator.");
  if (isAccountBlocked(profile)) throw new AppError("FORBIDDEN", undefined, "This account has been suspended.");
  const value = await adminAuth().createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_MS });
  (await cookies()).set(SESSION_COOKIE, value, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_MAX_AGE_MS / 1000 });
  return ok({});
});

export const DELETE = route(async () => {
  (await cookies()).delete(SESSION_COOKIE);
  return ok({});
});
