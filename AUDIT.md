# Finance App — Security & UX Audit

## Security Issues

### Critical

**1. Middleware/Proxy is completely inactive**
`src/proxy.ts` defines auth redirect logic with a `config.matcher`, but there is **no `middleware.ts` file** in the project. This means:
- Protected routes (`/dashboard`, `/portfolio`, etc.) are accessible to unauthenticated users at the server level
- The client-side redirect in `(app)/layout.tsx` only kicks in after the page renders
- Direct API access from tools like `curl` is protected (auth checks in each route), but the HTML/JS is served regardless

**2. No input validation on API routes (Zod is unused)**
You have `zod` as a dependency but never use it. Every API route blindly trusts `request.json()`:
- `src/app/api/assets/route.ts` — `body.name`, `body.category` etc. taken directly without schema validation
- `src/app/api/transactions/route.ts` — `body.type` could be anything
- `src/app/api/settings/route.ts` — `body.theme` could be an invalid enum value causing DB errors
- Malformed JSON body (`request.json()` throws) is unhandled in most routes — results in 500 errors with stack traces

**3. No rate limiting**
No rate limiting on login, registration, or insight generation endpoints. Vulnerable to:
- Brute force password attacks
- DoS via repeated `POST /api/snapshots` or `POST /api/insights` (expensive DB operations)

**4. Open registration — no access control**
For an app meant for just you and your wife, anyone who finds the URL can register and create an account. There's no invite system, allowed-email list, or registration lock.

### High

**5. Service Worker caches sensitive financial data**
`public/sw.js` caches ALL successful API GET responses. After logout, cached financial data (net worth, transactions, goals) remains accessible in the browser cache.

**6. No security headers**
No `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, or `Strict-Transport-Security` headers configured. The app can be embedded in iframes (clickjacking risk).

**7. No CSRF protection for mutations**
POST/PUT/DELETE endpoints rely solely on session cookies. Better Auth's cookie-based auth is vulnerable to CSRF unless SameSite is `Strict` (it defaults to `Lax` which still allows top-level navigations).

### Medium

**8. `generateInsights()` deletes ALL insights destructively**
`src/lib/insights.ts` — Line `await db.delete(insights).where(eq(insights.userId, userId))` wipes ALL insights including snapshot-comparison insights every time an asset/liability/transaction is modified.

**9. No password strength enforcement server-side**
Registration only has `minLength={8}` on the client. No server-side enforcement of password complexity.

---

## Bugs

**1. Dead code — unused query variable in transactions route**
`src/app/api/transactions/route.ts` — `let query = db.select().from(transactions).where(...)` is declared but never used; a separate query is built below it.

**2. Goal un-completion doesn't clear `completedAt`**
`src/app/api/goals/[id]/route.ts` — When `body.isCompleted` is `false`, setting `completedAt: undefined` in Drizzle means "don't update this field," so the old completion timestamp persists. Should be `completedAt: body.isCompleted ? new Date() : null`.

**3. Dashboard shows category IDs instead of names**
`src/app/api/dashboard/route.ts` — The expense breakdown uses `t.categoryId` (a UUID) as the display key. The category names are never resolved, so the UI shows UUIDs like `"a3f2b1c4-..."` instead of "Food", "Transport", etc.

**4. Onboarding/settings fetched on EVERY navigation**
`src/app/(app)/layout.tsx` — The `useEffect` depends on `pathname`, causing 2 API calls (`/api/onboarding` + `/api/settings`) on every single route change within the app.

**5. No error handling for malformed JSON body**
If a request sends invalid JSON, `await request.json()` throws an unhandled exception → 500 error. Should be wrapped in try/catch across all routes.

**6. `generateInsights` errors silently swallowed**
Pattern `.catch(() => {})` used everywhere means you'll never know if insight generation is failing repeatedly.

---

## UI/UX Issues

### Accessibility

**1. `userScalable: false` blocks pinch-to-zoom**
`src/app/layout.tsx` — `maximumScale: 1, userScalable: false` violates WCAG 1.4.4. Remove these to allow users to zoom.

**2. Navigation uses `<a>` tags instead of Next.js `<Link>`**
`src/components/layout/sidebar.tsx` and `src/components/layout/bottom-nav.tsx` use plain `<a href>` which triggers full page reloads. Use `next/link` for client-side navigation — this will make the app feel significantly faster.

### Design & Interaction

**3. No "Forgot Password" flow**
`src/app/(auth)/login/page.tsx` — No password reset link. If either of you forgets the password, there's no recovery path.

**4. Bottom nav overlaps page content**
The bottom nav is `position: fixed; height: 62px` but the main content area has no corresponding `padding-bottom`. The last items on any page get hidden behind the nav on mobile.

**5. No hover states possible**
The entire app uses inline `style={{}}` — CSS pseudo-classes (`:hover`, `:focus`, `:active`) don't work inline. Cards, buttons, and nav items feel static/unresponsive.

**6. No loading skeletons**
Pages show plain text like "Loading your financial position..." instead of skeleton UI that matches content layout. This causes layout shift when data loads.

**7. No confirmation on destructive actions**
There's a `confirm-dialog.tsx` component but it's unclear if delete operations (assets, liabilities, goals) actually use it. The API routes return data immediately on DELETE.

### Feature Gaps

**8. Hard-coded INR currency despite settings**
`formatINR()` in `src/lib/utils.ts` is hardcoded to Indian Rupees. The `currency` user setting is stored but never used for formatting.

**9. No shared household view**
For a couple's finance app, each user has completely isolated data. There's no way to see combined net worth, shared goals, or household expenses.

**10. No data export/backup**
No option to export financial data as CSV/JSON. For a self-hosted app, there should be a backup mechanism.

**11. No offline indicator**
The service worker enables offline use but there's no UI feedback when the app is serving stale cached data.

**12. Dark mode only — theme setting not reflected globally**
`src/app/layout.tsx` hardcodes `data-theme="dark"`. The CSS only defines dark variables. The theme setting in user preferences has no light-mode styles to switch to.

---

## Recommendations (Priority Order)

1. **Create `middleware.ts`** at the project root that imports and uses the proxy logic — most critical security gap.
2. **Add Zod validation schemas** to all API routes — you already have the dependency installed.
3. **Restrict registration** — add an allowed email list env variable or disable registration after initial setup.
4. **Clear SW cache on logout** — post a message to the service worker to clear cached API responses.
5. **Switch `<a>` to `<Link>`** in navigation — instant perceived performance boost.
6. **Add `padding-bottom`** for bottom nav on mobile.
7. **Remove `userScalable: false`** from viewport config.
8. **Resolve category names** in the dashboard API response (join with categories table).
9. **Add rate limiting** via a simple in-memory counter or edge middleware.
10. **Add security headers** via `next.config.ts` headers config.
