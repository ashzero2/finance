"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/icon";

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  href: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "home", href: "/dashboard" },
  { id: "portfolio", label: "Portfolio", icon: "bar-chart", href: "/portfolio" },
  { id: "cashflow", label: "Cash Flow", icon: "arrows-updown", href: "/cashflow" },
  { id: "goals", label: "Goals", icon: "target", href: "/goals" },
  { id: "calendar", label: "Calendar", icon: "calendar", href: "/calendar" },
  { id: "reports", label: "Reports", icon: "pie-chart", href: "/reports" },
  { id: "insights", label: "Insights", icon: "lightbulb", href: "/insights" },
];

interface SidebarProps {
  activePath: string;
}

export function Sidebar({ activePath }: SidebarProps) {
  const activeId = NAV_ITEMS.find((item) => activePath.startsWith(item.href))?.id || "dashboard";

  return (
    <nav
      className="sidebar"
      aria-label="Main navigation"
      style={{
        width: "var(--sidebar-w)",
        height: "100%",
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div style={{ padding: "20px 0 12px", textAlign: "center" }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "var(--radius-sm)",
            margin: "0 auto",
            background: "linear-gradient(135deg, rgba(201,168,76,0.19), rgba(201,168,76,0.06))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid rgba(201,168,76,0.13)",
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 800, color: "var(--accent)", fontFamily: "var(--font-sans)" }}>
            F
          </span>
        </div>
      </div>

      {/* Nav items */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, padding: "8px 10px" }}>
        {[...NAV_ITEMS, { id: "settings", label: "Settings", icon: "settings", href: "/settings" }].map((item) => {
          const isActive = item.id === activeId;
          return (
            <Link
              key={item.id}
              href={item.href}
              title={item.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                padding: "10px 4px",
                borderRadius: "var(--radius-sm)",
                background: isActive ? "rgba(201,168,76,0.07)" : "transparent",
                textDecoration: "none",
                transition: "all 0.15s",
                color: isActive ? "var(--accent)" : "var(--text-tertiary)",
              }}
            >
              <Icon name={item.icon} size={20} color={isActive ? "var(--accent)" : "var(--text-tertiary)"} />
              <span style={{
                fontSize: 10, fontWeight: isActive ? 600 : 400, letterSpacing: "0.02em",
                textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                maxWidth: "100%", lineHeight: 1.2,
              }}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}