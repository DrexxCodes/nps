import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/constants";

/** Cheap optimistic redirect only. Real authorization happens server-side on every page and route. */
export function proxy(req: NextRequest) {
  if (!req.cookies.get(SESSION_COOKIE)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*", "/admin/:path*", "/staff/:path*", "/items/:path*"] };
