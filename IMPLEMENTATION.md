# Implementation Plan: Finance Manager App Improvements
**Date:** 25 May 2026  
**Based on:** PRODUCT-ANALYSIS.md  
**Excludes:** Multi-currency support

---

## ~~Phase 1 — Quick Wins (Critical Fixes & Low-Effort High-Impact)~~ ✅ COMPLETED

### 1.1 Inline Validation Messages on Onboarding

**File:** `src/app/(app)/onboarding/page.tsx`

- Add a `validationHint` state that renders below the "Continue" button when `canNext()` returns false and user has interacted with the form.
- Show contextual messages:
  - Step 1: "Enter at least one account name and balance"
  - Step 4: "Monthly income is required"
- Add a `touched` state per step to avoid showing errors before interaction.

```tsx
const [touched, setTouched] = useState<Record<number, boolean>>({});

// On "Continue" click attempt when disabled:
const handleNextAttempt = () => {
  setTouched(prev => ({ ...prev, [step]: true }));
  if (canNext()) setStep(step + 1);
};

// Render hint when touched and invalid
{touched[step] && !canNext() && (
  <div style={{ fontSize: 13, color: "var(--negative)", marginTop: 8 }}>
    {step === 1 && "Enter at least one account name and balance to continue"}
    {step === 4 && "Monthly income is required"}
  </div>
)}
```

---

### 1.2 Back Button on Onboarding Step 6 (Summary)

**File:** `src/app/(app)/onboarding/page.tsx`

- Currently the navigation only shows "Back" for `step > 0 && step < 6`. Change to `step > 0`.
- This lets users go back from the summary to correct data before submitting.

```diff
- {step > 0 && step < 6 && (
+ {step > 0 && (
    <button onClick={() => setStep(step - 1)} ...>Back</button>
  )}
```

---

### 1.3 Loading State Consistency (Insights Page)

**File:** `src/app/(app)/insights/page.tsx`

- Replace plain text "Loading insights..." with `<PageSkeleton rows={4} />`.
- Import `PageSkeleton` from `@/components/ui/skeleton`.

```diff
- if (loading)
-   return (<div style={{ padding: "48px 0", textAlign: "center", color: "var(--text-tertiary)" }}>Loading insights...</div>);
+ if (loading) return <PageSkeleton rows={4} />;
```

---

### 1.4 Debounced Settings Save

**File:** `src/app/(app)/settings/page.tsx`

- Replace immediate `save()` calls with a debounced version.
- Apply theme changes immediately (keep instant), but batch the API call.

```tsx
const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

const save = (updates: Partial<Settings>) => {
  const newSettings = { ...settings, ...updates };
  setSettings(newSettings);

  // Apply theme immediately (visual feedback)
  if (updates.theme) {
    const theme = updates.theme;
    localStorage.setItem("finance-theme", theme);
    if (theme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
    } else {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }

  // Debounce the API call
  if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  saveTimerRef.current = setTimeout(async () => {
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings),
      });
    } catch {}
    setSaving(false);
  }, 600);
};
```

---

### 1.5 Snapshot Rate Limiting

**File:** `src/app/(app)/dashboard/page.tsx`

- After a successful snapshot, store the timestamp and disable the button for 60 seconds.

```tsx
const [lastSnapshotAt, setLastSnapshotAt] = useState<number>(0);
const canSnapshot = Date.now() - lastSnapshotAt > 60_000;

// Inside onClick:
setLastSnapshotAt(Date.now());

// Button:
<Button ... disabled={snapshotting || !canSnapshot}>
  {!canSnapshot ? "Wait..." : snapshotting ? "Capturing..." : "Snapshot"}
</Button>
```

---

## Phase 2 — Core UX Enhancements

### 2.1 Month Navigation on Cash Flow Page

**File:** `src/app/(app)/cashflow/page.tsx`

- Add month navigation (prev/next) similar to the Calendar page.
- Replace the hardcoded `currentMonth` with state.
- Show month label and navigation arrows above the summary row.

```tsx
const [viewMonth, setViewMonth] = useState(() => new Date());
const monthStr = `${viewMonth.getFullYear()}-${String(viewMonth.getMonth() + 1).padStart(2, "0")}`;
const monthLabel = viewMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

const navigateMonth = (delta: number) => {
  setViewMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
};
```

