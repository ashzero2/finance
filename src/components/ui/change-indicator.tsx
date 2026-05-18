"use client";

import { Icon } from "./icon";
import { formatINR, formatPercent } from "@/lib/utils";

interface ChangeIndicatorProps {
  value: number;
  percent?: number;
  compact?: boolean;
  size?: "sm" | "md";
}

export function ChangeIndicator({
  value,
  percent,
  compact = false,
  size = "md",
}: ChangeIndicatorProps) {
  const pos = value >= 0;
  const color = pos ? "var(--positive)" : "var(--negative)";
  const bg = pos ? "var(--positive-dim)" : "var(--negative-dim)";
  const fontSize = size === "sm" ? 12 : 13;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        color,
        fontSize,
        fontWeight: 500,
        fontFamily: "var(--font-mono)",
        background: bg,
        padding: "3px 8px",
        borderRadius: "var(--radius-full)",
      }}
    >
      <Icon name={pos ? "trending-up" : "trending-down"} size={14} color={color} />
      {compact ? formatINR(Math.abs(value), { compact: true }) : formatINR(Math.abs(value))}
      {percent != null && (
        <span style={{ opacity: 0.7 }}>({formatPercent(percent)})</span>
      )}
    </span>
  );
}