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

  // Root page — redirect based on auth status
  if (pathname === "/") {
    if (hasSession) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Protected routes — redirect to login if not authenticated
  if (!hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
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
  ],
};
