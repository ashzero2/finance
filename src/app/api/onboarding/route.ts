import { NextRequest, NextResponse } from "next/server";
import { getAppSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { assets, liabilities, goals, emergencyFund, userSettings, financialSnapshots } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await getAppSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, session.user.id)).limit(1);
  return NextResponse.json({ onboardingCompleted: settings?.onboardingCompleted || false });
}

export async function POST(request: NextRequest) {
  const session = await getAppSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const userId = session.user.id;

  // Idempotency guard — don't re-run if already completed
  const [existingSettings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  if (existingSettings?.onboardingCompleted) {
    return NextResponse.json({ success: true, message: "Onboarding already completed" });
  }

  try {
    await db.transaction(async (tx) => {
      // Step 1: Create bank/savings assets
      if (body.bankBalances && Array.isArray(body.bankBalances)) {
        for (const b of body.bankBalances) {
          if (b.name && typeof b.name === "string" && b.amount > 0) {
            await tx.insert(assets).values({
              userId, name: b.name.slice(0, 100), category: "bank",
              currentValue: String(Math.abs(Number(b.amount))), isLiquid: true, liquidityDays: 0,
            });
          }
        }
      }

      // Step 2: Create investment assets
      if (body.investments && Array.isArray(body.investments)) {
        for (const inv of body.investments) {
          if (inv.name && typeof inv.name === "string" && inv.amount > 0) {
            await tx.insert(assets).values({
              userId, name: inv.name.slice(0, 100), category: "investment",
              currentValue: String(Math.abs(Number(inv.amount))), isLiquid: false, liquidityDays: 7,
            });
          }
        }
      }

      // Step 3: Create liabilities
      if (body.loans && Array.isArray(body.loans)) {
        for (const loan of body.loans) {
          if (loan.name && typeof loan.name === "string" && loan.amount > 0) {
            await tx.insert(liabilities).values({
              userId, name: loan.name.slice(0, 100), category: "loan",
              outstandingAmount: String(Math.abs(Number(loan.amount))),
              principalAmount: String(Math.abs(Number(loan.amount))),
              emiAmount: loan.emi ? String(Math.abs(Number(loan.emi))) : null,
            });
          }
        }
      }

      const monthlyIncome = Math.abs(Number(body.monthlyIncome) || 0);
      const monthlyExpenses = Math.abs(Number(body.monthlyExpenses) || 0);

      // Step 4: Create emergency fund
      if (monthlyExpenses > 0) {
        await tx.insert(emergencyFund).values({
          userId, targetMonths: 6,
          monthlyEssentialExpenses: String(monthlyExpenses),
          currentFundAmount: "0",
        }).onConflictDoNothing();
      }

      // Step 5: Create a goal if provided
      if (body.goal && body.goal.name && body.goal.targetAmount > 0) {
        const goalIcons: Record<string, string> = {
          emergency: "shield", house: "home", car: "car", travel: "plane", retirement: "target",
        };
        const goalColors: Record<string, string> = {
          emergency: "#34D399", house: "#60A5FA", car: "#A78BFA", travel: "#C9A84C", retirement: "#FBBF24",
        };
        await tx.insert(goals).values({
          userId, name: String(body.goal.name).slice(0, 100),
          targetAmount: String(Math.abs(Number(body.goal.targetAmount))),
          currentAmount: "0",
          targetDate: body.goal.targetDate || null,
          icon: goalIcons[body.goal.type] || "target",
          color: goalColors[body.goal.type] || "#C9A84C",
          category: body.goal.type === "emergency" ? "emergency" : body.goal.type === "house" ? "purchase" : body.goal.type === "travel" ? "travel" : "other",
        });
      }

      // Step 6: Create initial financial snapshot with monthly income/expenses
      const totalAssets = [
        ...(body.bankBalances || []).filter((b: { amount: number }) => b.amount > 0).map((b: { amount: number }) => Math.abs(Number(b.amount))),
        ...(body.investments || []).filter((i: { amount: number }) => i.amount > 0).map((i: { amount: number }) => Math.abs(Number(i.amount))),
      ].reduce((s: number, v: number) => s + v, 0);
      const totalLiabs = (body.loans || []).filter((l: { amount: number }) => l.amount > 0)
        .reduce((s: number, l: { amount: number }) => s + Math.abs(Number(l.amount)), 0);

      await tx.insert(financialSnapshots).values({
        userId,
        snapshotDate: new Date().toISOString().split("T")[0],
        periodType: "monthly",
        netWorth: String(totalAssets - totalLiabs),
        totalAssets: String(totalAssets),
        totalLiabilities: String(totalLiabs),
        totalLiquid: String((body.bankBalances || []).filter((b: { amount: number }) => b.amount > 0)
          .reduce((s: number, b: { amount: number }) => s + Math.abs(Number(b.amount)), 0)),
        monthlyIncome: String(monthlyIncome),
        monthlyExpenses: String(monthlyExpenses),
        savingsRate: monthlyIncome > 0 ? String(Math.round(((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100)) : "0",
        runwayMonths: "0",
        healthScore: 50,
        metadata: { source: "onboarding", monthlyIncome, monthlyExpenses },
      });

      // Step 7: Mark onboarding as completed
      if (existingSettings) {
        await tx.update(userSettings).set({ onboardingCompleted: true, updatedAt: new Date() }).where(eq(userSettings.userId, userId));
      } else {
        await tx.insert(userSettings).values({ userId, onboardingCompleted: true });
      }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Onboarding error:", err);
    return NextResponse.json({ error: "Failed to complete onboarding" }, { status: 500 });
  }
}