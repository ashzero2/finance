import { NextRequest, NextResponse } from "next/server";
import { getAppSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { goals } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { generateInsights } from "@/lib/insights";
import { parseBody, updateGoalSchema } from "@/lib/validations";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAppSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { data: body, error } = await parseBody(request, updateGoalSchema);
  if (!body) return NextResponse.json({ error }, { status: 400 });

  const [updated] = await db.update(goals)
    .set({
      name: body.name,
      targetAmount: body.targetAmount !== undefined ? String(body.targetAmount) : undefined,
      currentAmount: body.currentAmount !== undefined ? String(body.currentAmount) : undefined,
      targetDate: body.targetDate ?? undefined,
      priority: body.priority,
      category: body.category,
      icon: body.icon,
      color: body.color,
      monthlyContribution: body.monthlyContribution !== undefined ? String(body.monthlyContribution) : undefined,
      isCompleted: body.isCompleted,
      completedAt: body.isCompleted ? new Date() : undefined,
      updatedAt: new Date(),
    })
    .where(and(eq(goals.id, id), eq(goals.userId, session.user.id)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Auto-regenerate insights after goal update
  generateInsights(session.user.id).catch(() => {});

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAppSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [deleted] = await db.delete(goals)
    .where(and(eq(goals.id, id), eq(goals.userId, session.user.id)))
    .returning();

  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}