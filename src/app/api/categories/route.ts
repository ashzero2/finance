import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { eq, or, isNull } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Return system defaults (userId = null) + user's custom categories
  const results = await db.select().from(categories)
    .where(or(isNull(categories.userId), eq(categories.userId, session.user.id)));

  return NextResponse.json(results);
}