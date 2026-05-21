import { NextRequest, NextResponse } from "next/server";
import { getAppSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { recurringTransactions, categories } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { parseBody, createRecurringTransactionSchema } from "@/lib/validations";
import { generateRecurringTransactions } from "@/lib/recurring";

export async function GET(request: NextRequest) {
  const session = await getAppSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
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
      lastGeneratedAt: recurringTransactions.lastGeneratedAt,
    })
    .from(recurringTransactions)
    .leftJoin(categories, eq(recurringTransactions.categoryId, categories.id))
    .where(eq(recurringTransactions.userId, session.user.id))
    .orderBy(recurringTransactions.startDate);

  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const session = await getAppSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: body, error } = await parseBody(request, createRecurringTransactionSchema);
  if (!body) return NextResponse.json({ error }, { status: 400 });

  const [created] = await db
    .insert(recurringTransactions)
    .values({
      userId: session.user.id,
      type: body.type,
      amount: String(body.amount),
      categoryId: body.categoryId ?? null,
      description: body.description,
      frequency: body.frequency,
      dayOfMonth: body.dayOfMonth ?? null,
      startDate: body.startDate,
      endDate: body.endDate ?? null,
      isActive: true,
    })
    .returning();

  // Auto-generate any due transactions immediately
  try {
    await generateRecurringTransactions(session.user.id);
  } catch (err) {
    console.error("[recurring] auto-generation after create failed:", err);
  }

  return NextResponse.json(created, { status: 201 });
}