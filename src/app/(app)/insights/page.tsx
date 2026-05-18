"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { FadeIn } from "@/components/ui/fade-in";
import { EmptyState } from "@/components/ui/empty-state";

interface Insight {
  id: string; type: string; title: string; body: string; priority: string;
}

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard").then(r => r.json())
      .then(data => setInsights(data.insights || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const colorMap: Record<string, { color: string; bg: string; icon: string }> = {
    positive: { color: "var(--positive)", bg: "var(--positive-dim)", icon: "check" },
    warning: { color: "var(--warning)", bg: "var(--warning-dim)", icon: "lightbulb" },
    info: { color: "var(--info)", bg: "var(--info-dim)", icon: "lightbulb" },
  };

  if (loading) return <div style={{ padding: "48px 0", textAlign: "center", color: "var(--text-tertiary)" }}>Loading insights...</div>;

  return (
    <div>
      <FadeIn delay={0}>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 6 }}>Insights</h1>
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 20 }}>
          Personalized observations about your finances
        </p>
      </FadeIn>

      {insights.length === 0 ? (
        <EmptyState icon="lightbulb" title="No insights yet" subtitle="Add financial data and insights will appear as patterns emerge" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {insights.map((ins, i) => {
            const c = colorMap[ins.type] || colorMap.info;
            return (
              <FadeIn key={ins.id} delay={100 + i * 60}>
                <Card style={{ padding: "20px 22px" }}>
                  <div style={{ display: "flex", gap: 14 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "var(--radius-sm)", flexShrink: 0,
                      background: c.bg, display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Icon name={c.icon} size={18} color={c.color} />
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, lineHeight: 1.3 }}>{ins.title}</div>
                      <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>{ins.body}</div>
                    </div>
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