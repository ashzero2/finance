import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { assets, assetSnapshots } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateInsights } from "@/lib/insights";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userAssets = await db.select().from(assets).where(eq(assets.userId, session.user.id));
  return NextResponse.json(userAssets);
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const [asset] = await db.insert(assets).values({
    userId: session.user.id,
    name: body.name,
    category: body.category,
    subCategory: body.subCategory || null,
    currentValue: String(body.currentValue || 0),
    isLiquid: body.isLiquid || false,
    liquidityDays: body.liquidityDays || 0,
    institution: body.institution || null,
    notes: body.notes || null,
  }).returning();

  // Create initial snapshot for change tracking
  if (Number(body.currentValue || 0) > 0) {
    await db.insert(assetSnapshots).values({
      assetId: asset.id,
      value: String(body.currentValue),
      recordedAt: new Date().toISOString().split("T")[0],
      source: "manual",
    });
  }

  // Auto-regenerate insights after adding an asset
  generateInsights(session.user.id).catch(() => {});

  return NextResponse.json(asset, { status: 201 });
}
