import { NextRequest, NextResponse } from "next/server";
import { getAppSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { recurringTransactions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { parseBody, updateRecurringTransactionSchema } from "@/lib/validations";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAppSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { data: body, error } = await parseBody(request, updateRecurringTransactionSchema);
  if (!body) return NextResponse.json({ error }, { status: 400 });

  // Build update object from non-undefined fields
  const updateValues: Record<string, unknown> = {};
  if (body.type !== undefined) updateValues.type = body.type;
  if (body.amount !== undefined) updateValues.amount = String(body.amount);
  if (body.categoryId !== undefined) updateValues.categoryId = body.categoryId;
  if (body.description !== undefined) updateValues.description = body.description;
  if (body.frequency !== undefined) updateValues.frequency = body.frequency;
  if (body.dayOfMonth !== undefined) updateValues.dayOfMonth = body.dayOfMonth;
  if (body.startDate !== undefined) updateValues.startDate = body.startDate;
  if (body.endDate !== undefined) updateValues.endDate = body.endDate;
  if (body.isActive !== undefined) updateValues.isActive = body.isActive;

  if (Object.keys(updateValues).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const [updated] = await db
    .update(recurringTransactions)
    .set(updateValues)
    .where(
      and(
        eq(recurringTransactions.id, id),
        eq(recurringTransactions.userId, session.user.id)
      )
    )
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAppSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Soft delete: set isActive = false
  const [updated] = await db
    .update(recurringTransactions)
    .set({ isActive: false })
    .where(
      and(
        eq(recurringTransactions.id, id),
        eq(recurringTransactions.userId, session.user.id)
      )
    )
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}