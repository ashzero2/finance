import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { liabilities } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { generateInsights } from "@/lib/insights";
import { parseBody, updateLiabilitySchema } from "@/lib/validations";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { data: body, error } = await parseBody(request, updateLiabilitySchema);
  if (!body) return NextResponse.json({ error }, { status: 400 });

  const [updated] = await db.update(liabilities)
    .set({
      name: body.name,
      category: body.category,
      principalAmount: body.principalAmount !== undefined ? String(body.principalAmount) : undefined,
      outstandingAmount: body.outstandingAmount !== undefined ? String(body.outstandingAmount) : undefined,
      interestRate: body.interestRate !== undefined ? String(body.interestRate) : undefined,
      emiAmount: body.emiAmount !== undefined ? String(body.emiAmount) : undefined,
      emiDay: body.emiDay,
      startDate: body.startDate ?? undefined,
      endDate: body.endDate ?? undefined,
      institution: body.institution ?? undefined,
      notes: body.notes ?? undefined,
      updatedAt: new Date(),
    })
    .where(and(eq(liabilities.id, id), eq(liabilities.userId, session.user.id)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Auto-regenerate insights after liability update
  generateInsights(session.user.id).catch(() => {});

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [deleted] = await db.delete(liabilities)
    .where(and(eq(liabilities.id, id), eq(liabilities.userId, session.user.id)))
    .returning();

  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}