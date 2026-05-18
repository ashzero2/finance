import { db } from "@/lib/db";
import {
  insights,
  assets,
  liabilities,
  goals,
  emergencyFund,
  transactions,
  assetSnapshots,
} from "@/lib/db/schema";
import { eq, and, gte, desc } from "drizzle-orm";

interface NewInsight {
  userId: string;
  type: "anomaly" | "milestone" | "suggestion" | "warning" | "celebration";
  title: string;
  body: string;
  priority: "high" | "medium" | "low";
  metadata?: Record<string, unknown>;
}

/**
 * Generate insights for a user based on their current financial data.
 * Deletes previous auto-generated insights and creates fresh ones.
 */
export async function generateInsights(userId: string): Promise<number> {
  // Clear old insights
  await db.delete(insights).where(eq(insights.userId, userId));

  // Fetch all data in parallel
  const [userAssets, userLiabilities, userGoals, userEf, recentTxns] =
    await Promise.all([
      db.select().from(assets).where(eq(assets.userId, userId)),
      db.select().from(liabilities).where(eq(liabilities.userId, userId)),
      db.select().from(goals).where(eq(goals.userId, userId)),
      db
        .select()
        .from(emergencyFund)
        .where(eq(emergencyFund.userId, userId))
        .limit(1),
      db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            gte(
              transactions.date,
              new Date(
                new Date().getFullYear(),
                new Date().getMonth() - 1,
                1
              )
                .toISOString()
                .split("T")[0]
            )
          )
        )
        .orderBy(desc(transactions.date)),
    ]);

  const newInsights: NewInsight[] = [];

  // ── Totals ──
  const totalAssets = userAssets.reduce(
    (s, a) => s + Number(a.currentValue),
    0
  );
  const totalLiabilities = userLiabilities.reduce(
    (s, l) => s + Number(l.outstandingAmount),
    0
  );
  const netWorth = totalAssets - totalLiabilities;
  const liquidAssets = userAssets
    .filter((a) => a.isLiquid)
    .reduce((s, a) => s + Number(a.currentValue), 0);

  // ── Net worth insights ──
  if (netWorth > 0) {
    newInsights.push({
      userId,
      type: "celebration",
      title: "Positive net worth",
      body: `Your net worth is ₹${Math.round(netWorth).toLocaleString("en-IN")}. Keep building!`,
      priority: "low",
    });
  } else if (totalAssets > 0 && netWorth <= 0) {
    newInsights.push({
      userId,
      type: "warning",
      title: "Negative net worth",
      body: `Your liabilities exceed your assets by ₹${Math.round(Math.abs(netWorth)).toLocaleString("en-IN")}. Focus on reducing debt.`,
      priority: "high",
    });
  }

  // ── Debt ratio ──
  if (totalLiabilities > 0 && totalAssets > 0) {
    const debtRatio = totalLiabilities / totalAssets;
    if (debtRatio > 0.5) {
      newInsights.push({
        userId,
        type: "warning",
        title: "High debt-to-asset ratio",
        body: `Your liabilities are ${Math.round(debtRatio * 100)}% of your assets. Consider prioritizing debt repayment.`,
        priority: "high",
      });
    } else if (debtRatio < 0.2 && totalLiabilities > 0) {
      newInsights.push({
        userId,
        type: "celebration",
        title: "Low debt ratio",
        body: `Your debt is only ${Math.round(debtRatio * 100)}% of assets. Well managed!`,
        priority: "low",
      });
    }
  }

  // ── Liquidity ──
  if (liquidAssets > 0 && totalAssets > 0) {
    const liquidRatio = liquidAssets / totalAssets;
    if (liquidRatio < 0.15) {
      newInsights.push({
        userId,
        type: "suggestion",
        title: "Low liquidity",
        body: `Only ${Math.round(liquidRatio * 100)}% of your assets are liquid. Consider keeping more accessible cash.`,
        priority: "medium",
      });
    } else if (liquidRatio > 0.6) {
      newInsights.push({
        userId,
        type: "suggestion",
        title: "High cash allocation",
        body: `${Math.round(liquidRatio * 100)}% of your assets are in liquid form. Consider investing some for better returns.`,
        priority: "low",
      });
    }
  }

  // ── Spending insights ──
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    .toISOString()
    .split("T")[0];

  const thisMonthExpenses = recentTxns
    .filter((t) => t.type === "expense" && t.date >= thisMonthStart)
    .reduce((s, t) => s + Math.abs(Number(t.amount)), 0);

  const lastMonthExpenses = recentTxns
    .filter(
      (t) =>
        t.type === "expense" &&
        t.date >= lastMonthStart &&
        t.date < thisMonthStart
    )
    .reduce((s, t) => s + Math.abs(Number(t.amount)), 0);

  const thisMonthIncome = recentTxns
    .filter((t) => t.type === "income" && t.date >= thisMonthStart)
    .reduce((s, t) => s + Math.abs(Number(t.amount)), 0);

  if (lastMonthExpenses > 0 && thisMonthExpenses > 0) {
    const spendingChange =
      ((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100;
    if (spendingChange > 30) {
      newInsights.push({
        userId,
        type: "warning",
        title: "Spending spike detected",
        body: `This month's spending is ${Math.round(spendingChange)}% higher than last month. Review your expenses.`,
        priority: "high",
        metadata: {
          thisMonth: thisMonthExpenses,
          lastMonth: lastMonthExpenses,
        },
      });
    } else if (spendingChange < -20) {
      newInsights.push({
        userId,
        type: "celebration",
        title: "Spending reduced",
        body: `You've spent ${Math.round(Math.abs(spendingChange))}% less than last month. Great discipline!`,
        priority: "medium",
      });
    }
  }

  // Savings rate
  if (thisMonthIncome > 0 && thisMonthExpenses > 0) {
    const savingsRate =
      ((thisMonthIncome - thisMonthExpenses) / thisMonthIncome) * 100;
    if (savingsRate >= 30) {
      newInsights.push({
        userId,
        type: "celebration",
        title: "Strong savings rate",
        body: `You're saving ${Math.round(savingsRate)}% of your income this month. Excellent!`,
        priority: "medium",
      });
    } else if (savingsRate < 10 && savingsRate >= 0) {
      newInsights.push({
        userId,
        type: "suggestion",
        title: "Low savings rate",
        body: `You're only saving ${Math.round(savingsRate)}% of income this month. Aim for at least 20%.`,
        priority: "medium",
      });
    } else if (savingsRate < 0) {
      newInsights.push({
        userId,
        type: "warning",
        title: "Overspending this month",
        body: `You've spent more than earned this month. Expenses exceed income by ₹${Math.round(thisMonthExpenses - thisMonthIncome).toLocaleString("en-IN")}.`,
        priority: "high",
      });
    }
  }

  // ── Goal-based insights ──
  for (const g of userGoals) {
    const pct =
      Number(g.targetAmount) > 0
        ? Number(g.currentAmount) / Number(g.targetAmount)
        : 0;
    if (pct >= 1) {
      newInsights.push({
        userId,
        type: "celebration",
        title: `${g.name} achieved! 🎉`,
        body: `Congratulations! You've reached your ${g.name} target of ₹${Math.round(Number(g.targetAmount)).toLocaleString("en-IN")}.`,
        priority: "high",
      });
    } else if (pct >= 0.75) {
      newInsights.push({
        userId,
        type: "milestone",
        title: `${g.name} almost there!`,
        body: `You're ${Math.round(pct * 100)}% of the way to your ${g.name} goal. Just ₹${Math.round(Number(g.targetAmount) - Number(g.currentAmount)).toLocaleString("en-IN")} to go.`,
        priority: "medium",
      });
    } else if (pct >= 0.5) {
      newInsights.push({
        userId,
        type: "milestone",
        title: `${g.name} halfway there`,
        body: `You've reached ${Math.round(pct * 100)}% of your ${g.name} goal. Keep it up!`,
        priority: "low",
      });
    }

    // Deadline approaching
    if (g.targetDate && pct < 1) {
      const deadline = new Date(g.targetDate);
      const monthsLeft =
        (deadline.getFullYear() - now.getFullYear()) * 12 +
        deadline.getMonth() -
        now.getMonth();
      if (monthsLeft <= 3 && monthsLeft > 0 && pct < 0.8) {
        const remaining = Number(g.targetAmount) - Number(g.currentAmount);
        newInsights.push({
          userId,
          type: "warning",
          title: `${g.name} deadline approaching`,
          body: `Only ${monthsLeft} month${monthsLeft === 1 ? "" : "s"} left and ₹${Math.round(remaining).toLocaleString("en-IN")} to go. Consider increasing contributions.`,
          priority: "high",
        });
      }
    }
  }

  // ── Emergency fund insights ──
  const ef = userEf[0];
  if (ef) {
    const monthsCovered =
      Number(ef.monthlyEssentialExpenses) > 0
        ? Number(ef.currentFundAmount) / Number(ef.monthlyEssentialExpenses)
        : 0;
    if (monthsCovered >= ef.targetMonths) {
      newInsights.push({
        userId,
        type: "celebration",
        title: "Emergency fund fully funded",
        body: `Your emergency fund covers ${monthsCovered.toFixed(1)} months — above your ${ef.targetMonths}-month target. ✓`,
        priority: "medium",
      });
    } else if (monthsCovered < 3 && Number(ef.monthlyEssentialExpenses) > 0) {
      newInsights.push({
        userId,
        type: "warning",
        title: "Emergency fund needs attention",
        body: `You only have ${monthsCovered.toFixed(1)} months of emergency coverage. Target is ${ef.targetMonths} months.`,
        priority: "high",
      });
    } else if (
      monthsCovered >= 3 &&
      monthsCovered < ef.targetMonths &&
      Number(ef.monthlyEssentialExpenses) > 0
    ) {
      newInsights.push({
        userId,
        type: "suggestion",
        title: "Emergency fund building up",
        body: `You have ${monthsCovered.toFixed(1)} months of coverage. Keep going to reach your ${ef.targetMonths}-month target.`,
        priority: "low",
      });
    }
  }

  // ── Asset diversification ──
  if (userAssets.length > 0) {
    const catCounts: Record<string, number> = {};
    for (const a of userAssets) {
      catCounts[a.category] = (catCounts[a.category] || 0) + Number(a.currentValue);
    }
    const cats = Object.entries(catCounts).filter(([, v]) => v > 0);
    if (cats.length === 1 && totalAssets > 50000) {
      newInsights.push({
        userId,
        type: "suggestion",
        title: "Consider diversifying",
        body: `All your assets are in ${cats[0][0]}. Diversifying across categories can reduce risk.`,
        priority: "medium",
      });
    }
  }

  // Insert new insights
  if (newInsights.length > 0) {
    await db.insert(insights).values(newInsights);
  }

  return newInsights.length;
}
