# Finance App — Security & UX Audit

**Date:** 20 May 2026

---

## SECURITY ISSUES

### Critical

**1. ✅ FIXED — Simple Auth Token Not Validated — Cookie Bypass**  
`src/proxy.ts:93` — The proxy only checks if the cookie *exists*, not if its *value* is correct:
```typescript
const hasSimpleToken = !!request.cookies.get("simple-auth-token")?.value;
```
Anyone can set `simple-auth-token=garbage` in their browser and bypass the password gate entirely. You need to verify the token matches `generateToken(password)`.

**2. ✅ FIXED — Onboarding Endpoint Skips Input Validation**  
`src/app/api/onboarding/route.ts:28` — The POST handler uses raw `request.json()` without running it through the `onboardingSchema` Zod validator that already exists in `validations.ts`. This allows malformed/malicious data into your DB (e.g., excessively long strings, negative amounts that bypass `Math.abs`, or prototype pollution via object keys).

**3. No CSRF Protection on Mutating Endpoints**  
All POST/PUT/DELETE routes accept requests with only a session cookie. A malicious site could submit a form targeting your API (e.g., `POST /api/assets`) and the browser would attach the cookie automatically. Add `SameSite=Strict` for auth cookies, or require a custom header (e.g., `X-Requested-With`) that cross-origin forms can't set.

### High

**4. IP Spoofing via `x-forwarded-for`**  
`src/proxy.ts:56` — Rate limiting trusts the `x-forwarded-for` header directly. Without a trusted proxy list, attackers can rotate this header to bypass rate limits. If behind Caddy (your `Caddyfile.example`), only trust the last hop or use Caddy's `{remote_host}`.

**5. ✅ FIXED — Missing Content-Security-Policy Header**  
`src/proxy.ts:173` — Security headers include `X-Frame-Options`, `X-Content-Type-Options`, etc., but no `Content-Security-Policy`. This leaves the app vulnerable to XSS via injected scripts. Add at minimum:
```
default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' https://fonts.gstatic.com;
```

**6. In-Memory Rate Limiter Doesn't Survive Restarts or Scale**  
`src/proxy.ts:7` — The `Map`-based rate limiter resets on every deployment/restart and doesn't work across multiple instances. For a personal app this is low-risk, but auth brute-force protection is effectively illusory in production.

**7. ✅ FIXED — Fixed Salt in Token Generation**  
`src/app/api/simple-auth/route.ts:43` — `generateToken` uses a hardcoded salt (`":simple-auth-salt-finance"`). If an attacker learns the password, the token is fully deterministic and never rotates. Add a server-side random secret (e.g., `BETTER_AUTH_SECRET`) to the hash input.

### Medium

**8. No `path` Restriction on Better Auth Session Cookie**  
The Better Auth session cookie is available on all paths including `/api/simple-auth`. If any path has XSS, the cookie is exposed.

**9. `DATABASE_URL!` Non-Null Assertion**  
`src/lib/db/index.ts:5` — If `DATABASE_URL` is missing, the app crashes with an unhelpful error. Add a startup check with a clear message.

