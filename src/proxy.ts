import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/constants";
import { buildCsp, makeNonce } from "@/lib/csp";

const PROTECTED = ["/dashboard", "/admin", "/staff", "/items"];
const isProtected = (path: string) => PROTECTED.some((p) => path === p || path.startsWith(`${p}/`));

/**
 * 1. Cheap optimistic redirect for signed-out visitors on protected areas. Real authorization happens server-side on every page and route.
 * 2. A per-request Content-Security-Policy with a nonce on every page. Set CSP_REPORT_ONLY=1 to log violations in the browser console
 *    without blocking anything (useful when trying a new integration).
 */
export function proxy(req: NextRequest) {
  if (isProtected(req.nextUrl.pathname) && !req.cookies.get(SESSION_COOKIE)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  const nonce = makeNonce();
  const header = process.env.CSP_REPORT_ONLY === "1" ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy";
  const csp = buildCsp(nonce, { dev: process.env.NODE_ENV !== "production", authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN });

  // Next reads the nonce from the request's CSP header and stamps it on its own scripts; layout.tsx reads x-nonce for ours.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set(header, csp);
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set(header, csp);
  return res;
}

// Pages only: APIs return JSON, and static assets / the service worker need no policy. Prefetches are skipped (they never render).
export const config = {
  matcher: [{
    source: "/((?!api|_next/static|_next/image|favicon.ico|favicon-32.png|apple-touch-icon.png|icons|images|napss.png|404.svg|sw.js|manifest.webmanifest).*)",
    missing: [{ type: "header", key: "next-router-prefetch" }, { type: "header", key: "purpose", value: "prefetch" }],
  }],
};
