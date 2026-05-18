import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { assets, assetSnapshots } from "@/lib/db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get all user's asset IDs
  const userAssets = await db
    .select({ id: assets.id })
    .from(assets)
    .where(eq(assets.userId, session.user.id));

  if (userAssets.length === 0) {
    return NextResponse.json({});
  }

  const assetIds = userAssets.map((a) => a.id);

  // Get all snapshots for user's assets, ordered by date desc
  const snapshots = await db
    .select()
    .from(assetSnapshots)
    .where(inArray(assetSnapshots.assetId, assetIds))
    .orderBy(desc(assetSnapshots.recordedAt));

  // Group snapshots by assetId, compute change info
  const result: Record<
    string,
    {
      previousValue: number | null;
      previousDate: string | null;
      change: number;
      changePercent: number;
      history: { value: number; date: string }[];
    }
  > = {};

  for (const assetId of assetIds) {
    const assetSnaps = snapshots.filter((s) => s.assetId === assetId);
    if (assetSnaps.length === 0) {
      result[assetId] = {
        previousValue: null,
        previousDate: null,
        change: 0,
        changePercent: 0,
        history: [],
      };
      continue;
    }

    // Most recent snapshot is the "previous" value (before the current live value)
    const latest = assetSnaps[0];
    const previousValue = Number(latest.value);
    const previousDate = latest.recordedAt;

    // Build history (last 12 entries)
    const history = assetSnaps.slice(0, 12).map((s) => ({
      value: Number(s.value),
      date: s.recordedAt,
    }));

    result[assetId] = {
      previousValue,
      previousDate,
      change: 0, // Will be computed on client with current value
      changePercent: 0,
      history,
    };
  }

  return NextResponse.json(result);
}