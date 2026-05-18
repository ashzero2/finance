import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type"); // income, expense, or null for all
  const month = searchParams.get("month"); // YYYY-MM format

  let query = db.select().from(transactions).where(eq(transactions.userId, session.user.id));

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

  const results = await db.select().from(transactions)
    .where(and(...conditions))
    .orderBy(desc(transactions.date))
    .limit(100);

  return NextResponse.json(results);
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const [txn] = await db.insert(transactions).values({
    userId: session.user.id,
    type: body.type,
    amount: String(Math.abs(body.amount)),
    categoryId: body.categoryId || null,
    description: body.description || null,
    date: body.date || new Date().toISOString().split("T")[0],
    isRecurring: body.isRecurring || false,
    tags: body.tags || [],
  }).returning();

  return NextResponse.json(txn, { status: 201 });
}