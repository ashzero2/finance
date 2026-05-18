"use client";

interface Tab {
  id: string;
  label: string;
}

interface TabPillProps {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
}

export function TabPill({ tabs, active, onChange }: TabPillProps) {
  return (
    <div
      style={{
        display: "inline-flex",
        background: "var(--bg-surface)",
        borderRadius: "var(--radius-full)",
        padding: 3,
        gap: 2,
        border: "1px solid var(--border-subtle)",
      }}
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            padding: "6px 14px",
            borderRadius: "var(--radius-full)",
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 500,
            fontFamily: "var(--font-sans)",
            background: active === t.id ? "var(--bg-elevated)" : "transparent",
            color: active === t.id ? "var(--text-primary)" : "var(--text-tertiary)",
            transition: "all 0.2s",
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}