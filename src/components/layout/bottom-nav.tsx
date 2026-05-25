"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { NAV_ITEMS } from "./sidebar";

interface BottomNavProps {
  activePath: string;
}

// Primary tabs shown directly in the bottom bar
const PRIMARY_IDS = ["dashboard", "portfolio", "cashflow", "goals"];
// Items that go into the "More" menu
const MORE_IDS = ["calendar", "reports", "insights"];
// Settings is always in More
const SETTINGS_ITEM = { id: "settings", label: "Settings", icon: "settings", href: "/settings" };

export function BottomNav({ activePath }: BottomNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Focus trap for more menu
  useEffect(() => {
    if (!moreOpen || !moreRef.current) return;
    const focusable = moreRef.current.querySelectorAll<HTMLElement>("a, button");
    if (focusable.length > 0) focusable[0].focus();

    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => document.removeEventListener("keydown", trap);
  }, [moreOpen]);

  const primaryItems = NAV_ITEMS.filter((item) => PRIMARY_IDS.includes(item.id));
  const moreItems = [
    ...NAV_ITEMS.filter((item) => MORE_IDS.includes(item.id)),
    SETTINGS_ITEM,
  ];

  const activeId =
    [...NAV_ITEMS, SETTINGS_ITEM].find((item) => activePath.startsWith(item.href))?.id || "dashboard";

  const isMoreActive = moreItems.some((item) => item.id === activeId);

  // Close menu on route change
  useEffect(() => {
    setMoreOpen(false);
  }, [activePath]);

  // Close on escape
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setMoreOpen(false);
  }, []);

  useEffect(() => {
    if (moreOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [moreOpen, handleKeyDown]);

  // Insert "More" button in the middle (between portfolio and cashflow)
  const firstHalf = primaryItems.slice(0, 2); // dashboard, portfolio
  const secondHalf = primaryItems.slice(2);     // cashflow, goals

  return (
    <>
      {/* Backdrop overlay when menu is open */}
      {moreOpen && (
        <div
          onClick={() => setMoreOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 49,
            backdropFilter: "blur(4px)",
          }}
        />
      )}

      {/* More menu popover */}
      {moreOpen && (
        <div
          ref={moreRef}
          role="menu"
          aria-label="More navigation"
          style={{
            position: "fixed",
            bottom: "calc(var(--bottombar-h) + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            padding: "8px",
            zIndex: 51,
            display: "flex",
            gap: 4,
            boxShadow: "0 -4px 24px rgba(0,0,0,0.2)",
            minWidth: 200,
          }}
        >
          {moreItems.map((item) => {
            const isActive = item.id === activeId;
            return (
              <Link
                key={item.id}
                href={item.href}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  padding: "12px 8px",
                  borderRadius: "var(--radius-sm)",
                  background: isActive ? "rgba(201,168,76,0.07)" : "transparent",
                  textDecoration: "none",
                  color: isActive ? "var(--accent)" : "var(--text-secondary)",
                  transition: "all 0.15s",
                }}
              >
                <Icon
                  name={item.icon}
                  size={22}
                  color={isActive ? "var(--accent)" : "var(--text-tertiary)"}
                />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: isActive ? 600 : 400,
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Bottom nav bar */}
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
        {/* First half: Dashboard, Portfolio */}
        {firstHalf.map((item) => (
          <NavTab key={item.id} item={item} isActive={item.id === activeId} />
        ))}

        {/* More button (center) */}
        <button
          onClick={() => setMoreOpen((prev) => !prev)}
          aria-label="More options"
          aria-expanded={moreOpen}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
            padding: "8px 0",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: isMoreActive ? "var(--accent)" : moreOpen ? "var(--accent)" : "var(--text-tertiary)",
            transition: "color 0.15s",
            fontFamily: "var(--font-sans)",
          }}
        >
          <Icon
            name="grid"
            size={20}
            color={isMoreActive ? "var(--accent)" : moreOpen ? "var(--accent)" : "var(--text-tertiary)"}
          />
          <span style={{ fontSize: 10, fontWeight: isMoreActive || moreOpen ? 600 : 400 }}>
            More
          </span>
        </button>

        {/* Second half: Cash Flow, Goals */}
        {secondHalf.map((item) => (
          <NavTab key={item.id} item={item} isActive={item.id === activeId} />
        ))}
      </nav>
    </>
  );
}

function NavTab({ item, isActive }: { item: { id: string; label: string; icon: string; href: string }; isActive: boolean }) {
  return (
    <Link
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
    </Link>
  );
}