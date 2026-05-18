import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { insights } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { generateInsights } from "@/lib/insights";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userInsights = await db.select().from(insights)
    .where(and(eq(insights.userId, session.user.id), eq(insights.isDismissed, false)))
    .orderBy(desc(insights.generatedAt)).limit(20);

  return NextResponse.json(userInsights);
}

// POST triggers insight regeneration
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const generated = await generateInsights(session.user.id);
  return NextResponse.json({ generated });
}

// PATCH to dismiss an insight
export async function PATCH(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { id, action } = body;

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  if (action === "dismiss") {
    await db.update(insights)
      .set({ isDismissed: true })
      .where(and(eq(insights.id, id), eq(insights.userId, session.user.id)));
  } else if (action === "read") {
    await db.update(insights)
      .set({ isRead: true })
      .where(and(eq(insights.id, id), eq(insights.userId, session.user.id)));
  }

  return NextResponse.json({ success: true });
}