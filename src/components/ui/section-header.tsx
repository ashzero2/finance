"use client";

import { Icon } from "./icon";

interface SectionHeaderProps {
  title: string;
  action?: string;
  onAction?: () => void;
  style?: React.CSSProperties;
}

export function SectionHeader({ title, action, onAction, style = {} }: SectionHeaderProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, ...style }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.02em" }}>{title}</h3>
      {action && (
        <button
          onClick={onAction}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-tertiary)",
            fontSize: 13,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontFamily: "var(--font-sans)",
            padding: "4px 0",
          }}
        >
          {action} <Icon name="chevron-right" size={14} />
        </button>
      )}
    </div>
  );
}