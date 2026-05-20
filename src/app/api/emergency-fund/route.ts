import { NextRequest, NextResponse } from "next/server";
import { getAppSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { emergencyFund } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { parseBody, updateEmergencyFundSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const session = await getAppSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [ef] = await db.select().from(emergencyFund).where(eq(emergencyFund.userId, session.user.id)).limit(1);
  return NextResponse.json(ef || null);
}

export async function PUT(request: NextRequest) {
  const session = await getAppSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: body, error } = await parseBody(request, updateEmergencyFundSchema);
  if (!body) return NextResponse.json({ error }, { status: 400 });

  const existing = await db.select().from(emergencyFund).where(eq(emergencyFund.userId, session.user.id)).limit(1);

  if (existing.length > 0) {
    const [updated] = await db.update(emergencyFund)
      .set({
        targetMonths: body.targetMonths ?? existing[0].targetMonths,
        monthlyEssentialExpenses: body.monthlyEssentialExpenses !== undefined ? String(body.monthlyEssentialExpenses) : undefined,
        currentFundAmount: body.currentFundAmount !== undefined ? String(body.currentFundAmount) : undefined,
        linkedAssetIds: body.linkedAssetIds ?? existing[0].linkedAssetIds,
        updatedAt: new Date(),
      })
      .where(eq(emergencyFund.userId, session.user.id))
      .returning();
    return NextResponse.json(updated);
  } else {
    const [created] = await db.insert(emergencyFund).values({
      userId: session.user.id,
      targetMonths: body.targetMonths || 6,
      monthlyEssentialExpenses: String(body.monthlyEssentialExpenses || 0),
      currentFundAmount: String(body.currentFundAmount || 0),
      linkedAssetIds: body.linkedAssetIds || [],
    }).returning();
    return NextResponse.json(created, { status: 201 });
  }
}