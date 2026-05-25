import { NextRequest, NextResponse } from "next/server";
import { getAppSession } from "@/lib/get-session";
import { generateRecurringTransactions } from "@/lib/recurring";

export async function POST(request: NextRequest) {
  const session = await getAppSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  try {
    const generated = await generateRecurringTransactions(userId);
    return NextResponse.json({ generated });
  } catch (err) {
    console.error("Failed to generate recurring transactions:", err);
    return NextResponse.json({ error: "Failed to generate" }, { status: 500 });
  }
}