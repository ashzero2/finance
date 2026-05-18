"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

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
    </div>
  );
}