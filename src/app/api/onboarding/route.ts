import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { assets, liabilities, goals, emergencyFund, userSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, session.user.id)).limit(1);
  return NextResponse.json({ onboardingCompleted: settings?.onboardingCompleted || false });
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const userId = session.user.id;

  // Idempotency guard — don't re-run if already completed
  const [existingSettings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  if (existingSettings?.onboardingCompleted) {
    return NextResponse.json({ success: true, message: "Onboarding already completed" });
  }

  // Step 1: Create bank/savings assets
  if (body.bankBalances && Array.isArray(body.bankBalances)) {
    for (const b of body.bankBalances) {
      if (b.name && b.amount > 0) {
        await db.insert(assets).values({
          userId, name: b.name, category: "bank",
          currentValue: String(b.amount), isLiquid: true, liquidityDays: 0,
        });
      }
    }
  }

  // Step 2: Create investment assets
  if (body.investments && Array.isArray(body.investments)) {
    for (const inv of body.investments) {
      if (inv.name && inv.amount > 0) {
        await db.insert(assets).values({
          userId, name: inv.name, category: "investment",
          currentValue: String(inv.amount), isLiquid: false, liquidityDays: 7,
        });
      }
    }
  }

  // Step 3: Create liabilities
  if (body.loans && Array.isArray(body.loans)) {
    for (const loan of body.loans) {
      if (loan.name && loan.amount > 0) {
        await db.insert(liabilities).values({
          userId, name: loan.name, category: "loan",
          outstandingAmount: String(loan.amount), principalAmount: String(loan.amount),
          emiAmount: loan.emi ? String(loan.emi) : null,
        });
      }
    }
  }

  // Step 4: Monthly income (stored as a note in settings, used for calculations)
  const monthlyIncome = body.monthlyIncome || 0;
  const monthlyExpenses = body.monthlyExpenses || 0;

  // Step 5: Create emergency fund
  if (monthlyExpenses > 0) {
    await db.insert(emergencyFund).values({
      userId, targetMonths: 6,
      monthlyEssentialExpenses: String(monthlyExpenses),
      currentFundAmount: "0",
    }).onConflictDoNothing();
  }

  // Step 6: Create a goal if provided
  if (body.goal && body.goal.name && body.goal.targetAmount > 0) {
    const goalIcons: Record<string, string> = {
      emergency: "shield", house: "home", car: "car", travel: "plane", retirement: "target",
    };
    const goalColors: Record<string, string> = {
      emergency: "#34D399", house: "#60A5FA", car: "#A78BFA", travel: "#C9A84C", retirement: "#FBBF24",
    };
    await db.insert(goals).values({
      userId, name: body.goal.name,
      targetAmount: String(body.goal.targetAmount),
      currentAmount: "0",
      targetDate: body.goal.targetDate || null,
      icon: goalIcons[body.goal.type] || "target",
      color: goalColors[body.goal.type] || "#C9A84C",
      category: body.goal.type === "emergency" ? "emergency" : body.goal.type === "house" ? "purchase" : body.goal.type === "travel" ? "travel" : "other",
    });
  }

  // Mark onboarding as completed
  const existing = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  if (existing.length > 0) {
    await db.update(userSettings).set({ onboardingCompleted: true, updatedAt: new Date() }).where(eq(userSettings.userId, userId));
  } else {
    await db.insert(userSettings).values({ userId, onboardingCompleted: true });
  }

  return NextResponse.json({ success: true });
}