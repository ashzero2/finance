# Product & UX Analysis: Finance Manager App
**Date:** 25 May 2026

## Overview
A personal finance dashboard built with Next.js 16, React 19, Drizzle ORM (PostgreSQL), supporting dark/light themes, PWA, and Indian Rupee formatting. It covers net worth tracking, portfolio management, cash flow, goals, calendar, reports, and insights.

---

## Usability Issues & Bugs

| # | Severity | Area | Issue |
|---|----------|------|-------|
| 1 | **High** | Onboarding | No "back" button on Step 0 (Welcome), but also no back on Step 6 (Summary). If a user accidentally skips a step, they can't go back from the final screen to correct data. |
| 2 | **High** | Onboarding | Validation on Step 1 requires `banks.some(b => b.name && b.amount > 0)` — but there's no inline validation feedback. Users see a disabled "Continue" button with no explanation of *why*. |
| 3 | **High** | Navigation | The bottom nav "More" menu opens as a floating popover but has no focus trap. Users on mobile with screen readers will struggle with accessibility. |
| 4 | **Medium** | App Layout | Onboarding redirect logic re-fetches `/api/onboarding` on every pathname change when `onboardingCompleted` is false — creating redundant network calls if the user is already on the onboarding page. |
| 5 | **Medium** | Cash Flow | Only current month transactions are shown with no ability to navigate to previous months. Users can't review historical spending. |
| 6 | **Medium** | Settings | The `save()` function fires on every setting change without debouncing — if a user quickly toggles theme → currency → day, it sends 3 separate PUT requests. |
| 7 | **Medium** | Dashboard | The "Snapshot" button has no rate limiting. A user could spam-click it, creating multiple snapshots in a row. |
| 8 | **Low** | Calendar | `currentMonth` is set with `useState(() => new Date())` but month navigation uses `new Date(prev.getFullYear(), prev.getMonth() + delta, 1)`. If the user's timezone crosses midnight during use, the "today" highlight could be off. |
| 9 | **Low** | Auth | Registration page has no password strength indicator or minimum length validation on the client side (only server-side via Better Auth). |

---

## UX Improvements

| # | Category | Recommendation |
|---|----------|---------------|
| 1 | **Empty States** | Dashboard shows a generic "Welcome" card when empty. Add actionable CTAs like "Add Bank Account", "Record First Transaction" to guide users toward value. |
| 2 | **Onboarding** | Step 5 (Goals) has hardcoded presets but no "Custom" option with a free-form name. Users with goals like "Wedding", "MBA Fund", or "Side Business" are excluded. |
| 3 | **Data Entry** | Transaction form (Cash Flow) should support quick-add patterns: "₹500 groceries today" natural language or at least date + category defaults that reduce taps. |
| 4 | **Portfolio** | Asset snapshots show change vs. previous snapshot but no time period is stated. Add "since [date]" context so users understand the delta. |
| 5 | **Navigation** | Settings is buried in the "More" menu on mobile. Add a user avatar/initials in the top-right with a dropdown for quick access to settings and logout. |
| 6 | **Loading States** | Insights page shows plain text "Loading insights..." while other pages use `<PageSkeleton>`. Inconsistent loading patterns across the app. |
| 7 | **Feedback** | Delete operations use `ConfirmDialog` but don't provide an "Undo" toast. The toast system already supports `onUndo` — wire it up for destructive actions. |
| 8 | **Search** | No global search. Users can't quickly find a specific transaction, asset, or goal. The `/api/search` route exists but there's no visible search UI. |
| 9 | **Accessibility** | Interactive elements use inline styles with `:hover` via `onMouseEnter/Leave` JS — this doesn't respect `prefers-reduced-motion` or provide `:focus-visible` states for keyboard users. |
| 10 | **Reports** | Sparkline and bar charts are purely visual. No data tables or `aria-label` alternatives. Screen reader users get zero information from charts. |

---

## Feature Enhancement Opportunities

| # | Feature | Impact | Effort |
|---|---------|--------|--------|
| 1 | **Multi-currency support** | High (NRIs, travelers) | Medium — settings already has currency selector but `formatINR` is hardcoded everywhere. |
| 2 | **Budget alerts/notifications** | High | Medium — PWA service worker is already in place, just needs push notification integration + budget threshold logic. |
| 3 | **CSV/Excel import** | High (reduces data entry friction) | Low — parse a standard bank statement CSV to create transactions. |
| 4 | **Recurring transaction auto-generation** | High | Low — schema supports it (`recurringTransactions` table, `lastGeneratedAt` field) but there's no visible cron/trigger to auto-create monthly entries. |
| 5 | **Goal auto-tracking** | Medium — link a goal to specific assets so progress updates automatically when asset values change. | Medium |
| 6 | **Dark/Light mode auto-detection** | Low | Already implemented (system option), but no media query listener to react to OS theme changes in real-time during a session. |
| 7 | **Net worth sharing/export** | Medium (accountability partners) | Low — generate a read-only summary PDF or shareable link. |
| 8 | **Mobile swipe gestures** | Medium (UX delight) | Medium — swipe left on transaction rows to delete, swipe calendar days to navigate months. |

---

## Architecture Concerns

1. **All pages are `"use client"`** — no server components are leveraged for data fetching. This means every page ships full React client bundles and makes API calls from the browser. For a data-heavy app, server-side rendering the initial load would improve First Contentful Paint significantly.

2. **No optimistic updates** — every create/edit/delete waits for server response then refetches the full list. For a mobile-first app, optimistic state updates would make it feel much snappier.

3. **No pagination** — transactions, insights, and assets are all fetched without pagination. Once a user has 6+ months of data, the `/api/transactions` and `/api/dashboard` endpoints will become slow.

4. **No error boundaries** — a single failed component render crashes the entire page. React Error Boundaries should wrap each major section.

5. **Inline styles everywhere** — while functional, this prevents pseudo-class styling (`:focus-visible`, `:active`), media queries within components, and makes the codebase harder to maintain. Consider extracting to CSS modules or a styling system.

---

## Priority Recommendations (Next Sprint)

1. Add **month navigation** to Cash Flow page (high impact, low effort)
2. Wire up **undo** for delete operations across Goals, Portfolio, Transactions
3. Surface the **search UI** (route already exists)
4. Fix **loading state inconsistency** on Insights page
5. Add **inline validation messages** to onboarding form fields
6. Implement **debounced settings save** to prevent request spam
