import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { parseBody, updateTransactionSchema } from "@/lib/validations";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { data: body, error } = await parseBody(request, updateTransactionSchema);
  if (!body) return NextResponse.json({ error }, { status: 400 });

  try {
    const [updated] = await db.update(transactions)
      .set({
        type: body.type ?? undefined,
        amount: body.amount !== undefined ? String(Math.abs(body.amount)) : undefined,
        categoryId: body.categoryId ?? undefined,
        description: body.description ?? undefined,
        date: body.date ?? undefined,
        updatedAt: new Date(),
      })
      .where(and(eq(transactions.id, id), eq(transactions.userId, session.user.id)))
      .returning();

    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [deleted] = await db.delete(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, session.user.id)))
    .returning();

  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}