import { NextRequest, NextResponse } from "next/server";
import { getAppSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { assets, assetSnapshots } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateInsights } from "@/lib/insights";
import { parseBody, createAssetSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const session = await getAppSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userAssets = await db.select().from(assets).where(eq(assets.userId, session.user.id));
  return NextResponse.json(userAssets);
}

export async function POST(request: NextRequest) {
  const session = await getAppSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: body, error } = await parseBody(request, createAssetSchema);
  if (!body) return NextResponse.json({ error }, { status: 400 });

  const [asset] = await db.insert(assets).values({
    userId: session.user.id,
    name: body.name,
    category: body.category,
    subCategory: body.subCategory || null,
    currentValue: String(body.currentValue),
    isLiquid: body.isLiquid,
    liquidityDays: body.liquidityDays,
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