Add navigation UI:
```tsx
<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
  <button onClick={() => navigateMonth(-1)} aria-label="Previous month" style={navBtnStyle}>
    <Icon name="chevron-left" size={16} />
  </button>
  <span style={{ fontSize: 16, fontWeight: 600 }}>{monthLabel}</span>
  <button onClick={() => navigateMonth(1)} aria-label="Next month" style={navBtnStyle}
    disabled={viewMonth.getMonth() === new Date().getMonth() && viewMonth.getFullYear() === new Date().getFullYear()}>
    <Icon name="chevron-right" size={16} />
  </button>
</div>
```

Update `fetchData` to use `monthStr` from state instead of hardcoded `currentMonth`.

---

### 2.2 Undo Support for Destructive Actions

**Files:** `src/app/(app)/goals/page.tsx`, `src/app/(app)/portfolio/page.tsx`, `src/app/(app)/cashflow/page.tsx`

Pattern for each page:

1. On delete confirmation, remove from local state immediately (optimistic).
2. Show toast with undo callback.
3. Only call DELETE API after toast timeout (5s) unless undone.

```tsx
const handleDelete = (item: { id: string; name: string }) => {
  // Remove from state immediately
  const removed = goalsList.find(g => g.id === item.id);
  setGoalsList(prev => prev.filter(g => g.id !== item.id));

  // Show undo toast
  showToast(`"${item.name}" deleted`, "info", {
    onUndo: () => {
      // Restore to state
      if (removed) setGoalsList(prev => [...prev, removed]);
    },
  });

  // Delayed API call
  const timer = setTimeout(async () => {
    await fetch(`/api/goals/${item.id}`, { method: "DELETE" });
  }, 5000);

  // Store timer ref so undo can clear it
  pendingDeletesRef.current.set(item.id, timer);
};
```

Add a `pendingDeletesRef`:
```tsx
const pendingDeletesRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
```

In the undo callback, clear the timer:
```tsx
onUndo: () => {
  const timer = pendingDeletesRef.current.get(item.id);
  if (timer) clearTimeout(timer);
  pendingDeletesRef.current.delete(item.id);
  if (removed) setGoalsList(prev => [...prev, removed]);
}
```

---

### 2.3 Global Search UI

**Files:**
- `src/components/layout/app-shell.tsx` (add search trigger)
- `src/components/ui/search-modal.tsx` (new file)

**Search trigger in AppShell:**
```tsx
// Add search icon button in the main content header area
<button onClick={() => setSearchOpen(true)} aria-label="Search" style={...}>
  <Icon name="search" size={18} />
</button>

// Keyboard shortcut
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setSearchOpen(true);
    }
  };
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}, []);
```

**Search Modal component:**
```tsx
// src/components/ui/search-modal.tsx
interface SearchResult {
  type: "transaction" | "asset" | "liability" | "goal";
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

export function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (res.ok) setResults(await res.json());
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Render: modal overlay → input → results list
}
```

---

### 2.4 Custom Goal Option in Onboarding

**File:** `src/app/(app)/onboarding/page.tsx`

- Add a "Custom" card to `GOAL_PRESETS` area.
- When selected, show a name input field.

```tsx
// After GOAL_PRESETS map:
<Card
  onClick={() => setGoal({ ...goal, type: "custom", name: "" })}
  style={{
    padding: 16, cursor: "pointer",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    border: goal.type === "custom" ? "2px solid var(--accent)" : undefined,
  }}>
  <Icon name="plus" size={24} color="var(--accent)" style={{ marginBottom: 8 }} />
  <div style={{ fontSize: 13, fontWeight: 500, textAlign: "center" }}>Custom Goal</div>
</Card>

// In the goal details section:
{goal.type === "custom" && (
  <div>
    <label style={labelStyle}>Goal Name</label>
    <input style={inputStyle} placeholder="e.g. Wedding, MBA Fund"
      value={goal.name} onChange={e => setGoal({ ...goal, name: e.target.value })} />
  </div>
)}
```

---

### 2.5 Actionable Empty State on Dashboard

**File:** `src/app/(app)/dashboard/page.tsx`

Replace the generic empty card with actionable quick-start items:

