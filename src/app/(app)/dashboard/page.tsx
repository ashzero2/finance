"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { ChangeIndicator } from "@/components/ui/change-indicator";
import { Sparkline } from "@/components/ui/sparkline";
import { ProgressRing } from "@/components/ui/progress-ring";
import { FadeIn } from "@/components/ui/fade-in";
import { SectionHeader } from "@/components/ui/section-header";
import { formatINR, formatDateShort, getGreeting, getMonthsRemaining } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { PageSkeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface DashboardData {
  user: { name: string };
  netWorth: {
    current: number;
    previousMonth: number;
    change: number;
    changePercent: number;
    history: { month: string; value: number }[];
  };
  liquidity: { total: number; items: { name: string; amount: number; type: string }[] };
  monthly: {
    income: number;
    expenses: number;
    savings: number;
    savingsRate: number;
    breakdown: { category: string; amount: number; pct: number }[];
  };
  emergencyFund: { current: number; target: number; monthsCovered: number; targetMonths: number };
  runway: number;
  totalAssets: number;
  totalLiabilities: number;
  lastSnapshotDate: string | null;
  goals: { id: string; name: string; icon: string; target: number; saved: number; monthly: number; color: string; deadline: string | null; isCompleted: boolean }[];
  insights: { id: string; type: string; title: string; body: string; priority: string }[];
  recentTransactions: { id: string; date: string; name: string; amount: number; category: string; type: string }[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [snapshotting, setSnapshotting] = useState(false);
  const [snapshotWarnOpen, setSnapshotWarnOpen] = useState(false);
  const [lastSnapshotAt, setLastSnapshotAt] = useState<number>(0);
  const { showToast } = useToast();

  const canSnapshot = Date.now() - lastSnapshotAt > 60_000;

  const doSnapshot = async () => {
    setSnapshotting(true);
    try {
      const res = await fetch("/api/snapshots", { method: "POST" });
      if (res.ok) {
        setLastSnapshotAt(Date.now());
        showToast("Snapshot captured! Check Insights for trends.", "success");
        const r = await fetch("/api/dashboard");
        if (r.ok) setData(await r.json());
      } else if (res.status === 409) {
        showToast("Already taken a snapshot today.", "info");
      } else {
        showToast("Failed to take snapshot", "error");
      }
    } catch {
      showToast("Failed to take snapshot", "error");
    }
    setSnapshotting(false);
  };

  useEffect(() => {
    // Fire-and-forget: generate any pending recurring transactions
    fetch("/api/recurring-transactions/generate", { method: "POST" }).catch(() => {});

    fetch("/api/dashboard")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load dashboard");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <PageSkeleton rows={5} />;
  }

  if (error) {
    return (
      <div style={{ padding: "48px 0", textAlign: "center", color: "var(--negative)" }}>
        {error}
      </div>
    );
  }

  if (!data) return null;

  const hasData = data.totalAssets > 0 || data.totalLiabilities > 0 || data.recentTransactions.length > 0;

  return (
    <div>
      {/* Greeting */}
      <FadeIn delay={0}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>
              {getGreeting()}, {data.user.name || "there"}
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
              {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          {hasData && (() => {
            const today = new Date().toISOString().split("T")[0];
            const takenToday = data.lastSnapshotDate === today;
            const daysSince = data.lastSnapshotDate
              ? Math.floor((new Date(today).getTime() - new Date(data.lastSnapshotDate).getTime()) / 86_400_000)
              : null;
            const tooSoon = !takenToday && daysSince !== null && daysSince < 7;
            const label = snapshotting
              ? "Capturing..."
              : takenToday
                ? "Taken today"
                : daysSince !== null
                  ? `Snapshot · ${daysSince}d ago`
                  : "Snapshot";
            return (
              <Button
                variant="secondary"
                onClick={() => {
                  if (takenToday || !canSnapshot) return;
                  if (tooSoon) { setSnapshotWarnOpen(true); return; }
                  doSnapshot();
                }}
                disabled={snapshotting || takenToday || !canSnapshot}
              >
                <Icon name="camera" size={14} color="var(--text-secondary)" />
                {!canSnapshot ? "Wait..." : label}
              </Button>
            );
          })()}

        </div>
      </FadeIn>

      {/* Snapshot warning dialog — rendered outside flex container for proper centering */}
      {snapshotWarnOpen && (() => {
        const daysSince = data.lastSnapshotDate
          ? Math.floor((new Date(new Date().toISOString().split("T")[0]).getTime() - new Date(data.lastSnapshotDate).getTime()) / 86_400_000)
          : null;
        return (
          <ConfirmDialog
            title="Snapshot taken recently"
            message={`Your last snapshot was ${daysSince} day${daysSince === 1 ? "" : "s"} ago. Snapshots are most useful at weekly or monthly intervals — taking them too frequently won't generate meaningful trend insights. Take one anyway?`}
            confirmLabel="Take anyway"
            variant="default"
            onConfirm={() => { setSnapshotWarnOpen(false); doSnapshot(); }}
            onCancel={() => setSnapshotWarnOpen(false)}
          />
        );
      })()}

      {!hasData ? (
        <FadeIn delay={100}>
          <Card hover={false} style={{ padding: "40px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <Icon name="bar-chart" size={48} color="var(--border)" style={{ marginBottom: 8 }} />
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4, color: "var(--text-primary)" }}>
              Welcome to Finance
            </h2>
            <p style={{ fontSize: 14, color: "var(--text-tertiary)", lineHeight: 1.6, maxWidth: 360, margin: "0 auto", marginBottom: 8 }}>
              Get started by adding your financial data
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <Button onClick={() => router.push("/portfolio")}>
                <Icon name="plus" size={14} color="var(--bg-root)" /> Add Assets
              </Button>
              <Button variant="secondary" onClick={() => router.push("/cashflow")}>
                <Icon name="plus" size={14} /> Record Transaction
              </Button>
              <Button variant="secondary" onClick={() => router.push("/goals")}>
                <Icon name="target" size={14} /> Set a Goal
              </Button>
            </div>
          </Card>
        </FadeIn>
      ) : (
        <>
          {/* Net Worth Hero */}
          <FadeIn delay={50}>
            <Card hover={false} style={{ padding: 0, overflow: "hidden", position: "relative" }}>
              <div style={{
                position: "absolute", top: 0, right: 0, width: "50%", height: "100%",
                background: "radial-gradient(ellipse at 80% 30%, rgba(201,168,76,0.03), transparent 70%)",
                pointerEvents: "none",
              }} />
              <div style={{ padding: "28px 28px 24px", position: "relative" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 13, color: "var(--text-tertiary)", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
                      Net Worth
                    </div>
                    <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 10 }}>
                      <AnimatedNumber value={data.netWorth.current} delay={200} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <ChangeIndicator value={data.netWorth.change} percent={data.netWorth.changePercent} />
                      <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>this month</span>
                    </div>
                  </div>
                  {data.netWorth.history.length > 1 && (
                    <div style={{ paddingTop: 8, opacity: 0.9 }}>
                      <Sparkline data={data.netWorth.history} width={160} height={56} id="nw" />
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                        <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{data.netWorth.history[0]?.month}</span>
                        <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{data.netWorth.history[data.netWorth.history.length - 1]?.month}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </FadeIn>

          {/* Quick Stats */}
          <div className="stats-grid" style={{ marginTop: 16 }}>
            <QuickStat label="Liquidity" value={data.liquidity.total} icon="droplet" delay={150}
              sub={`${data.liquidity.items.length} account${data.liquidity.items.length !== 1 ? "s" : ""}`} />
            <QuickStat label="Monthly Burn" value={data.monthly.expenses} icon="trending-down" delay={200}
              sub={`${(Number(data.monthly.savingsRate) || 0).toFixed(0)}% savings rate`} color="#F87171" />
            <QuickStat label="Savings Rate" value={Number(data.monthly.savingsRate) || 0}
              format={(v) => (Number(v) || 0).toFixed(1) + "%"} icon="trending-up" delay={250}
              sub={formatINR(data.monthly.savings, { compact: true }) + "/mo saved"} color="#34D399" />
            <QuickStat label="Runway" value={Number(data.runway) || 0}
              format={(v) => (Number(v) || 0).toFixed(1) + " mo"} icon="shield" delay={300}
              sub={`${(Number(data.emergencyFund.monthsCovered) || 0).toFixed(1)} mo emergency`} color="#60A5FA" />
          </div>

          {/* Goals Preview */}
          {data.goals.length > 0 && (
            <div style={{ marginTop: 28 }}>
              <SectionHeader title="Goals" />
              <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
                {data.goals.map((g, i) => (
                  <GoalPreviewCard key={g.id} goal={g} delay={350 + i * 60} />
                ))}
              </div>
            </div>
          )}

          {/* Spend + Insights row */}
          <div className="two-col" style={{ marginTop: 28 }}>
            {data.monthly.breakdown.length > 0 && (
              <FadeIn delay={450}>
                <div>
                  <SectionHeader title="Monthly Spend" />
                  <Card hover={false} style={{ padding: 20 }}>
                    <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", gap: 2, marginBottom: 16 }}>
                      {data.monthly.breakdown.map((cat, i) => {
                        const colors = ["#60A5FA", "#A78BFA", "#F87171", "#FBBF24", "#34D399", "#C9A84C", "#FB923C", "#6B7280"];
                        return <div key={i} style={{ flex: cat.pct, background: colors[i % colors.length], borderRadius: 2, opacity: 0.8 }} />;
                      })}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
                      {data.monthly.breakdown.slice(0, 6).map((cat, i) => {
                        const colors = ["#60A5FA", "#A78BFA", "#F87171", "#FBBF24", "#34D399", "#C9A84C"];
                        return (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: 2, background: colors[i % colors.length], flexShrink: 0, opacity: 0.8 }} />
                            <span style={{ fontSize: 12, color: "var(--text-tertiary)", flex: 1 }}>{cat.category}</span>
                            <span className="mono" style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                              {formatINR(cat.amount, { compact: true })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </div>
              </FadeIn>
            )}

            {data.insights.length > 0 && (
              <FadeIn delay={500}>
                <div>
                  <SectionHeader title="Insights" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {data.insights.slice(0, 3).map((ins) => {
                      const colorMap: Record<string, { color: string; bg: string; icon: string }> = {
                        positive: { color: "var(--positive)", bg: "var(--positive-dim)", icon: "check" },
                        warning: { color: "var(--warning)", bg: "var(--warning-dim)", icon: "lightbulb" },
                        info: { color: "var(--info)", bg: "var(--info-dim)", icon: "lightbulb" },
                      };
                      const c = colorMap[ins.type] || colorMap.info;
                      return (
                        <Card key={ins.id} style={{ padding: "16px 18px" }}>
                          <div style={{ display: "flex", gap: 12 }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: "var(--radius-sm)", flexShrink: 0,
                              background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1,
                            }}>
                              <Icon name={c.icon} size={14} color={c.color} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, lineHeight: 1.3 }}>{ins.title}</div>
                              <div style={{ fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.5 }}>{ins.body}</div>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </FadeIn>
            )}
          </div>

          {/* Recent Transactions */}
          {data.recentTransactions.length > 0 && (
            <FadeIn delay={600}>
              <div style={{ marginTop: 28 }}>
                <SectionHeader title="Recent Activity" />
                <Card hover={false} style={{ padding: "6px 0" }}>
                  {data.recentTransactions.slice(0, 5).map((tx, i) => {
                    const isIncome = tx.amount > 0;
                    return (
                      <div key={tx.id} style={{
                        display: "flex", alignItems: "center", gap: 12, padding: "12px 18px",
                        borderBottom: i < 4 ? "1px solid var(--border-subtle)" : "none",
                      }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: "var(--radius-sm)",
                          background: isIncome ? "var(--positive-dim)" : "var(--bg-elevated)",
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        }}>
                          <Icon name={isIncome ? "trending-up" : "trending-down"} size={15}
                            color={isIncome ? "var(--positive)" : "var(--text-tertiary)"} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{tx.name}</div>
                          <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{tx.category}</div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div className="mono" style={{
                            fontSize: 13, fontWeight: 600,
                            color: isIncome ? "var(--positive)" : "var(--text-primary)",
                          }}>
                            {isIncome ? "+" : ""}{formatINR(tx.amount)}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{formatDateShort(tx.date)}</div>
                        </div>
                      </div>
                    );
                  })}
                </Card>
              </div>
            </FadeIn>
          )}
        </>
      )}

      <div style={{ height: 32 }} />
    </div>
  );
}

// ── Sub-components ──

function QuickStat({ label, value, format, sub, icon, delay = 0, color }: {
  label: string; value: number; format?: (v: number) => string; sub: string;
  icon: string; delay?: number; color?: string;
}) {
  return (
    <FadeIn delay={delay}>
      <Card style={{ padding: "18px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: "var(--radius-sm)",
            background: color ? color + "12" : "var(--accent-dim)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon name={icon} size={16} color={color || "var(--accent)"} />
          </div>
          <span style={{ fontSize: 12, color: "var(--text-tertiary)", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            {label}
          </span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 4 }}>
          <AnimatedNumber value={value} format={format} delay={delay + 150} />
        </div>
        <div style={{ fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.4 }}>{sub}</div>
      </Card>
    </FadeIn>
  );
}

function GoalPreviewCard({ goal, delay = 0 }: {
  goal: { id: string; name: string; icon: string; target: number; saved: number; monthly: number; color: string; deadline: string | null };
  delay?: number;
}) {
  const pct = goal.target > 0 ? goal.saved / goal.target : 0;
  const months = goal.deadline ? getMonthsRemaining(goal.deadline) : 0;
  return (
    <FadeIn delay={delay} style={{ minWidth: 180, flex: "1 1 180px" }}>
      <Card style={{ padding: 20, height: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <ProgressRing progress={pct} size={48} sw={3.5} color={goal.color}>
            <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: goal.color }}>
              {Math.round(pct * 100)}%
            </span>
          </ProgressRing>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{goal.name}</div>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
              {months > 0 ? `${months} months left` : "Due now"}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span className="mono" style={{ fontSize: 15, fontWeight: 600 }}>
            {formatINR(goal.saved, { compact: true })}
          </span>
          <span className="mono" style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
            / {formatINR(goal.target, { compact: true })}
          </span>
        </div>
        <div style={{ height: 3, borderRadius: 2, background: "var(--border)", marginTop: 10, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 2, background: goal.color, width: `${pct * 100}%`,
            transition: "width 1s cubic-bezier(0.4,0,0.15,1)",
          }} />
        </div>
      </Card>
    </FadeIn>
  );
}
