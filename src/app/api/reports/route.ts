import { NextRequest, NextResponse } from "next/server";
import { getAppSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { transactions, categories } from "@/lib/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await getAppSession(request);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "monthly"; // monthly | yearly
  const months = Number(searchParams.get("months") || "6"); // how many months back

  const now = new Date();

  // Determine the date range
  let rangeMonths = months;
  if (period === "yearly") {
    rangeMonths = 12; // always 12 months for yearly view
  }

  const startDate = new Date(now.getFullYear(), now.getMonth() - rangeMonths + 1, 1);
  const startStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}-01`;
  const endDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const endStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${endDay}`;

  // Fetch all transactions in range
  const txnRows = await db
    .select({
      id: transactions.id,
      type: transactions.type,
      amount: transactions.amount,
      categoryId: transactions.categoryId,
      date: transactions.date,
      description: transactions.description,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.date, startStr),
        lte(transactions.date, endStr)
      )
    )
    .orderBy(transactions.date);

  // Fetch categories
  const catRows = await db
    .select({
      id: categories.id,
      name: categories.name,
      type: categories.type,
      icon: categories.icon,
      color: categories.color,
    })
    .from(categories)
    .where(eq(categories.userId, userId));

  // Also include system categories (userId is null)
  const sysCatRows = await db
    .select({
      id: categories.id,
      name: categories.name,
      type: categories.type,
      icon: categories.icon,
      color: categories.color,
    })
    .from(categories)
    .where(eq(categories.userId, userId));

  const catMap: Record<string, { name: string; color: string; icon: string }> = {};
  for (const c of [...catRows, ...sysCatRows]) {
    catMap[c.id] = { name: c.name, color: c.color, icon: c.icon };
  }

  // ── Monthly Trends ──
  // Group transactions by month
  const monthlyData: Record<
    string,
    { income: number; expense: number; net: number }
  > = {};

  // Pre-fill all months in range
  for (let i = 0; i < rangeMonths; i++) {
    const d = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyData[key] = { income: 0, expense: 0, net: 0 };
  }

  for (const tx of txnRows) {
    const monthKey = tx.date.substring(0, 7); // YYYY-MM
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { income: 0, expense: 0, net: 0 };
    }
    const amt = Math.abs(Number(tx.amount));
    if (tx.type === "income") {
      monthlyData[monthKey].income += amt;
    } else if (tx.type === "expense") {
      monthlyData[monthKey].expense += amt;
    }
  }

  // Calculate net for each month
  for (const key of Object.keys(monthlyData)) {
    monthlyData[key].net = monthlyData[key].income - monthlyData[key].expense;
  }

  const monthlyTrends = Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => {
      const [y, m] = month.split("-").map(Number);
      const label = new Date(y, m - 1, 1).toLocaleDateString("en-IN", {
        month: "short",
        year: period === "yearly" ? "2-digit" : undefined,
      });
      return { month, label, ...data };
    });

  // ── Category Breakdown (for the full period) ──
  const categoryTotals: Record<
    string,
    { amount: number; type: string }
  > = {};

  for (const tx of txnRows) {
    if (tx.type !== "expense" && tx.type !== "income") continue;
    const catId = tx.categoryId || "uncategorized";
    if (!categoryTotals[catId]) {
      categoryTotals[catId] = { amount: 0, type: tx.type };
    }
    categoryTotals[catId].amount += Math.abs(Number(tx.amount));
  }

  const expenseByCategory = Object.entries(categoryTotals)
    .filter(([, v]) => v.type === "expense")
    .map(([catId, v]) => ({
      categoryId: catId,
      name: catMap[catId]?.name || "Other",
      color: catMap[catId]?.color || "#8B8B96",
      icon: catMap[catId]?.icon || "circle",
      amount: v.amount,
    }))
    .sort((a, b) => b.amount - a.amount);

  const incomeByCategory = Object.entries(categoryTotals)
    .filter(([, v]) => v.type === "income")
    .map(([catId, v]) => ({
      categoryId: catId,
      name: catMap[catId]?.name || "Other",
      color: catMap[catId]?.color || "#8B8B96",
      icon: catMap[catId]?.icon || "circle",
      amount: v.amount,
    }))
    .sort((a, b) => b.amount - a.amount);

  const totalExpenses = expenseByCategory.reduce((s, c) => s + c.amount, 0);
  const totalIncome = incomeByCategory.reduce((s, c) => s + c.amount, 0);

  // Add percentage to each category
  const expenseBreakdown = expenseByCategory.map((c) => ({
    ...c,
    pct: totalExpenses > 0 ? Math.round((c.amount / totalExpenses) * 1000) / 10 : 0,
  }));

  const incomeBreakdown = incomeByCategory.map((c) => ({
    ...c,
    pct: totalIncome > 0 ? Math.round((c.amount / totalIncome) * 1000) / 10 : 0,
  }));

  // ── Month-over-Month Category Trends ──
  // Category spending by month (top 5 expense categories)
  const top5Categories = expenseByCategory.slice(0, 5).map((c) => c.categoryId);
  const categoryMonthly: Record<string, Record<string, number>> = {};

  for (const catId of top5Categories) {
    categoryMonthly[catId] = {};
    for (const key of Object.keys(monthlyData)) {
      categoryMonthly[catId][key] = 0;
    }
  }

  for (const tx of txnRows) {
    if (tx.type !== "expense") continue;
    const catId = tx.categoryId || "uncategorized";
    if (!top5Categories.includes(catId)) continue;
    const monthKey = tx.date.substring(0, 7);
    if (categoryMonthly[catId]) {
      categoryMonthly[catId][monthKey] = (categoryMonthly[catId][monthKey] || 0) + Math.abs(Number(tx.amount));
    }
  }

  const categoryTrends = top5Categories.map((catId) => ({
    categoryId: catId,
    name: catMap[catId]?.name || "Other",
    color: catMap[catId]?.color || "#8B8B96",
    data: Object.entries(categoryMonthly[catId] || {})
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, amount]) => amount),
  }));

  // ── Summary Stats ──
  const avgMonthlyExpense = monthlyTrends.length > 0
    ? Math.round(totalExpenses / monthlyTrends.length)
    : 0;
  const avgMonthlyIncome = monthlyTrends.length > 0
    ? Math.round(totalIncome / monthlyTrends.length)
    : 0;
  const avgSavingsRate = avgMonthlyIncome > 0
    ? Math.round(((avgMonthlyIncome - avgMonthlyExpense) / avgMonthlyIncome) * 1000) / 10
    : 0;

  // Find highest spending month
  const highestExpenseMonth = monthlyTrends.reduce(
    (max, m) => (m.expense > max.expense ? m : max),
    monthlyTrends[0] || { month: "", label: "", expense: 0, income: 0, net: 0 }
  );

  return NextResponse.json({
    period,
    rangeMonths,
    summary: {
      totalIncome,
      totalExpenses,
      netSavings: totalIncome - totalExpenses,
      avgMonthlyIncome,
      avgMonthlyExpense,
      avgSavingsRate,
      highestExpenseMonth: highestExpenseMonth.label,
      highestExpenseAmount: highestExpenseMonth.expense,
    },
    monthlyTrends,
    expenseBreakdown,
    incomeBreakdown,
    categoryTrends,
  });
}