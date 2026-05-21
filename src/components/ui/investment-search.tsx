"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Icon } from "@/components/ui/icon";

// ── Types ──

export interface InvestmentSuggestion {
  name: string;
  type: "stock" | "etf" | "mf";
  exchange?: string | null;
  symbol?: string;
  schemeCode?: string;
  source: "groww" | "mfapi";
}

interface InvestmentSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: InvestmentSuggestion) => void;
  placeholder?: string;
  autoFocus?: boolean;
  style?: React.CSSProperties;
}

// ── Type badge colors ──

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  etf: { label: "ETF", color: "#60A5FA", bg: "rgba(96,165,250,0.12)" },
  mf: { label: "MF", color: "#A78BFA", bg: "rgba(167,139,250,0.12)" },
  stock: { label: "Stock", color: "#34D399", bg: "rgba(52,211,153,0.12)" },
};

// ── Component ──

export function InvestmentSearch({
  value,
  onChange,
  onSelect,
  placeholder = "Search investments...",
  autoFocus = false,
  style = {},
}: InvestmentSearchProps) {
  const [results, setResults] = useState<InvestmentSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search
  const doSearch = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search/investments?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
          setOpen(true);
          setHighlightIdx(-1);
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  // Trigger search on value change
  useEffect(() => {
    doSearch(value);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, doSearch]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && highlightIdx >= 0) {
      e.preventDefault();
      handleSelect(results[highlightIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const handleSelect = (suggestion: InvestmentSuggestion) => {
    onChange(suggestion.name);
    onSelect(suggestion);
    setOpen(false);
    setResults([]);
  };

  // Group results by type
  const grouped: { type: string; items: InvestmentSuggestion[] }[] = [];
  const types = ["etf", "stock", "mf"];
  for (const t of types) {
    const items = results.filter((r) => r.type === t);
    if (items.length > 0) grouped.push({ type: t, items });
  }

  // Flat index for keyboard highlight
  let flatIdx = 0;

  return (
    <div ref={containerRef} style={{ position: "relative", ...style }}>
      {/* Input */}
      <div style={{ position: "relative" }}>
        <Icon
          name="search"
          size={16}
          color="var(--text-tertiary)"
          style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
        />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => { if (results.length > 0 && value.length >= 2) setOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          style={{
            width: "100%",
            height: 40,
            padding: "0 12px 0 36px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            background: "var(--bg-elevated)",
            color: "var(--text-primary)",
            fontSize: 14,
            outline: "none",
            fontFamily: "var(--font-sans)",
          }}
        />
        {loading && (
          <div style={{
            position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
            width: 16, height: 16, border: "2px solid var(--border)", borderTopColor: "var(--accent)",
            borderRadius: "50%", animation: "spin 0.6s linear infinite",
          }} />
        )}
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: "var(--bg-surface)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)", boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
          zIndex: 50, maxHeight: 320, overflowY: "auto",
          animation: "fadeIn 0.15s ease",
        }}>
          {grouped.map((group) => {
            const config = TYPE_CONFIG[group.type] || TYPE_CONFIG.stock;
            return (
              <div key={group.type}>
                {/* Group header */}
                <div style={{
                  padding: "8px 14px 4px",
                  fontSize: 10,
                  fontWeight: 700,
                  color: config.color,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  background: "var(--bg-surface)",
                  position: "sticky",
                  top: 0,
                }}>
                  {config.label}s
                </div>

                {group.items.map((item) => {
                  const idx = flatIdx++;
                  const isHighlighted = idx === highlightIdx;
                  return (
                    <button
                      key={`${item.source}-${item.name}-${idx}`}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setHighlightIdx(idx)}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "9px 14px",
                        background: isHighlighted ? "var(--bg-hover)" : "transparent",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "left",
                        fontFamily: "var(--font-sans)",
                        color: "var(--text-primary)",
                        fontSize: 13,
                        transition: "background 0.1s",
                      }}
                    >
                      {/* Name */}
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.name}
                      </span>

                      {/* Symbol badge */}
                      {item.symbol && (
                        <span style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: "var(--text-tertiary)",
                          background: "var(--bg-elevated)",
                          padding: "2px 6px",
                          borderRadius: 3,
                          flexShrink: 0,
                          fontFamily: "var(--font-mono, monospace)",
                        }}>
                          {item.symbol}
                        </span>
                      )}

                      {/* Exchange badge */}
                      {item.exchange && (
                        <span style={{
                          fontSize: 9,
                          fontWeight: 700,
                          color: config.color,
                          background: config.bg,
                          padding: "2px 5px",
                          borderRadius: 3,
                          flexShrink: 0,
                        }}>
                          {item.exchange}
                        </span>
                      )}

                      {/* Type badge */}
                      <span style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: config.color,
                        background: config.bg,
                        padding: "2px 5px",
                        borderRadius: 3,
                        flexShrink: 0,
                      }}>
                        {config.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {open && results.length === 0 && !loading && value.length >= 2 && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: "var(--bg-surface)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)", padding: "16px",
          textAlign: "center", fontSize: 13, color: "var(--text-tertiary)",
          zIndex: 50,
        }}>
          No results for &ldquo;{value}&rdquo;
        </div>
      )}

      {/* Spinner keyframes */}
      <style>{`@keyframes spin { to { transform: translateY(-50%) rotate(360deg); } }`}</style>
    </div>
  );
}