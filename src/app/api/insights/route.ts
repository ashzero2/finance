import { NextRequest, NextResponse } from "next/server";
import { getAppSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { insights } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { generateInsights } from "@/lib/insights";
import { parseBody, insightActionSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const session = await getAppSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userInsights = await db.select().from(insights)
    .where(and(eq(insights.userId, session.user.id), eq(insights.isDismissed, false)))
    .orderBy(desc(insights.generatedAt)).limit(20);

  return NextResponse.json(userInsights);
}

// POST triggers insight regeneration
export async function POST(request: NextRequest) {
  const session = await getAppSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const generated = await generateInsights(session.user.id);
  return NextResponse.json({ generated });
}

// PATCH to dismiss an insight
export async function PATCH(request: NextRequest) {
  const session = await getAppSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: body, error } = await parseBody(request, insightActionSchema);
  if (!body) return NextResponse.json({ error }, { status: 400 });

  const { id, action } = body;

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