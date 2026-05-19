import { NextRequest, NextResponse } from "next/server";

// ── In-memory rate limiter ──
// Tracks request counts per IP per route group. Resets automatically via sliding window.
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Auth endpoints: 10 attempts per 15 minutes (brute force protection)
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 10 },
  // Expensive operations: 5 per minute
  expensive: { windowMs: 60 * 1000, maxRequests: 5 },
  // General API: 60 per minute
  api: { windowMs: 60 * 1000, maxRequests: 60 },
};

function checkRateLimit(key: string, config: RateLimitConfig): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetIn: config.windowMs };
  }

  entry.count++;
  const remaining = Math.max(0, config.maxRequests - entry.count);
  const resetIn = entry.resetAt - now;

  if (entry.count > config.maxRequests) {
    return { allowed: false, remaining: 0, resetIn };
  }

  return { allowed: true, remaining, resetIn };
}

// Clean up stale entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore) {
      if (now > entry.resetAt) rateLimitStore.delete(key);
    }
  }, 5 * 60 * 1000);
}

function getClientIP(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
}

/**
 * Next.js 16 Proxy (replaces middleware.ts).
 * Handles auth redirects, security headers, and rate limiting.
 * Full session validation happens in API routes via better-auth.
 */
export async function proxy(request: NextRequest) {
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
    // Block registration if ALLOWED_EMAILS is set and registration is restricted
    if (pathname === "/register") {
      const allowedEmails = process.env.ALLOWED_EMAILS;
      if (allowedEmails === "DISABLED") {
        return addSecurityHeaders(NextResponse.redirect(new URL("/login", request.url)));
      }
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

  // ── Registration restriction on auth API ──
  if (pathname.startsWith("/api/auth/") && request.method === "POST") {
    // Check if this is a sign-up request and enforce allowed emails
    const allowedEmails = process.env.ALLOWED_EMAILS;
    if (allowedEmails && allowedEmails !== "DISABLED") {
      // Clone the request to read body without consuming it
      try {
        const cloned = request.clone();
        const body = await cloned.json();
        if (body?.email && pathname.includes("sign-up")) {
          const allowed = allowedEmails.split(",").map(e => e.trim().toLowerCase());
          if (!allowed.includes(String(body.email).toLowerCase())) {
            return addSecurityHeaders(
              NextResponse.json({ error: "Registration is restricted. Contact the admin." }, { status: 403 })
            );
          }
        }
      } catch {
        // If we can't parse the body, let it through (auth handler will validate)
      }
    } else if (allowedEmails === "DISABLED") {
      if (pathname.includes("sign-up")) {
        return addSecurityHeaders(
          NextResponse.json({ error: "Registration is currently disabled." }, { status: 403 })
        );
      }
    }
  }

  // ── Rate limiting for auth endpoints ──
  if (pathname.startsWith("/api/auth/")) {
    const ip = getClientIP(request);
    const { allowed, remaining, resetIn } = checkRateLimit(`auth:${ip}`, RATE_LIMITS.auth);
    if (!allowed) {
      const res = NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
      res.headers.set("Retry-After", String(Math.ceil(resetIn / 1000)));
      res.headers.set("X-RateLimit-Remaining", "0");
      return addSecurityHeaders(res);
    }
    const res = addSecurityHeaders(NextResponse.next());
    res.headers.set("X-RateLimit-Remaining", String(remaining));
    return res;
  }

  // ── Protected API routes ──
  if (pathname.startsWith("/api/")) {
    if (!hasSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit expensive operations
    const isExpensive = pathname === "/api/snapshots" || pathname === "/api/insights";
    if (isExpensive && request.method === "POST") {
      const ip = getClientIP(request);
      const { allowed, remaining, resetIn } = checkRateLimit(`expensive:${ip}`, RATE_LIMITS.expensive);
      if (!allowed) {
        const res = NextResponse.json(
          { error: "Rate limit exceeded. Please wait before trying again." },
          { status: 429 }
        );
        res.headers.set("Retry-After", String(Math.ceil(resetIn / 1000)));
        return addSecurityHeaders(res);
      }
    }

    // General API rate limit
    const ip = getClientIP(request);
    const { allowed, remaining } = checkRateLimit(`api:${ip}`, RATE_LIMITS.api);
    if (!allowed) {
      return addSecurityHeaders(
        NextResponse.json({ error: "Too many requests" }, { status: 429 })
      );
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
