"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./icon";

interface SearchResult {
  type: "transaction" | "asset" | "liability" | "goal";
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

const TYPE_ICONS: Record<string, string> = {
  asset: "trending-up",
  liability: "trending-down",
  transaction: "arrows-updown",
  goal: "target",
};

const TYPE_COLORS: Record<string, string> = {
  asset: "var(--positive)",
  liability: "var(--negative)",
  transaction: "var(--text-secondary)",
  goal: "var(--accent)",
};

export function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) setResults(await res.json());
      } catch {}
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Reset selection when results change
  useEffect(() => { setSelectedIdx(0); }, [results]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && results[selectedIdx]) {
      e.preventDefault();
      router.push(results[selectedIdx].href);
      onClose();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
      zIndex: 200, display: "flex", alignItems: "flex-start", justifyContent: "center",
      paddingTop: "min(20vh, 140px)", padding: "min(20vh, 140px) 20px 20px",
    }}>
      <div onClick={e => e.stopPropagation()} onKeyDown={handleKeyDown} style={{
        background: "var(--bg-surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)",
        width: "100%", maxWidth: 520, overflow: "hidden",
        boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
      }}>
        {/* Search input */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderBottom: "1px solid var(--border-subtle)" }}>
          <Icon name="search" size={18} color="var(--text-tertiary)" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search transactions, assets, goals..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              color: "var(--text-primary)", fontSize: 15, fontFamily: "var(--font-sans)",
            }}
          />
          <kbd style={{
            fontSize: 11, color: "var(--text-tertiary)", background: "var(--bg-elevated)",
            border: "1px solid var(--border)", borderRadius: 4, padding: "2px 6px",
          }}>ESC</kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 360, overflowY: "auto" }}>
          {loading && (
            <div style={{ padding: "20px 18px", textAlign: "center", color: "var(--text-tertiary)", fontSize: 13 }}>
              Searching...
            </div>
          )}

          {!loading && query.trim() && results.length === 0 && (
            <div style={{ padding: "24px 18px", textAlign: "center", color: "var(--text-tertiary)", fontSize: 13 }}>
              No results for &ldquo;{query}&rdquo;
            </div>
          )}

          {results.map((r, i) => (
            <button
              key={`${r.type}-${r.id}`}
              onClick={() => { router.push(r.href); onClose(); }}
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", width: "100%",
                background: i === selectedIdx ? "var(--bg-hover)" : "transparent",
                border: "none", cursor: "pointer", textAlign: "left", fontFamily: "var(--font-sans)",
                borderBottom: i < results.length - 1 ? "1px solid var(--border-subtle)" : "none",
                transition: "background 0.1s",
              }}
              onMouseEnter={() => setSelectedIdx(i)}
            >
              <div style={{
                width: 32, height: 32, borderRadius: "var(--radius-sm)", flexShrink: 0,
                background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon name={TYPE_ICONS[r.type] || "circle"} size={15} color={TYPE_COLORS[r.type] || "var(--text-tertiary)"} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{r.title}</div>
                <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{r.subtitle}</div>
              </div>
              <span style={{ fontSize: 10, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {r.type}
              </span>
            </button>
          ))}
        </div>

        {/* Footer hint */}
        {!query.trim() && (
          <div style={{ padding: "12px 18px", borderTop: "1px solid var(--border-subtle)", fontSize: 12, color: "var(--text-tertiary)" }}>
            Type to search across your finances
          </div>
        )}
      </div>
    </div>
  );
}