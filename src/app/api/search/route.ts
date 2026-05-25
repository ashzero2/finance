import { NextRequest, NextResponse } from "next/server";
import { getAppSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { assets, liabilities, transactions, goals } from "@/lib/db/schema";
import { eq, and, ilike, or, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await getAppSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json([]);

  const pattern = `%${q}%`;

  const [matchedAssets, matchedLiabilities, matchedTransactions, matchedGoals] = await Promise.all([
    db.select({ id: assets.id, name: assets.name, category: assets.category, currentValue: assets.currentValue })
      .from(assets)
      .where(and(eq(assets.userId, userId), or(ilike(assets.name, pattern), ilike(assets.institution, pattern))))
      .limit(5),
    db.select({ id: liabilities.id, name: liabilities.name, category: liabilities.category, outstandingAmount: liabilities.outstandingAmount })
      .from(liabilities)
      .where(and(eq(liabilities.userId, userId), ilike(liabilities.name, pattern)))
      .limit(5),
    db.select({ id: transactions.id, description: transactions.description, amount: transactions.amount, type: transactions.type, date: transactions.date })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), ilike(transactions.description, pattern)))
      .orderBy(desc(transactions.date))
      .limit(5),
    db.select({ id: goals.id, name: goals.name, targetAmount: goals.targetAmount, currentAmount: goals.currentAmount, color: goals.color })
      .from(goals)
      .where(and(eq(goals.userId, userId), ilike(goals.name, pattern)))
      .limit(5),
  ]);

  const results = [
    ...matchedAssets.map(a => ({
      type: "asset" as const,
      id: a.id,
      title: a.name,
      subtitle: `${a.category} · ₹${Number(a.currentValue).toLocaleString("en-IN")}`,
      href: "/portfolio",
    })),
    ...matchedLiabilities.map(l => ({
      type: "liability" as const,
      id: l.id,
      title: l.name,
      subtitle: `${l.category} · ₹${Number(l.outstandingAmount).toLocaleString("en-IN")}`,
      href: "/portfolio",
    })),
    ...matchedTransactions.map(t => ({
      type: "transaction" as const,
      id: t.id,
      title: t.description || "Transaction",
      subtitle: `${t.type} · ₹${Number(t.amount).toLocaleString("en-IN")} · ${t.date}`,
      href: "/cashflow",
    })),
    ...matchedGoals.map(g => ({
      type: "goal" as const,
      id: g.id,
      title: g.name,
      subtitle: `₹${Number(g.currentAmount).toLocaleString("en-IN")} / ₹${Number(g.targetAmount).toLocaleString("en-IN")}`,
      href: "/goals",
    })),
  ];

  return NextResponse.json(results);
}