import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth, db } from "@/lib/server/firebase-admin";
import { AppError, ok, route } from "@/lib/server/errors";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import { loadUserForSession } from "@/lib/server/shared-user";
import { isAccountBlocked } from "@/lib/roles";
import { PLATFORMS, SELF, isPlatformId, otherPlatformIds, ssoCookieName, type PlatformId, type SsoOffer } from "@/lib/sso/platforms";
import { isSameOrigin, readCookie } from "@/lib/sso/cookies";
import { issuedBeforeRevocation, ssoEnabled, verifySsoToken } from "@/lib/sso/token";

export const runtime = "nodejs";

/** "Signed in to <from> as <uid>" -> that Auth user, if the cookie is genuine, unexpired and not revoked. */
async function sessionUid(req: Request, from: PlatformId): Promise<string | null> {
  const claims = verifySsoToken(readCookie(req, ssoCookieName(from)), from);
  if (!claims) return null;
  const record = await adminAuth().getUser(claims.uid).catch(() => null);
  if (!record || record.disabled || issuedBeforeRevocation(record.tokensValidAfterTime, claims.iat)) return null;
  return claims.uid;
}

const noStore = <T extends NextResponse>(res: T): T => { res.headers.set("Cache-Control", "no-store"); return res; };

/** GET /api/auth/sso: is this browser signed in to the other platform? Only called when the readable hint cookie says so. */
export const GET = route(async (req: Request) => {
  // No CORS headers are sent, so a page on another site can't read this answer even if it makes the request.
  if (!ssoEnabled()) return noStore(ok({ offer: null }));
  rateLimit(`sso-peek:${clientIp(req)}`, 60, 60_000);
  for (const id of otherPlatformIds()) {
    const uid = await sessionUid(req, id);
    if (!uid) continue;
    const data = (await db().doc(`users/${uid}`).get()).data();
    if (!data || isAccountBlocked(data)) continue; // a plain read: peeking must not create an NPS profile
    const full = String(data.fullName ?? data.name ?? "").trim();
    const offer: SsoOffer = { id, name: PLATFORMS[id].name, firstName: full.split(/\s+/)[0] || "there" };
    return noStore(ok({ offer }));
  }
  return noStore(ok({ offer: null }));
});

/** POST /api/auth/sso { from }: trade the other platform's SSO cookie for a Firebase custom token to sign in with here. */
export const POST = route(async (req: Request) => {
  if (!ssoEnabled()) throw new AppError("SSO_DISABLED", undefined, "Single sign-in isn't set up.");
  if (!isSameOrigin(req)) throw new AppError("FORBIDDEN");
  rateLimit(`sso:${clientIp(req)}`, 15, 60_000);
  const { from } = z.object({ from: z.string().refine((v) => isPlatformId(v) && v !== SELF) }).parse(await req.json().catch(() => ({})));
  const platform = from as PlatformId;

  const uid = await sessionUid(req, platform);
  if (!uid) throw new AppError("UNAUTHORIZED", undefined, `Your ${PLATFORMS[platform].name} session has ended. Please sign in here.`);
  // Completes an account DARS created (username etc.) and refuses banned/suspended ones; the same call every NPS sign-in makes.
  const profile = await loadUserForSession(uid);
  if (!profile) throw new AppError("FORBIDDEN", undefined, "Account profile not found. Please contact an administrator.");
  if (isAccountBlocked(profile)) throw new AppError("FORBIDDEN", undefined, "This account has been suspended.");

  return noStore(ok({ token: await adminAuth().createCustomToken(uid) }));
});
