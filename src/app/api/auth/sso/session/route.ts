import type { NextResponse } from "next/server";
import { AppError, ok, route } from "@/lib/server/errors";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import { requireUser } from "@/lib/server/session";
import { clearSsoCookies, isSameOrigin, issueSsoCookies, type CookieSpec } from "@/lib/sso/cookies";
import { ssoEnabled } from "@/lib/sso/token";

export const runtime = "nodejs";

const withCookies = (res: NextResponse, specs: CookieSpec[]) => {
  for (const c of specs) res.cookies.set(c.name, c.value, c.options);
  res.headers.set("Cache-Control", "no-store");
  return res;
};

/** POST: record that this browser is signed in to NPS. Authenticated by the NPS session cookie (covers sessions that predate SSO). */
export const POST = route(async (req: Request) => {
  if (!ssoEnabled()) return ok({ enabled: false });
  if (!isSameOrigin(req)) throw new AppError("FORBIDDEN");
  rateLimit(`sso-sync:${clientIp(req)}`, 30, 60_000);
  const user = await requireUser(req);
  return withCookies(ok({}), issueSsoCookies(req, user.uid));
});

/** DELETE: forget NPS in this browser's SSO record (sign-out). Needs no credential, and only removes things. */
export const DELETE = route(async (req: Request) => {
  if (!isSameOrigin(req)) throw new AppError("FORBIDDEN");
  return withCookies(ok({}), clearSsoCookies(req));
});
