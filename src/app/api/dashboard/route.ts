import { NextRequest, NextResponse } from "next/server";
import { getAppSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { assets, liabilities, transactions, goals, emergencyFund, categories, financialSnapshots, insights } from "@/lib/db/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await getAppSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  // Current month start for filtering
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

  // Fetch all data in parallel
  const [
    userAssets,
    userLiabilities,
    userGoals,
    userEmergencyFund,
    recentTxns,
    monthTxns,
    userInsights,
    monthlySnapshots,
  ] = await Promise.all([
    db.select().from(assets).where(eq(assets.userId, userId)),
    db.select().from(liabilities).where(eq(liabilities.userId, userId)),
    db.select().from(goals).where(eq(goals.userId, userId)),
    db.select().from(emergencyFund).where(eq(emergencyFund.userId, userId)).limit(1),
    db.select().from(transactions).where(eq(transactions.userId, userId)).orderBy(desc(transactions.date)).limit(10),
    // Separate query for ALL current month transactions (not limited to 10)
    db.select().from(transactions).where(and(eq(transactions.userId, userId), gte(transactions.date, monthStart))),
    db.select().from(insights).where(and(eq(insights.userId, userId), eq(insights.isDismissed, false))).orderBy(desc(insights.generatedAt)).limit(5),
    db.select().from(financialSnapshots).where(eq(financialSnapshots.userId, userId)).orderBy(desc(financialSnapshots.snapshotDate)).limit(12),
  ]);

  // Calculate totals
  const totalAssets = userAssets.reduce((sum, a) => sum + Number(a.currentValue), 0);
  const totalLiabilities = userLiabilities.reduce((sum, l) => sum + Number(l.outstandingAmount), 0);
  const netWorth = totalAssets - totalLiabilities;
  const totalLiquid = userAssets.filter(a => a.isLiquid).reduce((sum, a) => sum + Number(a.currentValue), 0);

  // Monthly income/expenses from ALL transactions this month
  const monthlyIncome = monthTxns.filter(t => t.type === "income").reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
  const monthlyExpenses = monthTxns.filter(t => t.type === "expense").reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
  const savings = monthlyIncome - monthlyExpenses;
  const savingsRate = monthlyIncome > 0 ? (savings / monthlyIncome) * 100 : 0;

  // Expense breakdown by category
  const expenseTxns = monthTxns.filter(t => t.type === "expense");
  const categoryTotals: Record<string, number> = {};
  for (const t of expenseTxns) {
    const key = t.categoryId || "other";
    categoryTotals[key] = (categoryTotals[key] || 0) + Math.abs(Number(t.amount));
  }

  // Emergency fund
  const ef = userEmergencyFund[0];
  const efTarget = ef ? Number(ef.monthlyEssentialExpenses) * ef.targetMonths : 0;
  const efCurrent = ef ? Number(ef.currentFundAmount) : 0;
  const efMonthsCovered = ef && Number(ef.monthlyEssentialExpenses) > 0
    ? efCurrent / Number(ef.monthlyEssentialExpenses)
    : 0;

  // Net worth history from snapshots (use spread to avoid mutating original array)
  const history = [...monthlySnapshots].reverse().map(s => ({
    month: new Date(s.snapshotDate).toLocaleDateString("en-IN", { month: "short" }),
    value: Number(s.netWorth),
  }));

  // Previous month net worth for change calculation (original array is DESC, so [0]=newest, [1]=previous)
  const prevSnapshot = monthlySnapshots.length > 1 ? monthlySnapshots[1] : null;
  const previousNetWorth = prevSnapshot ? Number(prevSnapshot.netWorth) : netWorth;
  const netWorthChange = netWorth - previousNetWorth;
  const netWorthChangePercent = previousNetWorth > 0 ? (netWorthChange / previousNetWorth) * 100 : 0;

  // Monthly burn (average of last 3 months expenses)
  const monthlyBurn = monthlyExpenses || 0;
  const runwayMonths = monthlyBurn > 0 ? totalLiquid / monthlyBurn : 0;

  // Liquidity items
  const liquidItems = userAssets.filter(a => a.isLiquid).map(a => ({
    name: a.name,
    amount: Number(a.currentValue),
    type: a.category,
  }));

  // Format goals
  const formattedGoals = userGoals.map(g => ({
    id: g.id,
    name: g.name,
    icon: g.icon,
    target: Number(g.targetAmount),
    saved: Number(g.currentAmount),
    monthly: Number(g.monthlyContribution || 0),
    color: g.color,
    deadline: g.targetDate,
    isCompleted: g.isCompleted,
  }));

  // Format transactions
  const formattedTxns = recentTxns.map(t => ({
    id: t.id,
    date: t.date,
    name: t.description || "Transaction",
    amount: t.type === "expense" ? -Math.abs(Number(t.amount)) : Number(t.amount),
    category: t.categoryId || "Other",
    type: t.type,
  }));

  // Format insights
  const formattedInsights = userInsights.map(i => ({
    id: i.id,
    type: i.type === "milestone" || i.type === "celebration" ? "positive" : i.type === "warning" ? "warning" : "info",
    title: i.title,
    body: i.body,
    priority: i.priority,
  }));

  return NextResponse.json({
    user: { name: session.user.name },
    netWorth: {
      current: netWorth,
      previousMonth: previousNetWorth,
      change: netWorthChange,
      changePercent: Math.round(netWorthChangePercent * 100) / 100,
      history,
    },
    liquidity: {
      total: totalLiquid,
      items: liquidItems,
    },
    monthly: {
      income: monthlyIncome,
      expenses: monthlyExpenses,
      savings,
      savingsRate: Math.round(savingsRate * 10) / 10,
      breakdown: Object.entries(categoryTotals).map(([cat, amount]) => ({
        category: cat,
        amount,
        pct: monthlyExpenses > 0 ? Math.round((amount / monthlyExpenses) * 1000) / 10 : 0,
      })),
    },
    emergencyFund: {
      current: efCurrent,
      target: efTarget,
      monthsCovered: Math.round(efMonthsCovered * 10) / 10,
      targetMonths: ef?.targetMonths || 6,
    },
    runway: Math.round(runwayMonths * 10) / 10,
    totalAssets,
    totalLiabilities,
    goals: formattedGoals,
    insights: formattedInsights,
    recentTransactions: formattedTxns,
  });
}