```tsx
{!hasData && (
  <FadeIn delay={100}>
    <Card hover={false} style={{ padding: "40px 24px", textAlign: "center" }}>
      <Icon name="bar-chart" size={48} color="var(--border)" style={{ marginBottom: 16 }} />
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Welcome to Finance</h2>
      <p style={{ fontSize: 14, color: "var(--text-tertiary)", marginBottom: 24 }}>
        Get started by adding your financial data
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <Button onClick={() => router.push("/portfolio")}>
          <Icon name="plus" size={14} color="var(--bg-root)" /> Add Assets
        </Button>
        <Button variant="secondary" onClick={() => router.push("/cashflow")}>
          <Icon name="plus" size={14} /> Record Transaction
        </Button>
        <Button variant="secondary" onClick={() => router.push("/goals")}>
          <Icon name="target" size={14} /> Set a Goal
        </Button>
      </div>
    </Card>
  </FadeIn>
)}
```

---

## Phase 3 — Reliability & Performance

### 3.1 Pagination for Transactions

**File:** `src/app/api/transactions/route.ts`

- Accept `page` and `limit` query params (default: page=1, limit=50).
- Return `{ data: [...], total: number, page: number, hasMore: boolean }`.

```tsx
const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
const limit = Math.min(100, Math.max(10, Number(url.searchParams.get("limit")) || 50));
const offset = (page - 1) * limit;

const [data, countResult] = await Promise.all([
  db.select().from(transactions)
    .where(and(eq(transactions.userId, userId), ...filters))
    .orderBy(desc(transactions.date))
    .limit(limit)
    .offset(offset),
  db.select({ count: sql<number>`count(*)` }).from(transactions)
    .where(and(eq(transactions.userId, userId), ...filters)),
]);

return NextResponse.json({
  data,
  total: Number(countResult[0].count),
  page,
  hasMore: offset + data.length < Number(countResult[0].count),
});
```

**File:** `src/app/(app)/cashflow/page.tsx`

- Add "Load More" button or infinite scroll at the bottom of the transaction list.
- Append to existing state rather than replacing.

---

### 3.2 Error Boundaries

**New file:** `src/components/ui/error-boundary.tsx`

```tsx
"use client";

import { Component, type ReactNode } from "react";

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{ padding: 32, textAlign: "center", color: "var(--text-tertiary)" }}>
          <p style={{ fontSize: 14, marginBottom: 8 }}>Something went wrong</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}
            style={{ fontSize: 13, color: "var(--accent)", background: "none", border: "none", cursor: "pointer" }}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

**Usage in `src/app/(app)/layout.tsx`:**
```tsx
import { ErrorBoundary } from "@/components/ui/error-boundary";

