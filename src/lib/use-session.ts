"use client";

import { useSession as useBetterAuthSession } from "./auth-client";

const authMode = process.env.NEXT_PUBLIC_AUTH_MODE || "better-auth";

/** Static session data for simple auth mode */
const SIMPLE_SESSION = {
  user: {
    id: "default-local-user",
    name: process.env.NEXT_PUBLIC_DEFAULT_USER_NAME || "User",
    email: "user@localhost",
    image: null as string | null,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  session: {
    id: "simple-session",
    token: "simple-token",
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    userId: "default-local-user",
  },
};

/**
 * Unified client-side session hook.
 *
 * In "better-auth" mode → delegates to Better Auth's useSession hook.
 * In "simple" mode      → returns a static session (always authenticated).
 */
export function useAppSession() {
  if (authMode === "simple") {
    return {
      data: SIMPLE_SESSION,
      isPending: false,
      error: null,
    };
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useBetterAuthSession();
}