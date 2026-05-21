"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { FadeIn } from "@/components/ui/fade-in";
import { TabPill } from "@/components/ui/tab-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { MiniDonut } from "@/components/ui/mini-donut";
import { Sparkline } from "@/components/ui/sparkline";
import { PageSkeleton } from "@/components/ui/skeleton";
import { formatINR } from "@/lib/utils";

// ── Types ──

interface MonthlyTrend {
  month: string;
  label: string;
  income: number;
  expense: number;
  net: number;
}

interface CategoryItem {
  categoryId: string;
  name: string;
  color: string;
  icon: string;
  amount: number;
  pct: number;
}

interface CategoryTrend {
  categoryId: string;
  name: string;
  color: string;
  data: number[];
}

interface ReportData {
  period: string;
  rangeMonths: number;
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netSavings: number;
    avgMonthlyIncome: number;
    avgMonthlyExpense: number;
    avgSavingsRate: number;
    highestExpenseMonth: string;
    highestExpenseAmount: number;
  };
  monthlyTrends: MonthlyTrend[];
  expenseBreakdown: CategoryItem[];
  incomeBreakdown: CategoryItem[];
  categoryTrends: CategoryTrend[];
}

// ── Main Component ──

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("monthly");
  const [months, setMonths] = useState(6);
  const [breakdownTab, setBreakdownTab] = useState("expenses");

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch(`/api/reports?period=${period}&months=${months}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [period, months]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <PageSkeleton rows={8} />;

  if (!data) {
    return (
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 6 }}>Reports</h1>
        <EmptyState icon="pie-chart" title="No data available" subtitle="Add transactions to see spending reports" />
      </div>
    );
  }

  const { summary, monthlyTrends, expenseBreakdown, incomeBreakdown, categoryTrends } = data;
  const breakdown = breakdownTab === "expenses" ? expenseBreakdown : incomeBreakdown;

  return (
    <div>
      <FadeIn delay={0}>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 6 }}>Reports</h1>
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 16 }}>
          Spending trends & category analysis
        </p>
      </FadeIn>

      {/* Period Controls */}
      <FadeIn delay={40}>
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <TabPill
            tabs={[
              { id: "monthly", label: "Monthly" },
              { id: "yearly", label: "Yearly" },
            ]}
            active={period}
            onChange={setPeriod}
          />
          {period === "monthly" && (
            <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
              {[3, 6, 12].map((m) => (
                <button
                  key={m}
                  onClick={() => setMonths(m)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-subtle)",
                    background: months === m ? "var(--accent)" : "var(--bg-elevated)",
                    color: months === m ? "var(--bg-root)" : "var(--text-secondary)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  {m}M
                </button>
              ))}
            </div>
          )}
        </div>
      </FadeIn>

      {/* Summary Cards */}
      <FadeIn delay={80}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 20 }}>
          <SummaryCard label="Total Income" value={summary.totalIncome} color="var(--positive)" />
          <SummaryCard label="Total Expenses" value={summary.totalExpenses} color="var(--negative)" />
          <SummaryCard label="Net Savings" value={summary.netSavings} color={summary.netSavings >= 0 ? "var(--positive)" : "var(--negative)"} />
          <SummaryCard label="Avg Savings Rate" value={summary.avgSavingsRate} isMoney={false} suffix="%" color="var(--accent)" />
        </div>
      </FadeIn>

      {/* Income vs Expense Bar Chart */}
      <FadeIn delay={120}>
        <Card style={{ padding: "20px", marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Income vs Expenses</div>
          {monthlyTrends.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-tertiary)", textAlign: "center", padding: 20 }}>No data</p>
          ) : (
            <BarChart trends={monthlyTrends} />
          )}
        </Card>
      </FadeIn>

      {/* Net Savings Trend */}
      <FadeIn delay={160}>
        <Card style={{ padding: "20px", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Net Savings Trend</div>
            <div className="mono" style={{
              fontSize: 14, fontWeight: 600,
              color: summary.netSavings >= 0 ? "var(--positive)" : "var(--negative)",
            }}>
              {formatINR(summary.netSavings, { compact: true })}
            </div>
          </div>
          <Sparkline
            data={monthlyTrends.map((m) => m.net)}
            width={600}
            height={60}
            color={summary.netSavings >= 0 ? "var(--positive)" : "var(--negative)"}
            id="net-savings"
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            {monthlyTrends.map((m, i) => (
              <span key={m.month} style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
                {i === 0 || i === monthlyTrends.length - 1 ? m.label : ""}
              </span>
            ))}
          </div>
        </Card>
      </FadeIn>

      {/* Category Breakdown */}
      <FadeIn delay={200}>
        <Card style={{ padding: "20px", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Category Breakdown</div>
            <TabPill
              tabs={[
                { id: "expenses", label: "Expenses" },
                { id: "income", label: "Income" },
              ]}
              active={breakdownTab}
              onChange={setBreakdownTab}
            />
          </div>

          {breakdown.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-tertiary)", textAlign: "center", padding: 20 }}>
              No {breakdownTab} data
            </p>
          ) : (
            <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
              {/* Donut */}
              <div style={{ flexShrink: 0 }}>
                <MiniDonut
                  segments={breakdown.map((c) => ({ value: c.amount, color: c.color }))}
                  size={130}
                  strokeWidth={18}
                />
              </div>

              {/* Legend + list */}
              <div style={{ flex: 1, minWidth: 200 }}>
                {breakdown.map((cat, i) => (
                  <div
                    key={cat.categoryId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 0",
                      borderBottom: i < breakdown.length - 1 ? "1px solid var(--border-subtle)" : "none",
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: cat.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{cat.name}</span>
                    <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                      {formatINR(cat.amount, { compact: true })}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-tertiary)", width: 40, textAlign: "right" }}>
                      {cat.pct}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </FadeIn>

      {/* Top Category Trends (sparklines) */}
      {categoryTrends.length > 0 && (
        <FadeIn delay={240}>
          <Card style={{ padding: "20px", marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
              Top Expense Categories Over Time
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {categoryTrends.map((ct) => (
                <div key={ct.categoryId} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: ct.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 500, width: 80, flexShrink: 0 }}>{ct.name}</span>
                  <div style={{ flex: 1 }}>
                    <Sparkline data={ct.data} width={200} height={32} color={ct.color} id={`cat-${ct.categoryId}`} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </FadeIn>
      )}

      {/* Highest Spending Month */}
      <FadeIn delay={280}>
        <Card style={{ padding: "16px 20px", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: "var(--radius-sm)",
              background: "var(--negative-dim)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Icon name="trending-up" size={18} color="var(--negative)" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Highest Spending Month</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{summary.highestExpenseMonth}</div>
            </div>
            <div className="mono" style={{ fontSize: 16, fontWeight: 600, color: "var(--negative)" }}>
              {formatINR(summary.highestExpenseAmount, { compact: true })}
            </div>
          </div>
        </Card>
      </FadeIn>

      {/* Avg Monthly Stats */}
      <FadeIn delay={320}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          <Card style={{ padding: "16px 20px" }}>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 4 }}>Avg Monthly Income</div>
            <div className="mono" style={{ fontSize: 18, fontWeight: 600, color: "var(--positive)" }}>
              {formatINR(summary.avgMonthlyIncome, { compact: true })}
            </div>
          </Card>
          <Card style={{ padding: "16px 20px" }}>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 4 }}>Avg Monthly Expense</div>
            <div className="mono" style={{ fontSize: 18, fontWeight: 600, color: "var(--negative)" }}>
              {formatINR(summary.avgMonthlyExpense, { compact: true })}
            </div>
          </Card>
        </div>
      </FadeIn>

      <div style={{ height: 32 }} />
    </div>
  );
}

// ── Summary Card ──

function SummaryCard({ label, value, color, isMoney = true, suffix = "" }: {
  label: string;
  value: number;
  color: string;
  isMoney?: boolean;
  suffix?: string;
}) {
  return (
    <Card style={{ padding: "14px 16px" }}>
      <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </div>
      <div className="mono" style={{ fontSize: 17, fontWeight: 700, color }}>
        {isMoney ? formatINR(value, { compact: true }) : `${value}${suffix}`}
      </div>
    </Card>
  );
}

// ── Bar Chart (Income vs Expenses) ──

function BarChart({ trends }: { trends: MonthlyTrend[] }) {
  const maxVal = Math.max(...trends.map((t) => Math.max(t.income, t.expense)), 1);
  const barWidth = Math.max(12, Math.min(28, Math.floor(500 / trends.length / 2.5)));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 160, padding: "0 4px" }}>
        {trends.map((t) => {
          const incomeH = (t.income / maxVal) * 140;
          const expenseH = (t.expense / maxVal) * 140;
          return (
            <div key={t.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 140 }}>
                <div
                  title={`Income: ${formatINR(t.income)}`}
                  style={{
                    width: barWidth,
                    height: Math.max(2, incomeH),
                    background: "var(--positive)",
                    borderRadius: "3px 3px 0 0",
                    opacity: 0.85,
                    transition: "height 0.3s ease",
                  }}
                />
                <div
                  title={`Expense: ${formatINR(t.expense)}`}
                  style={{
                    width: barWidth,
                    height: Math.max(2, expenseH),
                    background: "var(--negative)",
                    borderRadius: "3px 3px 0 0",
                    opacity: 0.85,
                    transition: "height 0.3s ease",
                  }}
                />
              </div>
              <span style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 4 }}>{t.label}</span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-tertiary)" }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--positive)" }} />
          Income
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-tertiary)" }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--negative)" }} />
          Expenses
        </div>
      </div>
    </div>
  );
}
