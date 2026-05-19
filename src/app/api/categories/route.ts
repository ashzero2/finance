import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { eq, or, isNull, and } from "drizzle-orm";
import { parseBody, createCategorySchema, updateCategorySchema } from "@/lib/validations";

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

  const { data: body, error } = await parseBody(request, createCategorySchema);
  if (!body) return NextResponse.json({ error }, { status: 400 });

  const [category] = await db.insert(categories).values({
    userId: session.user.id,
    name: body.name,
    type: body.type,
    icon: body.icon,
    color: body.color,
    isEssential: body.isEssential,
    sortOrder: body.sortOrder,
  }).returning();

  return NextResponse.json(category, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: body, error } = await parseBody(request, updateCategorySchema);
  if (!body) return NextResponse.json({ error }, { status: 400 });

  // Only allow editing user's own categories (not system defaults)
  const [updated] = await db.update(categories)
    .set({
      name: body.name,
      icon: body.icon,
      color: body.color,
      isEssential: body.isEssential,
      sortOrder: body.sortOrder,
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
