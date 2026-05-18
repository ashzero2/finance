"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { FadeIn } from "@/components/ui/fade-in";
import { TabPill } from "@/components/ui/tab-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { formatINR, formatDateShort } from "@/lib/utils";

interface Transaction {
  id: string; type: string; amount: string; categoryId: string | null;
  description: string | null; date: string; isRecurring: boolean;
}

interface Category {
  id: string; name: string; type: string; icon: string; color: string;
}

export default function CashFlowPage() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [showForm, setShowForm] = useState(false);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const fetchData = useCallback(() => {
    Promise.all([
      fetch(`/api/transactions?month=${currentMonth}`).then(r => r.json()),
      fetch("/api/categories").then(r => r.json()),
    ]).then(([t, c]) => {
      setTxns(t);
      setCats(c);
    }).finally(() => setLoading(false));
  }, [currentMonth]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getCatName = (id: string | null) => cats.find(c => c.id === id)?.name || "Other";
  const getCatIcon = (id: string | null) => cats.find(c => c.id === id)?.icon || "circle";

  const filtered = tab === "all" ? txns
    : tab === "income" ? txns.filter(t => t.type === "income")
    : txns.filter(t => t.type === "expense");

  const totalIncome = txns.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpenses = txns.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const savings = totalIncome - totalExpenses;

  if (loading) {
    return <div style={{ padding: "48px 0", textAlign: "center", color: "var(--text-tertiary)" }}>Loading transactions...</div>;
  }

  return (
    <div>
      <FadeIn delay={0}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600 }}>Cash Flow</h1>
          <Button onClick={() => setShowForm(true)}>
            <Icon name="plus" size={14} color="var(--bg-root)" /> Add
          </Button>
        </div>

        {/* Monthly Summary */}
        <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 20 }}>
          <div>
            <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>Income </span>
            <span className="mono" style={{ fontSize: 15, fontWeight: 600, color: "var(--positive)" }}>
              {formatINR(totalIncome, { compact: true })}
            </span>
          </div>
          <div>
            <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>Expenses </span>
            <span className="mono" style={{ fontSize: 15, fontWeight: 600, color: "var(--negative)" }}>
              {formatINR(totalExpenses, { compact: true })}
            </span>
          </div>
          <div>
            <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>Saved </span>
            <span className="mono" style={{ fontSize: 15, fontWeight: 600, color: "var(--accent)" }}>
              {formatINR(savings, { compact: true })}
            </span>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={80}>
        <TabPill tabs={[
          { id: "all", label: "All" },
          { id: "income", label: "Income" },
          { id: "expenses", label: "Expenses" },
        ]} active={tab} onChange={setTab} />
      </FadeIn>

      <div style={{ marginTop: 16 }}>
        {filtered.length === 0 ? (
          <EmptyState title="No transactions" subtitle="Add your first transaction to see cash flow" icon="arrows-updown" />
        ) : (
          <Card hover={false} style={{ padding: "4px 0" }}>
            {filtered.map((tx, i) => {
              const isIncome = tx.type === "income";
              return (
                <FadeIn key={tx.id} delay={120 + i * 20}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "13px 20px",
                    borderBottom: i < filtered.length - 1 ? "1px solid var(--border-subtle)" : "none",
                    transition: "background 0.15s",
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: "var(--radius-sm)",
                      background: isIncome ? "var(--positive-dim)" : "var(--bg-elevated)",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <Icon name={isIncome ? "trending-up" : "trending-down"} size={16}
                        color={isIncome ? "var(--positive)" : "var(--text-tertiary)"} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{tx.description || "Transaction"}</div>
                      <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{getCatName(tx.categoryId)}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div className="mono" style={{
                        fontSize: 14, fontWeight: 600,
                        color: isIncome ? "var(--positive)" : "var(--text-primary)",
                      }}>
                        {isIncome ? "+" : "-"}{formatINR(Number(tx.amount))}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{formatDateShort(tx.date)}</div>
                    </div>
                    <button onClick={() => handleDelete(tx.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--text-tertiary)" }}>
                      <Icon name="x" size={14} />
                    </button>
                  </div>
                </FadeIn>
              );
            })}
          </Card>
        )}
      </div>

      <div style={{ height: 32 }} />

      {/* Add Transaction Modal */}
      {showForm && (
        <TransactionForm
          categories={cats}
          onClose={() => setShowForm(false)}
          onSave={async (data) => {
            await fetch("/api/transactions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data),
            });
            setShowForm(false);
            fetchData();
          }}
        />
      )}
    </div>
  );

  async function handleDelete(id: string) {
    await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    fetchData();
  }
}

// ── Transaction Form Modal ──

function TransactionForm({ categories, onClose, onSave }: {
  categories: Category[];
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
}) {
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [submitting, setSubmitting] = useState(false);

  const filteredCats = categories.filter(c => c.type === type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    setSubmitting(true);
    await onSave({ type, amount: Number(amount), description, categoryId: categoryId || null, date });
    setSubmitting(false);
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
      zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      animation: "fadeIn 0.2s ease",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "var(--bg-surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)",
        width: "100%", maxWidth: 400, padding: 28, animation: "slideUp 0.25s ease",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>Add Transaction</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", padding: 4 }}>
            <Icon name="x" size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Type toggle */}
          <div style={{ display: "flex", gap: 8 }}>
            {(["expense", "income"] as const).map(t => (
              <button key={t} type="button" onClick={() => { setType(t); setCategoryId(""); }}
                style={{
                  flex: 1, height: 36, borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer",
                  background: type === t ? (t === "expense" ? "var(--negative-dim)" : "var(--positive-dim)") : "var(--bg-elevated)",
                  color: type === t ? (t === "expense" ? "var(--negative)" : "var(--positive)") : "var(--text-tertiary)",
                  fontSize: 13, fontWeight: 600, fontFamily: "var(--font-sans)",
                  textTransform: "capitalize",
                }}>
                {t}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>
              Amount (₹)
            </label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="0" required step="any" autoFocus
              style={{
                width: "100%", height: 48, padding: "0 16px", borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)", background: "var(--bg-elevated)",
                color: "var(--text-primary)", fontSize: 20, fontWeight: 600,
                fontFamily: "var(--font-mono)", outline: "none",
              }} />
          </div>

          {/* Description */}
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>
              Description
            </label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)}
              placeholder="What was this for?"
              style={{
                width: "100%", height: 40, padding: "0 12px", borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)", background: "var(--bg-elevated)",
                color: "var(--text-primary)", fontSize: 14, outline: "none", fontFamily: "var(--font-sans)",
              }} />
          </div>

          {/* Category */}
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>
              Category
            </label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
              style={{
                width: "100%", height: 40, padding: "0 12px", borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)", background: "var(--bg-elevated)",
                color: "var(--text-primary)", fontSize: 14, fontFamily: "var(--font-sans)",
              }}>
              <option value="">Select category</option>
              {filteredCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Date */}
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>
              Date
            </label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{
                width: "100%", height: 40, padding: "0 12px", borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)", background: "var(--bg-elevated)",
                color: "var(--text-primary)", fontSize: 14, fontFamily: "var(--font-sans)",
              }} />
          </div>

          <button type="submit" disabled={submitting || !amount} style={{
            height: 42, borderRadius: "var(--radius-sm)", border: "none", marginTop: 4,
            background: "var(--accent)", color: "var(--bg-root)", fontSize: 14, fontWeight: 600,
            cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1,
            fontFamily: "var(--font-sans)",
          }}>
            {submitting ? "Saving..." : "Save Transaction"}
          </button>
        </form>
      </div>
    </div>
  );
}
