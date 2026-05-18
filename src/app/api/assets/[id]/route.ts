import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { assets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

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
  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [deleted] = await db.delete(assets)
    .where(and(eq(assets.id, id), eq(assets.userId, session.user.id)))
    .returning();

  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}