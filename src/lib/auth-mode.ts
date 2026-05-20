/**
 * Auth mode configuration.
 *
 * Set AUTH_MODE in your .env to control the authentication strategy:
 *   - "better-auth" (default) — Full Better Auth flow with login/register
 *   - "simple"               — No login UI; a default user is auto-created
 *
 * In simple mode you can optionally set:
 *   - DEFAULT_USER_NAME  (defaults to "User")
 *   - DEFAULT_USER_EMAIL (defaults to "user@localhost")
 */

export type AuthMode = "better-auth" | "simple";

export const AUTH_MODE: AuthMode =
  (process.env.AUTH_MODE as AuthMode) === "simple" ? "simple" : "better-auth";

export const isSimpleAuth = AUTH_MODE === "simple";

/** Deterministic ID for the default simple-auth user */
export const DEFAULT_USER_ID = "default-local-user";
export const DEFAULT_USER_NAME = process.env.DEFAULT_USER_NAME || "User";
export const DEFAULT_USER_EMAIL = process.env.DEFAULT_USER_EMAIL || "user@localhost";