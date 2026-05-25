"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";
import { SearchModal } from "@/components/ui/search-modal";
import { Icon } from "@/components/ui/icon";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);

  // ⌘K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="app-shell" style={{ display: "flex", height: "100%", width: "100%" }}>
      <Sidebar activePath={pathname} />
      <main
        className="main-content"
        style={{
          flex: 1,
          minWidth: 0,
          height: "100%",
          overflowY: "auto",
          overflowX: "hidden",
          padding: "28px 32px",
        }}
      >
        {/* Search trigger */}
        <div style={{ maxWidth: 920, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "6px 12px",
                background: "var(--bg-elevated)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)", cursor: "pointer",
                color: "var(--text-tertiary)", fontSize: 13, fontFamily: "var(--font-sans)",
              }}
            >
              <Icon name="search" size={14} />
              <span className="hide-mobile">Search</span>
              <kbd className="hide-mobile" style={{
                fontSize: 10, color: "var(--text-tertiary)", background: "var(--bg-surface)",
                border: "1px solid var(--border)", borderRadius: 3, padding: "1px 5px", marginLeft: 4,
              }}>⌘K</kbd>
            </button>
          </div>
          {children}
        </div>
      </main>
      <BottomNav activePath={pathname} />
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
