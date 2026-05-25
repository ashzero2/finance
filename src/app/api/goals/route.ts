import { NextRequest, NextResponse } from "next/server";
import { getAppSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { goals, assets } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { parseBody, createGoalSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const session = await getAppSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userGoals = await db.select().from(goals).where(eq(goals.userId, session.user.id));
  return NextResponse.json(userGoals);
}

export async function POST(request: NextRequest) {
  const session = await getAppSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: body, error } = await parseBody(request, createGoalSchema);
  if (!body) return NextResponse.json({ error }, { status: 400 });

  // If linked assets provided, calculate currentAmount from them
  let currentAmount = body.currentAmount || 0;
  const linkedIds = body.linkedAssetIds || [];
  if (linkedIds.length > 0) {
    const linkedAssets = await db.select({ currentValue: assets.currentValue })
      .from(assets)
      .where(and(eq(assets.userId, session.user.id), inArray(assets.id, linkedIds)));
    currentAmount = linkedAssets.reduce((sum, a) => sum + Number(a.currentValue), 0);
  }

  const [goal] = await db.insert(goals).values({
    userId: session.user.id,
    name: body.name,
    targetAmount: String(body.targetAmount || 0),
    currentAmount: String(currentAmount),
    targetDate: body.targetDate || null,
    priority: body.priority || "medium",
    category: body.category || "other",
    icon: body.icon || "target",
    color: body.color || "#C9A84C",
    monthlyContribution: body.monthlyContribution ? String(body.monthlyContribution) : null,
    linkedAssetIds: linkedIds,
  }).returning();

  return NextResponse.json(goal, { status: 201 });
}