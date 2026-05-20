import { db } from "./db";
import { user } from "./db/schema";
import { eq } from "drizzle-orm";
import {
  DEFAULT_USER_ID,
  DEFAULT_USER_NAME,
  DEFAULT_USER_EMAIL,
} from "./auth-mode";

/**
 * Ensure the default user row exists in the database.
 * Called once at startup (from instrumentation.ts) when AUTH_MODE=simple.
 */
export async function ensureDefaultUser(): Promise<void> {
  const existing = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, DEFAULT_USER_ID))
    .limit(1);

  if (existing.length > 0) {
    console.log("[simple-auth] default user already exists");
    return;
  }

  await db.insert(user).values({
    id: DEFAULT_USER_ID,
    name: DEFAULT_USER_NAME,
    email: DEFAULT_USER_EMAIL,
    emailVerified: true,
  });

  console.log("[simple-auth] created default user:", DEFAULT_USER_EMAIL);
}

/** Session shape returned by simple auth (mirrors Better Auth's session shape) */
export interface SimpleSession {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  session: {
    id: string;
    token: string;
    expiresAt: Date;
    userId: string;
  };
}

/**
 * Returns a static session for the default user.
 * No cookies or tokens needed — there's only one user.
 */
export function getSimpleSession(): SimpleSession {
  const now = new Date();
  const farFuture = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  return {
    user: {
      id: DEFAULT_USER_ID,
      name: DEFAULT_USER_NAME,
      email: DEFAULT_USER_EMAIL,
      image: null,
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    },
    session: {
      id: "simple-session",
      token: "simple-token",
      expiresAt: farFuture,
      userId: DEFAULT_USER_ID,
    },
  };
}