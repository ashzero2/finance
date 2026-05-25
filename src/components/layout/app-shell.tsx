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
        <div style={{ maxWidth: 920, margin: "0 auto" }}>{children}</div>
      </main>
      <BottomNav activePath={pathname} />
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
