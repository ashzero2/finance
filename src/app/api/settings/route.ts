import { NextRequest, NextResponse } from "next/server";
import { getAppSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { userSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { parseBody, updateSettingsSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const session = await getAppSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, session.user.id)).limit(1);
  return NextResponse.json(settings || { currency: "INR", financialMonthStartDay: 1, weeklyReviewDay: "sunday", theme: "dark", onboardingCompleted: false });
}

export async function PUT(request: NextRequest) {
  const session = await getAppSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: body, error } = await parseBody(request, updateSettingsSchema);
  if (!body) return NextResponse.json({ error }, { status: 400 });

  const existing = await db.select().from(userSettings).where(eq(userSettings.userId, session.user.id)).limit(1);

  if (existing.length > 0) {
    // Filter out undefined values to avoid overwriting DB with NULL
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.currency !== undefined) updates.currency = body.currency;
    if (body.financialMonthStartDay !== undefined) updates.financialMonthStartDay = body.financialMonthStartDay;
    if (body.weeklyReviewDay !== undefined) updates.weeklyReviewDay = body.weeklyReviewDay;
    if (body.theme !== undefined) updates.theme = body.theme;

    const [updated] = await db.update(userSettings).set(updates)
      .where(eq(userSettings.userId, session.user.id)).returning();
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