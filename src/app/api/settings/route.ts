import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { parseBody, updateSettingsSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, session.user.id)).limit(1);
  return NextResponse.json(settings || { currency: "INR", financialMonthStartDay: 1, weeklyReviewDay: "sunday", theme: "dark", onboardingCompleted: false });
}

export async function PUT(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: body, error } = await parseBody(request, updateSettingsSchema);
  if (!body) return NextResponse.json({ error }, { status: 400 });

  const existing = await db.select().from(userSettings).where(eq(userSettings.userId, session.user.id)).limit(1);

  if (existing.length > 0) {
    const [updated] = await db.update(userSettings).set({
      currency: body.currency, financialMonthStartDay: body.financialMonthStartDay,
      weeklyReviewDay: body.weeklyReviewDay, theme: body.theme, updatedAt: new Date(),
    }).where(eq(userSettings.userId, session.user.id)).returning();
    return NextResponse.json(updated);
  } else {
    const [created] = await db.insert(userSettings).values({
      userId: session.user.id, currency: body.currency || "INR",
      financialMonthStartDay: body.financialMonthStartDay || 1,
      weeklyReviewDay: body.weeklyReviewDay || "sunday", theme: body.theme || "dark",
    }).returning();
    return NextResponse.json(created, { status: 201 });
  }
}