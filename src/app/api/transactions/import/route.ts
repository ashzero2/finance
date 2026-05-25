import { NextRequest, NextResponse } from "next/server";
import { getAppSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));
    if (values.length !== headers.length) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, j) => { row[h] = values[j]; });
    rows.push(row);
  }

  return rows;
}

function inferType(row: Record<string, string>): "income" | "expense" {
  const type = (row.type || row.category_type || "").toLowerCase();
  if (type === "income" || type === "credit") return "income";
  const amount = parseFloat(row.amount || row.value || "0");
  return amount > 0 && !type ? "expense" : "expense";
}

function inferDate(row: Record<string, string>): string {
  const raw = row.date || row.transaction_date || row.txn_date || "";
  // Try ISO format first
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // Try DD/MM/YYYY or DD-MM-YYYY
  const match = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (match) {
    const [, d, m, y] = match;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // Try MM/DD/YYYY
  const match2 = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (match2) return `${match2[3]}-${match2[1].padStart(2, "0")}-${match2[2].padStart(2, "0")}`;
  return new Date().toISOString().split("T")[0];
}

export async function POST(request: NextRequest) {
  const session = await getAppSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const text = await file.text();
    const rows = parseCSV(text);

    if (rows.length === 0) {
      return NextResponse.json({ error: "No valid rows found in CSV" }, { status: 400 });
    }

    let imported = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const amountStr = row.amount || row.value || row.total || "";
      const amount = Math.abs(parseFloat(amountStr.replace(/[₹,\s]/g, "")));

      if (isNaN(amount) || amount === 0) {
        errors.push(`Row ${i + 2}: invalid amount "${amountStr}"`);
        continue;
      }

      const description = row.description || row.narration || row.particulars || row.remarks || row.name || "";
      const type = inferType(row);
      const date = inferDate(row);

      await db.insert(transactions).values({
        userId,
        type,
        amount: String(amount),
        description: description || null,
        date,
        isRecurring: false,
      });

      imported++;
    }

    return NextResponse.json({
      imported,
      total: rows.length,
      errors: errors.slice(0, 10),
    });
  } catch (err) {
    console.error("CSV import error:", err);
    return NextResponse.json({ error: "Failed to process CSV" }, { status: 500 });
  }
}