**10. Secrets Possibly Leaked in Docker Build Layer**  
`Dockerfile:20-21` — `NEXT_PUBLIC_APP_URL` is passed as a build ARG and baked into the image. While public env vars are fine, ensure no secrets end up as build args (they're visible in `docker history`).

---

## BUGS

**1. ✅ FIXED — Dead Query Variable in Transactions GET**  
`src/app/api/transactions/route.ts:16` — `let query = db.select()...` is assigned but never used; the real query is built separately below it. Dead code.

**2. Conditional Hook Call in `useAppSession`**  
`src/lib/use-session.ts:32-39` — `useBetterAuthSession()` is called conditionally based on `authMode`. This violates React's Rules of Hooks. It works because `authMode` is static per build, but a linting error is suppressed (`eslint-disable-next-line`) rather than fixed. A cleaner approach: two separate modules or a wrapper that always calls both and returns the relevant one.

**3. ✅ FIXED — `generateInsights` Deletes All User Insights Before Regenerating**  
`src/lib/insights.ts:33` — Every call to `generateInsights` wipes all existing insights (including user's read/dismissed state), then recreates them. If a user dismisses an insight, it reappears on next generation.

**4. ✅ FIXED — Settings PUT Passes `undefined` Fields to Drizzle**  
`src/app/api/settings/route.ts:31` — When only `theme` is provided, other fields like `currency` become `undefined` in the `.set()` call. Drizzle may overwrite DB values with `NULL` depending on version. Filter out `undefined` values before calling `.set()`.

**5. ✅ FIXED — Sidebar Uses `<a>` Instead of Next.js `<Link>`**  
`src/components/layout/sidebar.tsx:61` — Anchor tags cause full page reloads on every navigation, losing client-side state and causing unnecessary re-renders. Same issue in `src/components/layout/bottom-nav.tsx`.

**6. `formatINR` Always Used Regardless of Currency Setting**  
`src/lib/utils.ts` — The utility only has `formatINR`. Even if a user selects USD/EUR/GBP in settings, all amounts are still displayed as ₹ with Indian grouping.

---

## UI/UX ISSUES & SUGGESTIONS

### Issues

| # | Issue | Location |
|---|-------|----------|
| 1 | **✅ FIXED — `userScalable: false`** prevents users from pinch-zooming — accessibility violation (WCAG 1.4.4) | `src/app/layout.tsx:50` |
| 2 | **No error boundaries** — any component crash kills the entire app with a white screen | App-wide |
| 3 | **No confirmation dialog before delete operations** — accidental taps on mobile delete assets/transactions permanently | Portfolio, Cashflow pages |
| 4 | **Transactions limited to 100 with no pagination** — users who log daily will lose visibility after ~3 months | `src/app/api/transactions/route.ts:34` |
| 5 | **✅ FIXED — No loading skeletons** — replaced with shimmer skeleton placeholders on all pages | Dashboard, Portfolio, etc. |
| 6 | **✅ FIXED — All styles are inline** — added global CSS hover/focus states, focus-visible outlines, input hover borders | All pages |
| 7 | **✅ FIXED — No undo/undo-toast after destructive actions** — toast now shows Undo button for 5 seconds after delete | Goals, Portfolio, Cash Flow |

### Suggestions & Enhancements

| # | Suggestion | Priority |
|---|-----------|----------|
| 1 | **✅ FIXED — Add `<Link>` from `next/link`** for all navigation — enables client-side transitions, prefetching, and preserves state | High |
| 2 | **Multi-currency support** — honor the user's currency setting for formatting; use `Intl.NumberFormat` with the stored currency | High |
| 3 | **Add React Error Boundaries** wrapping each page route to gracefully handle crashes | High |
| 4 | **Add pagination or infinite scroll** for transactions with a cursor-based approach | Medium |
| 5 | **Add a "confirm delete" dialog** (you already have `confirm-dialog.tsx` in `ui/`) for destructive actions | Medium |
| 6 | **Pull-to-refresh on mobile** or a visible "last synced" timestamp so users trust data freshness | Medium |
| 7 | **Offline mode** — the PWA manifest and service worker exist but `sw.js` is minimal; cache API responses for offline viewing | Medium |
| 8 | **Data export** — add CSV/JSON export for transactions and net-worth history (useful for tax filing in India) | Medium |
| 9 | **Recurring transaction auto-generation** — `recurringTransactions` table exists but no cron/scheduled logic generates entries | Medium |
| 10 | **Calendar page** — route exists but appears to be empty/placeholder; integrate EMI due dates and recurring transaction calendar | Low |
| 11 | **Add skeleton loading states** with CSS shimmer animations matching your existing design tokens | Low |
| 12 | **Two-user support** — since this is for you and your wife, consider a "family" mode with shared vs. personal views | Low |
| 13 | **✅ FIXED — Remove `userScalable: false`** — let users zoom; this also improves iOS accessibility compliance | Low |
| 14 | **Add `rel="noopener"` to external links** and consider `<meta name="robots" content="noindex">` since this is private | Low |

---

## Summary of Most Impactful Fixes

1. **Validate the simple-auth cookie value** in the proxy (not just existence)
2. **Use Zod validation** in the onboarding endpoint
3. **Switch `<a>` to `<Link>`** in sidebar/bottom-nav for proper SPA navigation
4. **Fix `generateInsights`** to not delete dismissed/read insights
5. **Add CSP header** to the security headers function
6. **Remove `userScalable: false`** from viewport

---

The app is well-structured overall — clean separation between auth modes, good use of Zod validation on most routes, proper user-scoped queries with `userId` checks, and a solid deployment setup. The issues above are the gaps to close.
