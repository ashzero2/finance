import { NextRequest, NextResponse } from "next/server";
import { getAppSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { assets, assetSnapshots, goals } from "@/lib/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { generateInsights } from "@/lib/insights";
import { parseBody, updateAssetSchema } from "@/lib/validations";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAppSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { data: body, error } = await parseBody(request, updateAssetSchema);
  if (!body) return NextResponse.json({ error }, { status: 400 });

  // Save snapshot of old value before updating
  if (body.currentValue !== undefined) {
    const [existing] = await db.select({ id: assets.id, currentValue: assets.currentValue })
      .from(assets).where(and(eq(assets.id, id), eq(assets.userId, session.user.id)));
    if (existing && String(existing.currentValue) !== String(body.currentValue)) {
      await db.insert(assetSnapshots).values({
        assetId: id,
        value: existing.currentValue,
        recordedAt: new Date().toISOString().split("T")[0],
        source: "manual",
      });
    }
  }

  const [updated] = await db.update(assets)
    .set({
      name: body.name,
      category: body.category,
      subCategory: body.subCategory ?? undefined,
      currentValue: body.currentValue !== undefined ? String(body.currentValue) : undefined,
      isLiquid: body.isLiquid,
      liquidityDays: body.liquidityDays,
      institution: body.institution ?? undefined,
      notes: body.notes ?? undefined,
      updatedAt: new Date(),
    })
    .where(and(eq(assets.id, id), eq(assets.userId, session.user.id)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Auto-sync linked goals: update currentAmount for any goals linked to this asset
  syncLinkedGoals(session.user.id, id).catch(() => {});

  // Auto-regenerate insights after asset update
  generateInsights(session.user.id).catch(() => {});

  return NextResponse.json(updated);
}

/** Recalculate currentAmount for all goals linked to a specific asset */
async function syncLinkedGoals(userId: string, assetId: string) {
  // Find all goals that have this asset in their linkedAssetIds
  const userGoals = await db.select().from(goals)
    .where(eq(goals.userId, userId));

  for (const goal of userGoals) {
    const linkedIds: string[] = (goal.linkedAssetIds as string[]) || [];
    if (!linkedIds.includes(assetId)) continue;

    // Sum up all linked asset values
    if (linkedIds.length > 0) {
      const linkedAssets = await db.select({ currentValue: assets.currentValue })
        .from(assets)
        .where(and(eq(assets.userId, userId), inArray(assets.id, linkedIds)));
      const totalValue = linkedAssets.reduce((sum, a) => sum + Number(a.currentValue), 0);

      await db.update(goals)
        .set({ currentAmount: String(totalValue), updatedAt: new Date() })
        .where(eq(goals.id, goal.id));
    }
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAppSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [deleted] = await db.delete(assets)
    .where(and(eq(assets.id, id), eq(assets.userId, session.user.id)))
    .returning();

  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}