"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { FadeIn } from "@/components/ui/fade-in";
import { SectionHeader } from "@/components/ui/section-header";
import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

interface Settings {
  currency: string; financialMonthStartDay: number;
  weeklyReviewDay: string; theme: string;
}

const CURRENCIES = ["INR", "USD", "EUR", "GBP"];
const WEEK_DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>({ currency: "INR", financialMonthStartDay: 1, weeklyReviewDay: "sunday", theme: "dark" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data && data.currency) setSettings(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async (updates: Partial<Settings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    setSaving(true);

    // Apply theme immediately
    if (updates.theme) {
      const theme = updates.theme;
      if (theme === "system") {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
      } else {
        document.documentElement.setAttribute("data-theme", theme);
      }
    }

    try {
      await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newSettings) });
    } catch {}
    setSaving(false);
  };

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  const selectStyle: React.CSSProperties = {
    width: "100%", height: 40, padding: "0 12px", borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)", background: "var(--bg-elevated)",
    color: "var(--text-primary)", fontSize: 14, fontFamily: "var(--font-sans)",
  };

  if (loading) return <div style={{ padding: "48px 0", textAlign: "center", color: "var(--text-tertiary)" }}>Loading settings...</div>;

  return (
    <div>
      <FadeIn delay={0}>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 24 }}>Settings</h1>
      </FadeIn>

      <FadeIn delay={50}>
        <SectionHeader title="Preferences" />
        <Card hover={false} style={{ padding: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Theme</label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["dark", "light", "system"] as const).map(t => (
                  <button key={t} onClick={() => save({ theme: t })}
                    style={{
                      flex: 1, height: 40, borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer",
                      background: settings.theme === t ? "var(--accent)" : "var(--bg-elevated)",
                      color: settings.theme === t ? "var(--bg-root)" : "var(--text-secondary)",
                      fontSize: 13, fontWeight: 600, fontFamily: "var(--font-sans)",
                      textTransform: "capitalize", transition: "all 0.15s",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}>
                    <Icon name={t === "dark" ? "moon" : t === "light" ? "sun" : "monitor"} size={14}
                      color={settings.theme === t ? "var(--bg-root)" : "var(--text-tertiary)"} />
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Currency</label>
              <select style={selectStyle} value={settings.currency} onChange={e => save({ currency: e.target.value })}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Financial Month Start Day</label>
              <select style={selectStyle} value={settings.financialMonthStartDay} onChange={e => save({ financialMonthStartDay: Number(e.target.value) })}>
                {Array.from({ length: 28 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Weekly Review Day</label>
              <select style={selectStyle} value={settings.weeklyReviewDay} onChange={e => save({ weeklyReviewDay: e.target.value })}>
                {WEEK_DAYS.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
              </select>
            </div>
          </div>
        </Card>
      </FadeIn>

      <FadeIn delay={150}>
        <div style={{ marginTop: 28 }}>
          <SectionHeader title="Account" />
          <Card hover={false} style={{ padding: 24 }}>
            <button onClick={handleLogout} style={{
              display: "flex", alignItems: "center", gap: 10, background: "none", border: "none",
              color: "var(--negative)", fontSize: 14, fontWeight: 500, cursor: "pointer",
              fontFamily: "var(--font-sans)", padding: 0,
            }}>
              <Icon name="log-out" size={18} color="var(--negative)" />
              Sign out
            </button>
          </Card>
        </div>
      </FadeIn>

      {saving && (
        <div style={{ position: "fixed", bottom: 20, right: 20, background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "8px 16px", fontSize: 13, color: "var(--text-tertiary)" }}>
          Saving...
        </div>
      )}

      <div style={{ height: 32 }} />
    </div>
  );
}