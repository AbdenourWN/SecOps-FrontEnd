import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Next 16 renamed `middleware` → `proxy`. Optimistic auth gate (Phase 20.1):
// redirect page navigations to /login when the access-token cookie is absent.
// This is a fast-path only — the client AuthGate + backend 401s are authoritative
// (and on a cross-domain deploy the cookie may not be visible here, which is fine).

const PUBLIC_PREFIXES = ["/login"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  if (!request.cookies.has("access_token")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on page routes only — exclude API, Next internals, and static assets.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|logo.webp|.*\\.png$).*)"],
};
