import { NextRequest, NextResponse } from "next/server";
import { getAppSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { liabilities } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateInsights } from "@/lib/insights";
import { parseBody, createLiabilitySchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const session = await getAppSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userLiabilities = await db.select().from(liabilities).where(eq(liabilities.userId, session.user.id));
  return NextResponse.json(userLiabilities);
}

export async function POST(request: NextRequest) {
  const session = await getAppSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: body, error } = await parseBody(request, createLiabilitySchema);
  if (!body) return NextResponse.json({ error }, { status: 400 });

  const [liability] = await db.insert(liabilities).values({
    userId: session.user.id,
    name: body.name,
    category: body.category,
    principalAmount: String(body.principalAmount || 0),
    outstandingAmount: String(body.outstandingAmount || 0),
    interestRate: body.interestRate ? String(body.interestRate) : null,
    emiAmount: body.emiAmount ? String(body.emiAmount) : null,
    emiDay: body.emiDay || null,
    startDate: body.startDate || null,
    endDate: body.endDate || null,
    institution: body.institution || null,
    notes: body.notes || null,
  }).returning();

  // Auto-regenerate insights after adding a liability
  generateInsights(session.user.id).catch(() => {});

  return NextResponse.json(liability, { status: 201 });
}
