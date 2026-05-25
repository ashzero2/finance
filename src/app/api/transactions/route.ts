import { NextRequest, NextResponse } from "next/server";
import { getAppSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { generateInsights } from "@/lib/insights";
import { parseBody, createTransactionSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const session = await getAppSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type"); // income, expense, or null for all
  const month = searchParams.get("month"); // YYYY-MM format

  // Build conditions
  const conditions = [eq(transactions.userId, session.user.id)];
  if (type && (type === "income" || type === "expense")) {
    conditions.push(eq(transactions.type, type));
  }
  if (month) {
    const [year, m] = month.split("-").map(Number);
    const start = `${year}-${String(m).padStart(2, "0")}-01`;
    const lastDay = new Date(year, m, 0).getDate();
    const end = `${year}-${String(m).padStart(2, "0")}-${lastDay}`;
    conditions.push(gte(transactions.date, start));
    conditions.push(lte(transactions.date, end));
  }

  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(10, Number(searchParams.get("limit")) || 50));
  const offset = (page - 1) * limit;

  const [results, countResult] = await Promise.all([
    db.select().from(transactions)
      .where(and(...conditions))
      .orderBy(desc(transactions.date))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(transactions)
      .where(and(...conditions)),
  ]);

  const total = Number(countResult[0].count);

  return NextResponse.json({
    data: results,
    total,
    page,
    hasMore: offset + results.length < total,
  });
}

export async function POST(request: NextRequest) {
  const session = await getAppSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: body, error } = await parseBody(request, createTransactionSchema);
  if (!body) return NextResponse.json({ error }, { status: 400 });

  const [txn] = await db.insert(transactions).values({
    userId: session.user.id,
    type: body.type,
    amount: String(Math.abs(body.amount)),
    categoryId: body.categoryId || null,
    description: body.description || null,
    date: body.date || new Date().toISOString().split("T")[0],
    isRecurring: body.isRecurring,
    tags: body.tags,
  }).returning();

  // Auto-regenerate insights after adding a transaction
  generateInsights(session.user.id).catch(() => {});

  return NextResponse.json(txn, { status: 201 });
}
