"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { FadeIn } from "@/components/ui/fade-in";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

interface Insight {
  id: string;
  type: string;
  title: string;
  body: string;
  priority: string;
  isRead: boolean;
  generatedAt: string;
}

const TYPE_CONFIG: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  celebration: { color: "var(--positive)", bg: "var(--positive-dim)", icon: "check", label: "Celebration" },
  milestone: { color: "var(--accent)", bg: "var(--accent-dim, rgba(201, 168, 76, 0.15))", icon: "target", label: "Milestone" },
  suggestion: { color: "var(--info)", bg: "var(--info-dim)", icon: "lightbulb", label: "Suggestion" },
  warning: { color: "var(--warning)", bg: "var(--warning-dim)", icon: "alert-triangle", label: "Warning" },
  anomaly: { color: "var(--negative)", bg: "var(--negative-dim)", icon: "zap", label: "Anomaly" },
};

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  const fetchInsights = useCallback(() => {
    fetch("/api/insights")
      .then((r) => r.json())
      .then((data) => {
        const sorted = (Array.isArray(data) ? data : []).sort(
          (a: Insight, b: Insight) =>
            (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2)
        );
        setInsights(sorted);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await fetch("/api/insights", { method: "POST" });
      await new Promise((r) => setTimeout(r, 300));
      fetchInsights();
    } catch {
    } finally {
      setRegenerating(false);
    }
  };

  const handleDismiss = async (id: string) => {
    setInsights((prev) => prev.filter((i) => i.id !== id));
    await fetch("/api/insights", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "dismiss" }),
    }).catch(() => {});
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
        Loading insights...
      </div>
    );

  const highPriority = insights.filter((i) => i.priority === "high");
  const otherInsights = insights.filter((i) => i.priority !== "high");

  return (
    <div>
      <FadeIn delay={0}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <h1 style={{ fontSize: 22, fontWeight: 600 }}>Insights</h1>
          <Button
            variant="secondary"
            onClick={handleRegenerate}
            disabled={regenerating}
          >
            <Icon
              name="refresh-cw"
              size={14}
              color="var(--text-secondary)"
            />
            {regenerating ? "Analyzing..." : "Refresh"}
          </Button>
        </div>
        <p
          style={{
            fontSize: 13,
            color: "var(--text-tertiary)",
            marginBottom: 20,
          }}
        >
          Personalized observations about your finances · Auto-updated when your
          data changes
        </p>
      </FadeIn>

      {insights.length === 0 ? (
        <EmptyState
          icon="lightbulb"
          title="No insights yet"
          subtitle="Add financial data and insights will appear as patterns emerge. You can also tap Refresh to generate them."
        />
      ) : (
        <>
          {/* High priority section */}
          {highPriority.length > 0 && (
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
                Needs Attention
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {highPriority.map((ins, i) => (
                  <InsightCard
                    key={ins.id}
                    insight={ins}
                    delay={100 + i * 60}
                    onDismiss={handleDismiss}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Other insights */}
          {otherInsights.length > 0 && (
            <div>
              {highPriority.length > 0 && (
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
                  Other Insights
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {otherInsights.map((ins, i) => (
                  <InsightCard
                    key={ins.id}
                    insight={ins}
                    delay={100 + (highPriority.length + i) * 60}
                    onDismiss={handleDismiss}
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

function InsightCard({
  insight,
  delay,
  onDismiss,
}: {
  insight: Insight;
  delay: number;
  onDismiss: (id: string) => void;
}) {
  const config = TYPE_CONFIG[insight.type] || TYPE_CONFIG.suggestion;
  const isHighPriority = insight.priority === "high";

  return (
    <FadeIn delay={delay}>
      <Card
        style={{
          padding: "18px 22px",
          borderLeft: isHighPriority
            ? `3px solid ${config.color}`
            : undefined,
        }}
      >
        <div style={{ display: "flex", gap: 14 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "var(--radius-sm)",
              flexShrink: 0,
              background: config.bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name={config.icon} size={18} color={config.color} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  lineHeight: 1.3,
                  flex: 1,
                }}
              >
                {insight.title}
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: config.color,
                  background: config.bg,
                  padding: "2px 8px",
                  borderRadius: "var(--radius-full)",
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                  flexShrink: 0,
                }}
              >
                {config.label}
              </span>
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                lineHeight: 1.6,
              }}
            >
              {insight.body}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 10,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                }}
              >
                {insight.generatedAt
                  ? new Date(insight.generatedAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : ""}
              </span>
              <button
                onClick={() => onDismiss(insight.id)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px 8px",
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  borderRadius: "var(--radius-sm)",
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "var(--text-secondary)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "var(--text-tertiary)")
                }
              >
                <Icon name="x" size={12} /> Dismiss
              </button>
            </div>
          </div>
        </div>
      </Card>
    </FadeIn>
  );
}