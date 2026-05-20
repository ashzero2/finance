import { NextRequest, NextResponse } from "next/server";

const SIMPLE_PASSWORD = process.env.SIMPLE_AUTH_PASSWORD || "";
const COOKIE_NAME = "simple-auth-token";
// 30 days in seconds
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

/**
 * POST /api/simple-auth — validate password and set cookie
 */
export async function POST(request: NextRequest) {
  if (process.env.AUTH_MODE !== "simple" || !SIMPLE_PASSWORD) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  try {
    const { password } = await request.json();

    if (password !== SIMPLE_PASSWORD) {
      return NextResponse.json({ error: "Wrong password" }, { status: 401 });
    }

    // Create a simple token (hash of password + a fixed salt to avoid storing plaintext)
    const token = await generateToken(SIMPLE_PASSWORD);

    const response = NextResponse.json({ success: true });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

/**
 * DELETE /api/simple-auth — clear the cookie (logout)
 */
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}

async function generateToken(password: string): Promise<string> {
  const secret = process.env.BETTER_AUTH_SECRET || "default-secret";
  const encoder = new TextEncoder();
  const data = encoder.encode(password + ":" + secret + ":simple-auth-finance");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
