"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { FadeIn } from "@/components/ui/fade-in";
import { EmptyState } from "@/components/ui/empty-state";
import { formatINR } from "@/lib/utils";

interface UpcomingItem {
  id: string; name: string; amount: number; date: string; type: string;
}

export default function CalendarPage() {
  const [items, setItems] = useState<UpcomingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // For MVP, upcoming items come from recurring transactions / liabilities EMIs
    // This is a placeholder that will be populated when the user has recurring data
    fetch("/api/dashboard").then(r => r.json())
      .then(data => {
        // Extract upcoming-like items from liabilities with EMIs
        const upcoming: UpcomingItem[] = [];
        if (data.recentTransactions) {
          data.recentTransactions.forEach((t: { id: string; name: string; amount: number; date: string; type: string }) => {
            upcoming.push({ id: t.id, name: t.name, amount: Math.abs(t.amount), date: t.date, type: t.type === "income" ? "income" : "expense" });
          });
        }
        setItems(upcoming);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const typeColors: Record<string, string> = {
    sip: "var(--info)", bill: "var(--negative)", rent: "var(--warning)",
    emi: "var(--negative)", insurance: "var(--accent)", income: "var(--positive)", expense: "var(--text-tertiary)",
  };

  if (loading) return <div style={{ padding: "48px 0", textAlign: "center", color: "var(--text-tertiary)" }}>Loading calendar...</div>;

  return (
    <div>
      <FadeIn delay={0}>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 6 }}>Calendar</h1>
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 20 }}>
          Upcoming financial events
        </p>
      </FadeIn>

      {items.length === 0 ? (
        <EmptyState icon="calendar" title="No upcoming events" subtitle="Add transactions and recurring expenses to see upcoming events here" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((item, i) => {
            const d = new Date(item.date + "T00:00:00");
            const color = typeColors[item.type] || "var(--text-tertiary)";
            return (
              <FadeIn key={item.id} delay={100 + i * 40}>
                <Card style={{ padding: "16px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: "var(--radius-md)",
                      background: "var(--bg-elevated)", display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center", flexShrink: 0,
                      border: "1px solid var(--border-subtle)",
                    }}>
                      <span style={{ fontSize: 10, color: "var(--text-tertiary)", textTransform: "uppercase", lineHeight: 1 }}>
                        {d.toLocaleDateString("en-IN", { month: "short" })}
                      </span>
                      <span className="mono" style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2 }}>
                        {d.getDate()}
                      </span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{item.name}</div>
                      <div style={{ fontSize: 11, color, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        {item.type}
                      </div>
                    </div>
                    <span className="mono" style={{ fontSize: 15, fontWeight: 600, flexShrink: 0 }}>
                      {formatINR(item.amount, { compact: true })}
                    </span>
                  </div>
                </Card>
              </FadeIn>
            );
          })}
        </div>
      )}
      <div style={{ height: 32 }} />
    </div>
  );
}