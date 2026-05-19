"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { FadeIn } from "@/components/ui/fade-in";
import { EmptyState } from "@/components/ui/empty-state";
import { formatINR, formatDateShort } from "@/lib/utils";

interface UpcomingItem {
  id: string;
  name: string;
  amount: number;
  date: string;
  type: "emi" | "expense" | "income" | "event";
}

interface Liability {
  id: string;
  name: string;
  emiAmount: string | null;
  emiDay: number | null;
  outstandingAmount: string;
  category: string;
}

interface Transaction {
  id: string;
  name: string;
  amount: number;
  date: string;
  type: string;
}

export default function CalendarPage() {
  const [items, setItems] = useState<UpcomingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard").then((r) => (r.ok ? r.json() : {})),
      fetch("/api/liabilities").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([dashData, liabsData]: [Record<string, unknown>, Liability[]]) => {
        const upcoming: UpcomingItem[] = [];
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Generate upcoming EMI dates from liabilities
        const liabs = Array.isArray(liabsData) ? liabsData : [];
        for (const li of liabs) {
          if (li.emiAmount && Number(li.emiAmount) > 0) {
            const emiDay = li.emiDay || 5;
            // Current month EMI
            const emiDate = new Date(currentYear, currentMonth, emiDay);
            if (emiDate >= now) {
              upcoming.push({
                id: `emi-${li.id}-${currentMonth}`,
                name: `${li.name} EMI`,
                amount: Number(li.emiAmount),
                date: emiDate.toISOString().split("T")[0],
                type: "emi",
              });
            }
            // Next month EMI
            const nextEmiDate = new Date(currentYear, currentMonth + 1, emiDay);
            upcoming.push({
              id: `emi-${li.id}-${currentMonth + 1}`,
              name: `${li.name} EMI`,
              amount: Number(li.emiAmount),
              date: nextEmiDate.toISOString().split("T")[0],
              type: "emi",
            });
          }
        }

        // Add recent transactions as past events
        const txns = (dashData.recentTransactions as Transaction[] | undefined) || [];
        for (const t of txns) {
          upcoming.push({
            id: t.id,
            name: t.name,
            amount: Math.abs(t.amount),
            date: t.date,
            type: t.type === "income" ? "income" : "expense",
          });
        }

        // Sort by date ascending (upcoming first)
        upcoming.sort((a, b) => a.date.localeCompare(b.date));

        setItems(upcoming);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const typeConfig: Record<string, { color: string; label: string }> = {
    emi: { color: "var(--negative)", label: "EMI" },
    expense: { color: "var(--text-tertiary)", label: "Expense" },
    income: { color: "var(--positive)", label: "Income" },
    event: { color: "var(--accent)", label: "Event" },
  };

  if (loading)
    return (
      <div
        style={{
          padding: "48px 0",
          textAlign: "center",
          color: "var(--text-tertiary)",
        }}
      >
        Loading calendar...
      </div>
    );

  // Split into upcoming and past
  const today = new Date().toISOString().split("T")[0];
  const upcomingItems = items.filter((i) => i.date >= today);
  const pastItems = items.filter((i) => i.date < today);

  return (
    <div>
      <FadeIn delay={0}>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 6 }}>Calendar</h1>
        <p
          style={{
            fontSize: 13,
            color: "var(--text-tertiary)",
            marginBottom: 20,
          }}
        >
          Upcoming payments & recent transactions
        </p>
      </FadeIn>

      {items.length === 0 ? (
        <EmptyState
          icon="calendar"
          title="No upcoming events"
          subtitle="Add liabilities with EMIs or transactions to see events here"
        />
      ) : (
        <>
          {/* Upcoming section */}
          {upcomingItems.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-tertiary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  marginBottom: 10,
                }}
              >
                Upcoming
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {upcomingItems.map((item, i) => (
                  <CalendarItem
                    key={item.id}
                    item={item}
                    typeConfig={typeConfig}
                    delay={100 + i * 40}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Past section */}
          {pastItems.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-tertiary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  marginBottom: 10,
                }}
              >
                Recent
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {pastItems.map((item, i) => (
                  <CalendarItem
                    key={item.id}
                    item={item}
                    typeConfig={typeConfig}
                    delay={100 + upcomingItems.length * 40 + i * 40}
                    dimmed
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
      <div style={{ height: 32 }} />
    </div>
  );
}

function CalendarItem({
  item,
  typeConfig,
  delay,
  dimmed = false,
}: {
  item: UpcomingItem;
  typeConfig: Record<string, { color: string; label: string }>;
  delay: number;
  dimmed?: boolean;
}) {
  const d = new Date(item.date + "T00:00:00");
  const config = typeConfig[item.type] || typeConfig.expense;

  return (
    <FadeIn delay={delay}>
      <Card
        style={{
          padding: "16px 20px",
          opacity: dimmed ? 0.6 : 1,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "var(--radius-md)",
              background: "var(--bg-elevated)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              border: "1px solid var(--border-subtle)",
            }}
          >
            <span
              style={{
                fontSize: 10,
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                lineHeight: 1,
              }}
            >
              {d.toLocaleDateString("en-IN", { month: "short" })}
            </span>
            <span
              className="mono"
              style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2 }}
            >
              {d.getDate()}
            </span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>
              {item.name}
            </div>
            <div
              style={{
                fontSize: 11,
                color: config.color,
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              {config.label}
            </div>
          </div>
          <span
            className="mono"
            style={{
              fontSize: 15,
              fontWeight: 600,
              flexShrink: 0,
              color:
                item.type === "income"
                  ? "var(--positive)"
                  : item.type === "emi"
                    ? "var(--negative)"
                    : "var(--text-primary)",
            }}
          >
            {item.type === "income" ? "+" : "-"}
            {formatINR(item.amount, { compact: true })}
          </span>
        </div>
      </Card>
    </FadeIn>
  );
}