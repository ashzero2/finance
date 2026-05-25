import { NextRequest, NextResponse } from "next/server";
import { getAppSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import {
  financialSnapshots,
  assets,
  liabilities,
  transactions,
  emergencyFund,
  insights,
} from "@/lib/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await getAppSession(request);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const snapshots = await db
    .select()
    .from(financialSnapshots)
    .where(eq(financialSnapshots.userId, session.user.id))
    .orderBy(desc(financialSnapshots.snapshotDate))
    .limit(24);

  return NextResponse.json(snapshots);
}

export async function POST(request: NextRequest) {
  const session = await getAppSession(request);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];

  // Enforce once-per-day: snapshots make no sense more frequently than that
  const existingToday = await db
    .select({ id: financialSnapshots.id })
    .from(financialSnapshots)
    .where(
      and(
        eq(financialSnapshots.userId, userId),
        eq(financialSnapshots.snapshotDate, today)
      )
    )
    .limit(1);

  if (existingToday.length > 0) {
    return NextResponse.json(
      { error: "already_taken_today", message: "You've already taken a snapshot today. Come back tomorrow." },
      { status: 409 }
    );
  }

  // Fetch all current data
  const [userAssets, userLiabilities, monthTxns, userEf] = await Promise.all([
    db.select().from(assets).where(eq(assets.userId, userId)),
    db.select().from(liabilities).where(eq(liabilities.userId, userId)),
    db
      .select()
      .from(transactions)
      .where(
        and(eq(transactions.userId, userId), gte(transactions.date, monthStart))
      ),
    db
      .select()
      .from(emergencyFund)
      .where(eq(emergencyFund.userId, userId))
      .limit(1),
  ]);

  // Calculate totals
  const totalAssets = userAssets.reduce(
    (s, a) => s + Number(a.currentValue),
    0
  );
  const totalLiabilities = userLiabilities.reduce(
    (s, l) => s + Number(l.outstandingAmount),
    0
  );
  const netWorth = totalAssets - totalLiabilities;
  const totalLiquid = userAssets
    .filter((a) => a.isLiquid)
    .reduce((s, a) => s + Number(a.currentValue), 0);

  const monthlyIncome = monthTxns
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
  const monthlyExpenses = monthTxns
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
  const savingsRate =
    monthlyIncome > 0
      ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100
      : 0;
  const runwayMonths =
    monthlyExpenses > 0 ? totalLiquid / monthlyExpenses : 0;

  // Health score (simplified)
  let healthScore = 50;
  if (netWorth > 0) healthScore += 10;
  if (savingsRate > 20) healthScore += 10;
  if (savingsRate > 40) healthScore += 5;
  if (totalLiquid > monthlyExpenses * 3) healthScore += 10;
  if (totalLiquid > monthlyExpenses * 6) healthScore += 5;
  if (totalLiabilities > totalAssets * 0.5) healthScore -= 15;
  if (totalLiabilities > totalAssets) healthScore -= 10;
  healthScore = Math.max(0, Math.min(100, healthScore));

  // Create the snapshot
  const [snapshot] = await db
    .insert(financialSnapshots)
    .values({
      userId,
      snapshotDate: today,
      periodType: "monthly",
      netWorth: String(netWorth),
      totalAssets: String(totalAssets),
      totalLiabilities: String(totalLiabilities),
      totalLiquid: String(totalLiquid),
      monthlyIncome: String(monthlyIncome),
      monthlyExpenses: String(monthlyExpenses),
      savingsRate: String(Math.round(savingsRate * 10) / 10),
      runwayMonths: String(Math.round(runwayMonths * 10) / 10),
      healthScore,
      metadata: {
        assetCount: userAssets.length,
        liabilityCount: userLiabilities.length,
        transactionCount: monthTxns.length,
        takenAt: now.toISOString(),
      },
    })
    .returning();

  // Get previous snapshot for comparison insights
  const prevSnapshots = await db
    .select()
    .from(financialSnapshots)
    .where(eq(financialSnapshots.userId, userId))
    .orderBy(desc(financialSnapshots.snapshotDate))
    .limit(2);

  // Generate comparison insights if we have a previous snapshot
  if (prevSnapshots.length >= 2) {
    const prev = prevSnapshots[1]; // second newest = previous
    const comparisonInsights: {
      userId: string;
      type: "milestone" | "celebration" | "warning" | "suggestion";
      title: string;
      body: string;
      priority: "high" | "medium" | "low";
      metadata: Record<string, unknown>;
    }[] = [];

    const prevNetWorth = Number(prev.netWorth);
    const prevTotalAssets = Number(prev.totalAssets);
    const prevTotalLiabilities = Number(prev.totalLiabilities);
    const prevSavingsRate = Number(prev.savingsRate);
    const prevHealthScore = prev.healthScore;

    // Net worth change
    if (prevNetWorth > 0) {
      const nwChange = netWorth - prevNetWorth;
      const nwChangePct = (nwChange / prevNetWorth) * 100;
      if (nwChange > 0) {
        comparisonInsights.push({
          userId,
          type: "celebration",
          title: `Net worth grew ${Math.abs(nwChangePct).toFixed(1)}%`,
          body: `Your net worth increased by ₹${Math.round(Math.abs(nwChange)).toLocaleString("en-IN")} since your last snapshot.`,
          priority: "medium",
          metadata: { previous: prevNetWorth, current: netWorth, change: nwChange, changePct: nwChangePct },
        });
      } else if (nwChange < 0) {
        comparisonInsights.push({
          userId,
          type: "warning",
          title: `Net worth declined ${Math.abs(nwChangePct).toFixed(1)}%`,
          body: `Your net worth decreased by ₹${Math.round(Math.abs(nwChange)).toLocaleString("en-IN")} since your last snapshot.`,
          priority: "high",
          metadata: { previous: prevNetWorth, current: netWorth, change: nwChange, changePct: nwChangePct },
        });
      }
    }

    // Assets change
    if (prevTotalAssets > 0) {
      const assetChange = totalAssets - prevTotalAssets;
      const assetChangePct = (assetChange / prevTotalAssets) * 100;
      if (Math.abs(assetChangePct) > 5) {
        comparisonInsights.push({
          userId,
          type: assetChange > 0 ? "celebration" : "warning",
          title: `Assets ${assetChange > 0 ? "grew" : "declined"} ${Math.abs(assetChangePct).toFixed(1)}%`,
          body: `Total assets ${assetChange > 0 ? "increased" : "decreased"} by ₹${Math.round(Math.abs(assetChange)).toLocaleString("en-IN")}.`,
          priority: "low",
          metadata: { previous: prevTotalAssets, current: totalAssets },
        });
      }
    }

    // Liability change
    if (prevTotalLiabilities > 0) {
      const liabChange = totalLiabilities - prevTotalLiabilities;
      const liabChangePct = (liabChange / prevTotalLiabilities) * 100;
      if (liabChange < 0) {
        comparisonInsights.push({
          userId,
          type: "celebration",
          title: `Debt reduced by ${Math.abs(liabChangePct).toFixed(1)}%`,
          body: `You paid off ₹${Math.round(Math.abs(liabChange)).toLocaleString("en-IN")} in debt since your last snapshot.`,
          priority: "medium",
          metadata: { previous: prevTotalLiabilities, current: totalLiabilities },
        });
      } else if (liabChangePct > 10) {
        comparisonInsights.push({
          userId,
          type: "warning",
          title: `Debt increased by ${Math.abs(liabChangePct).toFixed(1)}%`,
          body: `Your liabilities grew by ₹${Math.round(Math.abs(liabChange)).toLocaleString("en-IN")}.`,
          priority: "high",
          metadata: { previous: prevTotalLiabilities, current: totalLiabilities },
        });
      }
    }

    // Savings rate change
    const srChange = savingsRate - prevSavingsRate;
    if (Math.abs(srChange) > 5) {
      comparisonInsights.push({
        userId,
        type: srChange > 0 ? "celebration" : "suggestion",
        title: `Savings rate ${srChange > 0 ? "improved" : "dropped"} by ${Math.abs(srChange).toFixed(0)}%`,
        body: `Your savings rate went from ${prevSavingsRate.toFixed(0)}% to ${savingsRate.toFixed(0)}%.`,
        priority: "low",
        metadata: { previous: prevSavingsRate, current: savingsRate },
      });
    }

    // Health score change
    const hsChange = healthScore - prevHealthScore;
    if (Math.abs(hsChange) >= 5) {
      comparisonInsights.push({
        userId,
        type: hsChange > 0 ? "milestone" : "warning",
        title: `Financial health ${hsChange > 0 ? "improved" : "declined"}`,
        body: `Your health score went from ${prevHealthScore} to ${healthScore} (${hsChange > 0 ? "+" : ""}${hsChange} points).`,
        priority: hsChange < -10 ? "high" : "medium",
        metadata: { previous: prevHealthScore, current: healthScore, change: hsChange },
      });
    }

    // Insert comparison insights
    if (comparisonInsights.length > 0) {
      await db.insert(insights).values(comparisonInsights);
    }
  }

  return NextResponse.json({
    snapshot,
    message: "Snapshot captured successfully",
  });
}
