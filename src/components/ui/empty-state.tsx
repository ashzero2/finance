"use client";

import { Icon } from "./icon";

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon = "circle", title, subtitle }: EmptyStateProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "48px 24px", color: "var(--text-tertiary)" }}>
      <Icon name={icon} size={40} color="var(--border)" style={{ marginBottom: 16 }} />
      <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13 }}>{subtitle}</div>}
    </div>
  );
}