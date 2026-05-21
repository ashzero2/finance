import { db } from "@/lib/db";
import { recurringTransactions, transactions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// ── Types ──

interface RecurringTemplate {
  id: string;
  userId: string;
  type: "income" | "expense" | "transfer";
  amount: string;
  categoryId: string | null;
  description: string | null;
  frequency: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
  dayOfMonth: number | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  lastGeneratedAt: string | null;
}

// ── Pure function: compute occurrence dates within a range ──

export function getOccurrenceDates(
  template: {
    frequency: string;
    dayOfMonth: number | null;
    startDate: Date;
    endDate: Date | null;
  },
  rangeStart: Date,
  rangeEnd: Date
): Date[] {
  const dates: Date[] = [];
  const { frequency, dayOfMonth, startDate, endDate } = template;

  // Effective range: clamp to [startDate, endDate]
  const effectiveStart = startDate > rangeStart ? startDate : rangeStart;
  const effectiveEnd = endDate && endDate < rangeEnd ? endDate : rangeEnd;

  if (effectiveStart > effectiveEnd) return dates;

  switch (frequency) {
    case "daily": {
      const cur = new Date(effectiveStart);
      while (cur <= effectiveEnd) {
        dates.push(new Date(cur));
        cur.setDate(cur.getDate() + 1);
      }
      break;
    }

    case "weekly": {
      // Every 7 days from startDate, include those in [effectiveStart, effectiveEnd]
      const daysSinceStart = Math.floor(
        (effectiveStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const remainder = daysSinceStart % 7;
      const firstOccurrence = new Date(effectiveStart);
      if (remainder !== 0) {
        firstOccurrence.setDate(firstOccurrence.getDate() + (7 - remainder));
      }
      const cur = new Date(firstOccurrence);
      while (cur <= effectiveEnd) {
        dates.push(new Date(cur));
        cur.setDate(cur.getDate() + 7);
      }
      break;
    }

    case "monthly": {
      const dom = dayOfMonth || startDate.getDate();
      let year = effectiveStart.getFullYear();
      let month = effectiveStart.getMonth();

      while (true) {
        const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
        const actualDay = Math.min(dom, lastDayOfMonth);
        const d = new Date(year, month, actualDay);

        if (d > effectiveEnd) break;
        if (d >= effectiveStart && d >= startDate) {
          dates.push(d);
        }

        month++;
        if (month > 11) {
          month = 0;
          year++;
        }
      }
      break;
    }

    case "quarterly": {
      const dom = dayOfMonth || startDate.getDate();
      const startMonth = startDate.getMonth();
      let year = effectiveStart.getFullYear();
      let month = effectiveStart.getMonth();

      // Align to the quarterly cycle from startDate
      const monthsSinceStart = (year - startDate.getFullYear()) * 12 + (month - startMonth);
      const remainder = monthsSinceStart % 3;
      if (remainder !== 0) {
        month += 3 - remainder;
        if (month > 11) {
          year += Math.floor(month / 12);
          month = month % 12;
        }
      }

      while (true) {
        const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
        const actualDay = Math.min(dom, lastDayOfMonth);
        const d = new Date(year, month, actualDay);

        if (d > effectiveEnd) break;
        if (d >= effectiveStart && d >= startDate) {
          dates.push(d);
        }

        month += 3;
        if (month > 11) {
          year += Math.floor(month / 12);
          month = month % 12;
        }
      }
      break;
    }

    case "yearly": {
      const dom = dayOfMonth || startDate.getDate();
      const targetMonth = startDate.getMonth();
      let year = effectiveStart.getFullYear();

      while (true) {
        const lastDayOfMonth = new Date(year, targetMonth + 1, 0).getDate();
        const actualDay = Math.min(dom, lastDayOfMonth);
        const d = new Date(year, targetMonth, actualDay);

        if (d > effectiveEnd) break;
        if (d >= effectiveStart && d >= startDate) {
          dates.push(d);
        }

        year++;
      }
      break;
    }
  }

  return dates;
}

// ── Helper: format Date to YYYY-MM-DD ──

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDateStr(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// ── Main engine: generate transactions from recurring templates ──

/**
 * Generate transactions for all active recurring templates for a given user.
 * Idempotent — uses lastGeneratedAt to avoid duplicates.
 *
 * @param userId - the user to generate for
 * @param upToDate - generate transactions up to and including this date (default: today)
 * @returns number of transactions created
 */
export async function generateRecurringTransactions(
  userId: string,
  upToDate?: Date
): Promise<number> {
  const today = upToDate || new Date();
  today.setHours(0, 0, 0, 0);

  // Fetch all active recurring templates for this user
  const templates = await db
    .select()
    .from(recurringTransactions)
    .where(
      and(
        eq(recurringTransactions.userId, userId),
        eq(recurringTransactions.isActive, true)
      )
    );

  let totalCreated = 0;

  for (const tmpl of templates as RecurringTemplate[]) {
    const startDate = parseDateStr(tmpl.startDate);
    const endDate = tmpl.endDate ? parseDateStr(tmpl.endDate) : null;

    // Determine "generate from" date
    let fromDate: Date;
    if (tmpl.lastGeneratedAt) {
      fromDate = parseDateStr(tmpl.lastGeneratedAt);
      fromDate.setDate(fromDate.getDate() + 1); // day after last generated
    } else {
      fromDate = new Date(startDate);
    }

    // Determine "generate to" date
    const toDate = endDate && endDate < today ? endDate : today;

    if (fromDate > toDate) continue;

    const occurrences = getOccurrenceDates(
      {
        frequency: tmpl.frequency,
        dayOfMonth: tmpl.dayOfMonth,
        startDate,
        endDate,
      },
      fromDate,
      toDate
    );

    if (occurrences.length === 0) continue;

    // Batch insert transactions
    const txnValues = occurrences.map((d) => ({
      userId: tmpl.userId,
      type: tmpl.type as "income" | "expense" | "transfer",
      amount: tmpl.amount,
      categoryId: tmpl.categoryId,
      description: tmpl.description ? `${tmpl.description} (auto)` : "(auto)",
      date: toDateStr(d),
      isRecurring: true,
      recurringId: tmpl.id,
    }));

    await db.insert(transactions).values(txnValues);

    // Update lastGeneratedAt to the latest occurrence
    const latestDate = occurrences[occurrences.length - 1];
    await db
      .update(recurringTransactions)
      .set({ lastGeneratedAt: toDateStr(latestDate) })
      .where(eq(recurringTransactions.id, tmpl.id));

    totalCreated += occurrences.length;
  }

  return totalCreated;
}

/**
 * Generate recurring transactions for ALL active users.
 * Used in the startup hook.
 */
export async function generateRecurringForAllUsers(upToDate?: Date): Promise<number> {
  // Get distinct userIds from active recurring templates
  const templates = await db
    .select({ userId: recurringTransactions.userId })
    .from(recurringTransactions)
    .where(eq(recurringTransactions.isActive, true))
    .groupBy(recurringTransactions.userId);

  let total = 0;
  for (const { userId } of templates) {
    const count = await generateRecurringTransactions(userId, upToDate);
    total += count;
  }

  return total;
}