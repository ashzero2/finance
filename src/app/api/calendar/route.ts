import { NextRequest, NextResponse } from "next/server";
import { getAppSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import {
  liabilities,
  recurringTransactions,
  transactions,
  categories,
} from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { getOccurrenceDates } from "@/lib/recurring";

interface CalendarEvent {
  date: string;
  type: "emi" | "recurring" | "transaction";
  subType: "income" | "expense";
  amount: number;
  description: string;
  categoryName?: string;
  sourceId: string;
}

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

export async function GET(request: NextRequest) {
  const session = await getAppSession(request);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get("month"); // YYYY-MM

  if (!monthParam || !/^\d{4}-\d{2}$/.test(monthParam)) {
    return NextResponse.json(
      { error: "month parameter required (YYYY-MM)" },
      { status: 400 }
    );
  }

  const [year, month] = monthParam.split("-").map(Number);
  const rangeStart = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0).getDate();
  const rangeEnd = new Date(year, month - 1, lastDay);
  const startStr = `${year}-${String(month).padStart(2, "0")}-01`;
  const endStr = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

  const events: CalendarEvent[] = [];

  // 1. EMI payments from liabilities
  const liabRows = await db
    .select()
    .from(liabilities)
    .where(eq(liabilities.userId, session.user.id));

  for (const li of liabRows) {
    if (li.emiAmount && Number(li.emiAmount) > 0 && li.emiDay) {
      const emiDay = Math.min(li.emiDay, lastDay);
      const emiDate = `${year}-${String(month).padStart(2, "0")}-${String(emiDay).padStart(2, "0")}`;

      // Check if liability is active for this month
      const liStart = li.startDate ? parseDateStr(li.startDate) : null;
      const liEnd = li.endDate ? parseDateStr(li.endDate) : null;
      const emiDateObj = parseDateStr(emiDate);

      if (liStart && emiDateObj < liStart) continue;
      if (liEnd && emiDateObj > liEnd) continue;

      events.push({
        date: emiDate,
        type: "emi",
        subType: "expense",
        amount: Number(li.emiAmount),
        description: `${li.name} EMI`,
        sourceId: li.id,
      });
    }
  }

  // 2. Recurring transaction projections
  const recRows = await db
    .select({
      id: recurringTransactions.id,
      type: recurringTransactions.type,
      amount: recurringTransactions.amount,
      categoryId: recurringTransactions.categoryId,
      categoryName: categories.name,
      description: recurringTransactions.description,
      frequency: recurringTransactions.frequency,
      dayOfMonth: recurringTransactions.dayOfMonth,
      startDate: recurringTransactions.startDate,
      endDate: recurringTransactions.endDate,
      isActive: recurringTransactions.isActive,
    })
    .from(recurringTransactions)
    .leftJoin(categories, eq(recurringTransactions.categoryId, categories.id))
    .where(
      and(
        eq(recurringTransactions.userId, session.user.id),
        eq(recurringTransactions.isActive, true)
      )
    );

  for (const rec of recRows) {
    const startDate = parseDateStr(rec.startDate);
    const endDate = rec.endDate ? parseDateStr(rec.endDate) : null;

    const occurrences = getOccurrenceDates(
      { frequency: rec.frequency, dayOfMonth: rec.dayOfMonth, startDate, endDate },
      rangeStart,
      rangeEnd
    );

    for (const d of occurrences) {
      events.push({
        date: toDateStr(d),
        type: "recurring",
        subType: rec.type === "income" ? "income" : "expense",
        amount: Number(rec.amount),
        description: rec.description || "Recurring",
        categoryName: rec.categoryName ?? undefined,
        sourceId: rec.id,
      });
    }
  }

  // 3. Actual transactions for the month
  const txnRows = await db
    .select({
      id: transactions.id,
      type: transactions.type,
      amount: transactions.amount,
      description: transactions.description,
      date: transactions.date,
      categoryName: categories.name,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.userId, session.user.id),
        gte(transactions.date, startStr),
        lte(transactions.date, endStr)
      )
    );

  for (const tx of txnRows) {
    events.push({
      date: tx.date,
      type: "transaction",
      subType: tx.type === "income" ? "income" : "expense",
      amount: Number(tx.amount),
      description: tx.description || "Transaction",
      categoryName: tx.categoryName ?? undefined,
      sourceId: tx.id,
    });
  }

  // Sort by date
  events.sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json(events);
}