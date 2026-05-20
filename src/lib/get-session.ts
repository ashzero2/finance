import { NextRequest } from "next/server";
import { isSimpleAuth } from "./auth-mode";

/**
 * Unified server-side session helper.
 *
 * In "better-auth" mode → delegates to Better Auth's getSession.
 * In "simple" mode      → returns the static default user session.
 *
 * Usage in API routes:
 *   const session = await getAppSession(request);
 *   if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 *   const userId = session.user.id;
 */
export async function getAppSession(request: NextRequest) {
  if (isSimpleAuth) {
    const { getSimpleSession } = await import("./simple-auth");
    return getSimpleSession();
  }

  // Dynamic import so Better Auth is never loaded in simple mode
  const { auth } = await import("./auth");
  return auth.api.getSession({ headers: request.headers });
}