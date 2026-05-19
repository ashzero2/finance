import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { eq, or, isNull, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Return system defaults (userId = null) + user's custom categories
  const results = await db.select().from(categories)
    .where(or(isNull(categories.userId), eq(categories.userId, session.user.id)));

  return NextResponse.json(results);
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  if (!body.name || !body.type) {
    return NextResponse.json({ error: "Name and type are required" }, { status: 400 });
  }

  if (body.type !== "income" && body.type !== "expense") {
    return NextResponse.json({ error: "Type must be 'income' or 'expense'" }, { status: 400 });
  }

  const [category] = await db.insert(categories).values({
    userId: session.user.id,
    name: String(body.name).slice(0, 50),
    type: body.type,
    icon: body.icon || "circle",
    color: body.color || "#8B8B96",
    isEssential: body.isEssential || false,
    sortOrder: body.sortOrder || 0,
  }).returning();

  return NextResponse.json(category, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  if (!body.id) {
    return NextResponse.json({ error: "Category ID is required" }, { status: 400 });
  }

  // Only allow editing user's own categories (not system defaults)
  const [updated] = await db.update(categories)
    .set({
      name: body.name ? String(body.name).slice(0, 50) : undefined,
      icon: body.icon ?? undefined,
      color: body.color ?? undefined,
      isEssential: body.isEssential ?? undefined,
      sortOrder: body.sortOrder ?? undefined,
    })
    .where(and(eq(categories.id, body.id), eq(categories.userId, session.user.id)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found or not editable" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Category ID is required" }, { status: 400 });
  }

  // Only allow deleting user's own categories (not system defaults)
  const [deleted] = await db.delete(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, session.user.id)))
    .returning();

  if (!deleted) return NextResponse.json({ error: "Not found or not deletable" }, { status: 404 });
  return NextResponse.json({ success: true });
}
