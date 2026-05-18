"use client";

import { Icon } from "@/components/ui/icon";
import { NAV_ITEMS } from "./sidebar";

interface BottomNavProps {
  activePath: string;
}

export function BottomNav({ activePath }: BottomNavProps) {
  const mobileItems = NAV_ITEMS.slice(0, 5);
  const activeId = NAV_ITEMS.find((item) => activePath.startsWith(item.href))?.id || "dashboard";

  return (
    <nav
      aria-label="Main navigation"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: "var(--bottombar-h)",
        background: "var(--bg-surface)",
        borderTop: "1px solid var(--border-subtle)",
        zIndex: 50,
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
      }}
      className="bottom-nav"
    >
      {mobileItems.map((item) => {
        const isActive = item.id === activeId;
        return (
          <a
            key={item.id}
            href={item.href}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              padding: "8px 0",
              textDecoration: "none",
              color: isActive ? "var(--accent)" : "var(--text-tertiary)",
              transition: "color 0.15s",
            }}
          >
            <Icon name={item.icon} size={20} color={isActive ? "var(--accent)" : "var(--text-tertiary)"} />
            <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 400 }}>{item.label}</span>
          </a>
        );
      })}
    </nav>
  );
}