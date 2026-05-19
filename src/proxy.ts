import { NextRequest, NextResponse } from "next/server";

/**
 * Next.js 16 Proxy (replaces middleware.ts).
 * Handles auth redirects and security headers.
 * Full session validation happens in API routes via better-auth.
 */
export function proxy(request: NextRequest) {
  // better-auth uses __Secure- prefix in production (HTTPS)
  const sessionCookie =
    request.cookies.get("__Secure-better-auth.session_token") ??
    request.cookies.get("better-auth.session_token");
  const hasSession = !!sessionCookie?.value;
  const { pathname } = request.nextUrl;

  // ── Auth pages ──
  if (pathname === "/login" || pathname === "/register") {
    if (hasSession) {
      return addSecurityHeaders(NextResponse.redirect(new URL("/dashboard", request.url)));
    }
    return addSecurityHeaders(NextResponse.next());
  }

  // ── Root page ──
  if (pathname === "/") {
    if (hasSession) {
      return addSecurityHeaders(NextResponse.redirect(new URL("/dashboard", request.url)));
    }
    return addSecurityHeaders(NextResponse.redirect(new URL("/login", request.url)));
  }

  // ── Protected API routes (not auth endpoints) ──
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth/")) {
    if (!hasSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return addSecurityHeaders(NextResponse.next());
  }

  // ── Protected pages ──
  if (!hasSession) {
    return addSecurityHeaders(NextResponse.redirect(new URL("/login", request.url)));
  }

  return addSecurityHeaders(NextResponse.next());
}

/**
 * Add security headers to all responses.
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Prevent clickjacking
  response.headers.set("X-Frame-Options", "DENY");
  // Prevent MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");
  // XSS protection (legacy browsers)
  response.headers.set("X-XSS-Protection", "1; mode=block");
  // Referrer policy
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  // Permissions policy
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  return response;
}

export const config = {
  matcher: [
    "/",
    "/dashboard",
    "/dashboard/:path*",
    "/portfolio",
    "/portfolio/:path*",
    "/cashflow",
    "/cashflow/:path*",
    "/goals",
    "/goals/:path*",
    "/calendar",
    "/calendar/:path*",
    "/insights",
    "/insights/:path*",
    "/settings",
    "/settings/:path*",
    "/onboarding",
    "/onboarding/:path*",
    "/login",
    "/register",
    "/api/:path*",
  ],
};
