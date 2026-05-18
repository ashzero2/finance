import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function proxy(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const { pathname } = request.nextUrl;

  // Auth pages — redirect to dashboard if already logged in
  if (pathname === "/login" || pathname === "/register") {
    if (session) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Protected routes — redirect to login if not authenticated
  if (!session) {
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