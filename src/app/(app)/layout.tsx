"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAppSession } from "@/lib/use-session";
import { AppShell } from "@/components/layout/app-shell";
import { ToastProvider } from "@/components/ui/toast";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: session, isPending: sessionLoading } = useAppSession();
  const router = useRouter();
  const pathname = usePathname();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

  // Check onboarding status whenever session loads or pathname changes
  useEffect(() => {
    if (sessionLoading) return;

    if (!session) {
      router.replace("/login");
      return;
    }

    // Check onboarding status and load theme
    Promise.all([
      fetch("/api/onboarding").then((r) => r.ok ? r.json() : { onboardingCompleted: false }),
      fetch("/api/settings").then((r) => r.ok ? r.json() : null),
    ])
      .then(([onboardingData, settingsData]) => {
        // Apply theme + sync to localStorage for instant loading on next visit
        if (settingsData?.theme) {
          const theme = settingsData.theme;
          try { localStorage.setItem("finance-theme", theme); } catch {}
          if (theme === "system") {
            const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
          } else {
            document.documentElement.setAttribute("data-theme", theme);
          }
        }

        const completed = onboardingData.onboardingCompleted ?? false;
        setOnboardingCompleted(completed);
        setOnboardingChecked(true);

        // Redirect logic
        if (!completed && pathname !== "/onboarding") {
          router.replace("/onboarding");
        } else if (completed && pathname === "/onboarding") {
          router.replace("/dashboard");
        }
      })
      .catch(() => {
        setOnboardingCompleted(true);
        setOnboardingChecked(true);
      });
  }, [session, sessionLoading, pathname, router]);

  // Loading state — show branded spinner
  if (sessionLoading || !onboardingChecked) {
    return <LoadingScreen />;
  }

  // Not authenticated — will redirect via useEffect
  if (!session) {
    return <LoadingScreen />;
  }

  // On onboarding page and not completed — render without AppShell
  if (pathname === "/onboarding" && !onboardingCompleted) {
    return (
      <div style={{ height: "100%", width: "100%", overflowY: "auto", padding: "28px 32px" }}>
        <div style={{ maxWidth: 920, margin: "0 auto" }}>{children}</div>
      </div>
    );
  }

  // Waiting for redirect
  if (!onboardingCompleted && pathname !== "/onboarding") {
    return <LoadingScreen />;
  }

  return <ToastProvider><AppShell>{children}</AppShell></ToastProvider>;
}

function LoadingScreen() {
  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        background: "var(--bg-root)",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "var(--radius-lg)",
          background:
            "linear-gradient(135deg, rgba(201,168,76,0.19), rgba(201,168,76,0.06))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid rgba(201,168,76,0.13)",
          animation: "pulse 2s ease-in-out infinite",
        }}
      >
        <span
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: "var(--accent)",
          }}
        >
          F
        </span>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "var(--text-secondary)",
          }}
        >
          Loading Finance...
        </div>
        <div
          style={{
            width: 120,
            height: 3,
            borderRadius: 2,
            background: "var(--border)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: "40%",
              height: "100%",
              borderRadius: 2,
              background: "var(--accent)",
              animation: "shimmer 1.5s ease-in-out infinite",
            }}
          />
        </div>
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
      `}</style>
    </div>
  );
}