// Wrap children:
<ErrorBoundary>{children}</ErrorBoundary>
```

---

### 3.3 Fix Redundant Onboarding API Calls

**File:** `src/app/(app)/layout.tsx`

- In the second `useEffect` (onboarding redirect), skip the re-fetch if `pathname === "/onboarding"`.

```diff
  useEffect(() => {
    if (!onboardingChecked || onboardingCompleted === null) return;
-   if (!onboardingCompleted && pathname !== "/onboarding") {
+   if (!onboardingCompleted && pathname !== "/onboarding") {
+     // Only re-check if navigating away from onboarding (user may have just completed it)
      fetch("/api/onboarding")
        ...
    }
  }, [onboardingChecked, onboardingCompleted, pathname, router]);
```

The existing code already has `pathname !== "/onboarding"` check, but the issue is it fires on *every* navigation. Add a `lastCheckedRef` to throttle:

```tsx
const lastOnboardingCheckRef = useRef<number>(0);

// Inside the effect:
if (!onboardingCompleted && pathname !== "/onboarding") {
  const now = Date.now();
  if (now - lastOnboardingCheckRef.current < 5000) return; // throttle to 5s
  lastOnboardingCheckRef.current = now;
  fetch("/api/onboarding")...
}
```

---

### 3.4 Recurring Transaction Auto-Generation

**File:** `src/app/api/calendar/route.ts` (or new file `src/lib/recurring.ts`)

- On calendar page load (or via a daily cron endpoint), check `recurringTransactions` where `isActive = true` and `lastGeneratedAt < current period start`.
- Generate missing transaction entries for the current month.

**New API route:** `src/app/api/recurring-transactions/generate/route.ts`

```tsx
export async function POST(request: NextRequest) {
  const session = await getAppSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const now = new Date();

  // Fetch active recurring items
  const items = await db.select().from(recurringTransactions)
    .where(and(eq(recurringTransactions.userId, userId), eq(recurringTransactions.isActive, true)));

  let generated = 0;

  for (const item of items) {
    const shouldGenerate = needsGeneration(item, now);
    if (!shouldGenerate) continue;

    // Create transaction
    await db.insert(transactions).values({
      id: crypto.randomUUID(),
      userId,
      type: item.type,
      amount: item.amount,
      categoryId: item.categoryId,
      description: item.description,
      date: getNextOccurrenceDate(item, now),
      isRecurring: true,
    });

    // Update lastGeneratedAt
    await db.update(recurringTransactions)
      .set({ lastGeneratedAt: now })
      .where(eq(recurringTransactions.id, item.id));

    generated++;
  }

  return NextResponse.json({ generated });
}
```

**Trigger:** Call this endpoint on dashboard load (once per session) or via the Calendar page.

---

## Phase 4 — Accessibility & Polish

### 4.1 Focus Trap for Bottom Nav "More" Menu

**File:** `src/components/layout/bottom-nav.tsx`

- When `moreOpen` is true, trap focus within the popover.
- Use a simple focus-trap implementation:

```tsx
const moreRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (!moreOpen || !moreRef.current) return;
  const focusable = moreRef.current.querySelectorAll<HTMLElement>("a, button");
  if (focusable.length > 0) focusable[0].focus();

  const trap = (e: KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  };
  document.addEventListener("keydown", trap);
  return () => document.removeEventListener("keydown", trap);
}, [moreOpen]);
```

Add `ref={moreRef}` to the popover div and `role="menu"` + `aria-label="More navigation"`.

---

### 4.2 Keyboard-Accessible Interactive Elements

**File:** `src/app/globals.css`

Add global focus-visible styles:

```css
/* ═══ Focus Visible ═══ */
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

button:focus-visible,
a:focus-visible,
input:focus-visible,
select:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

---

### 4.3 Chart Accessibility (aria-labels)

**File:** `src/components/ui/sparkline.tsx`

- Add `role="img"` and `aria-label` to SVG elements describing the data.

```tsx
<svg role="img" aria-label={`Trend chart showing values from ${data[0]} to ${data[data.length-1]}`} ...>
```

**File:** `src/components/ui/mini-donut.tsx`

- Add `role="img"` and a descriptive `aria-label` listing segments.

```tsx
const label = segments.map(s => `${s.name}: ${formatINR(s.value, { compact: true })}`).join(", ");
<svg role="img" aria-label={`Allocation chart: ${label}`} ...>
```

---

### 4.4 Reduced Motion Support

**File:** `src/app/globals.css`

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

### 4.5 Password Strength Indicator on Registration

**File:** `src/app/(auth)/register/page.tsx`

```tsx
function getPasswordStrength(pw: string): { label: string; color: string; width: string } {
  if (pw.length < 6) return { label: "Too short", color: "var(--negative)", width: "20%" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: "Weak", color: "var(--negative)", width: "40%" };
  if (score === 2) return { label: "Fair", color: "var(--warning)", width: "60%" };
  if (score === 3) return { label: "Good", color: "var(--info)", width: "80%" };
  return { label: "Strong", color: "var(--positive)", width: "100%" };
}

// Render below password input:
{password && (
  <div style={{ marginTop: 6 }}>
    <div style={{ height: 3, borderRadius: 2, background: "var(--border)", overflow: "hidden" }}>
      <div style={{ height: "100%", width: strength.width, background: strength.color, transition: "all 0.2s" }} />
    </div>
    <div style={{ fontSize: 11, color: strength.color, marginTop: 4 }}>{strength.label}</div>
  </div>
)}
```

---

## Phase 5 — Feature Additions

### 5.1 CSV Import for Transactions

**New files:**
- `src/app/api/transactions/import/route.ts`
- `src/components/ui/csv-import-modal.tsx`

**API route:**
```tsx
export async function POST(request: NextRequest) {
  const session = await getAppSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const text = await file.text();
  const rows = parseCSV(text); // custom parser or use a library

  // Validate and insert
  const inserted = [];
  for (const row of rows) {
    const parsed = mapCSVRowToTransaction(row, session.user.id);
    if (parsed) {
      await db.insert(transactions).values(parsed);
      inserted.push(parsed);
    }
  }

  return NextResponse.json({ imported: inserted.length, total: rows.length });
}
```

