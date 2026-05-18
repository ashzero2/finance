import { NextRequest, NextResponse } from "next/server";

/**
 * Lightweight proxy — checks for session cookie only.
 * Full session validation happens in server components / API routes.
 * This avoids importing the DB/auth module in the proxy worker.
 */
export function proxy(request: NextRequest) {
  const sessionCookie = request.cookies.get("better-auth.session_token");
  const hasSession = !!sessionCookie?.value;
  const { pathname } = request.nextUrl;

  // Auth pages — redirect to dashboard if already logged in
  if (pathname === "/login" || pathname === "/register") {
    if (hasSession) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Protected routes — redirect to login if not authenticated
  if (!hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/portfolio/:path*",
    "/cashflow/:path*",
    "/goals/:path*",
    "/calendar/:path*",
    "/insights/:path*",
    "/settings/:path*",
    "/onboarding/:path*",
    "/login",
    "/register",
  ],
};