**UI:** Add "Import" button on Cash Flow page that opens a modal with:
1. File picker (accept .csv)
2. Column mapping preview (date, description, amount, type)
3. Confirm button

---

### 5.2 Budget Alerts (Threshold Notifications)

**Schema addition** (new migration):
```sql
CREATE TABLE budget_alerts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  category_id TEXT,
  monthly_limit DECIMAL(12,2) NOT NULL,
  threshold_pct INTEGER NOT NULL DEFAULT 80,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Logic:** On transaction creation, check if category spend has crossed threshold:
```tsx
// In POST /api/transactions after inserting:
const alerts = await db.select().from(budgetAlerts)
  .where(and(eq(budgetAlerts.userId, userId), eq(budgetAlerts.isActive, true)));

for (const alert of alerts) {
  const spent = await getCategorySpendThisMonth(userId, alert.categoryId);
  const pct = (spent / Number(alert.monthlyLimit)) * 100;
  if (pct >= alert.thresholdPct) {
    // Generate insight/notification
    await db.insert(insights).values({
      id: crypto.randomUUID(),
      userId,
      type: "warning",
      title: `Budget alert: ${categoryName}`,
      body: `You've spent ${pct.toFixed(0)}% of your ₹${alert.monthlyLimit} budget.`,
      priority: pct >= 100 ? "high" : "medium",
    });
  }
}
```

---

### 5.3 Goal Auto-Tracking (Link to Assets)

**Schema addition:**
```sql
ALTER TABLE goals ADD COLUMN linked_asset_ids JSONB DEFAULT '[]';
```

**Logic:** When an asset value is updated, recalculate `currentAmount` for any goals linked to that asset.

**File:** `src/app/api/assets/[id]/route.ts` (in PUT handler):
```tsx
// After updating asset value:
const linkedGoals = await db.select().from(goals)
  .where(and(eq(goals.userId, userId), sql`linked_asset_ids @> ${JSON.stringify([assetId])}`));

for (const goal of linkedGoals) {
  const linkedIds: string[] = goal.linkedAssetIds || [];
  const linkedAssets = await db.select().from(assets)
    .where(and(eq(assets.userId, userId), sql`id = ANY(${linkedIds})`));
  const totalValue = linkedAssets.reduce((s, a) => s + Number(a.currentValue), 0);
  await db.update(goals).set({ currentAmount: totalValue.toString() }).where(eq(goals.id, goal.id));
}
```

**UI:** In Goals form, add a multi-select to link existing assets.

---

### 5.4 Real-time Theme Detection

**File:** `src/app/(app)/layout.tsx`

```tsx
useEffect(() => {
  if (settings?.theme !== "system") return;
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = (e: MediaQueryListEvent) => {
    document.documentElement.setAttribute("data-theme", e.matches ? "dark" : "light");
  };
  mql.addEventListener("change", handler);
  return () => mql.removeEventListener("change", handler);
}, [settings?.theme]);
```

---

## Summary Timeline

| Phase | Focus | Est. Effort |
|-------|-------|-------------|
| **Phase 1** | Critical fixes, validation, debounce, rate limiting | 1–2 days |
| **Phase 2** | Month nav, undo, search, custom goals, empty states | 3–4 days |
| **Phase 3** | Pagination, error boundaries, onboarding fix, recurring gen | 3–4 days |
| **Phase 4** | A11y: focus trap, keyboard, aria-labels, reduced motion, pw strength | 2–3 days |
| **Phase 5** | CSV import, budget alerts, goal auto-tracking, theme detection | 4–5 days |

**Total:** ~13–18 days of focused development

---

## Dependencies & Prerequisites

- Phase 3.4 (recurring auto-generation) requires verifying the `recurringTransactions` schema has `lastGeneratedAt` column.
- Phase 5.2 (budget alerts) requires a new DB migration.
- Phase 5.3 (goal auto-tracking) requires a schema migration to add `linked_asset_ids` to goals.
- Phase 2.3 (search UI) depends on `/api/search` route being functional — verify it returns the expected shape.
