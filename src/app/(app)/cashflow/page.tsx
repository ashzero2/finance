"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { FadeIn } from "@/components/ui/fade-in";
import { TabPill } from "@/components/ui/tab-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { formatINR, formatDateShort } from "@/lib/utils";
import { CurrencyInput } from "@/components/ui/currency-input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { PageSkeleton } from "@/components/ui/skeleton";

interface Transaction {
  id: string; type: string; amount: string; categoryId: string | null;
  description: string | null; date: string; isRecurring: boolean;
}

interface Category {
  id: string; name: string; type: string; icon: string; color: string;
}

interface RecurringItem {
  id: string; type: string; amount: string; categoryId: string | null;
  categoryName: string | null; description: string | null;
  frequency: string; dayOfMonth: number | null;
  startDate: string; endDate: string | null;
  isActive: boolean; lastGeneratedAt: string | null;
}

export default function CashFlowPage() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [recurringItems, setRecurringItems] = useState<RecurringItem[]>([]);
  const [recurringLoading, setRecurringLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const { showToast } = useToast();

  const [viewMonth, setViewMonth] = useState(() => new Date());
  const monthStr = `${viewMonth.getFullYear()}-${String(viewMonth.getMonth() + 1).padStart(2, "0")}`;
  const monthLabel = viewMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  const navigateMonth = (delta: number) => {
    setViewMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const isCurrentMonth = viewMonth.getMonth() === new Date().getMonth() && viewMonth.getFullYear() === new Date().getFullYear();

  const fetchData = useCallback(() => {
    setLoading(true);
    setCurrentPage(1);
    Promise.all([
      fetch(`/api/transactions?month=${monthStr}&page=1&limit=50`).then(r => r.ok ? r.json() : { data: [], hasMore: false }),
      fetch("/api/categories").then(r => r.ok ? r.json() : []),
    ]).then(([t, c]) => {
      const txData = t.data ?? (Array.isArray(t) ? t : []);
      setTxns(txData);
      setHasMore(t.hasMore ?? false);
      setCats(Array.isArray(c) ? c : []);
    }).finally(() => setLoading(false));
  }, [monthStr]);

  const loadMore = useCallback(async () => {
    const nextPage = currentPage + 1;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/transactions?month=${monthStr}&page=${nextPage}&limit=50`);
      if (res.ok) {
        const t = await res.json();
        const txData = t.data ?? [];
        setTxns(prev => [...prev, ...txData]);
        setHasMore(t.hasMore ?? false);
        setCurrentPage(nextPage);
      }
    } catch {}
    setLoadingMore(false);
  }, [monthStr, currentPage]);

  const fetchRecurring = useCallback(() => {
    setRecurringLoading(true);
    fetch("/api/recurring-transactions")
      .then(r => r.ok ? r.json() : [])
      .then(d => setRecurringItems(Array.isArray(d) ? d : []))
      .catch(() => setRecurringItems([]))
      .finally(() => setRecurringLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (tab === "recurring") fetchRecurring(); }, [tab, fetchRecurring]);

  const getCatName = (id: string | null) => cats.find(c => c.id === id)?.name || "Other";

  const filtered = tab === "all" ? txns
    : tab === "income" ? txns.filter(t => t.type === "income")
    : txns.filter(t => t.type === "expense");

  const totalIncome = txns.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpenses = txns.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const savings = totalIncome - totalExpenses;

  if (loading) {
    return <PageSkeleton rows={6} />;
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

        {/* Month Navigation */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <button onClick={() => navigateMonth(-1)} aria-label="Previous month" style={{
            background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
            width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "var(--text-secondary)",
          }}>
            <Icon name="chevron-left" size={16} />
          </button>
          <span style={{ fontSize: 16, fontWeight: 600 }}>{monthLabel}</span>
          <button onClick={() => navigateMonth(1)} aria-label="Next month" disabled={isCurrentMonth} style={{
            background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
            width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: isCurrentMonth ? "not-allowed" : "pointer",
            color: isCurrentMonth ? "var(--text-tertiary)" : "var(--text-secondary)",
            opacity: isCurrentMonth ? 0.5 : 1,
          }}>
            <Icon name="chevron-right" size={16} />
          </button>
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
          { id: "recurring", label: "Recurring" },
        ]} active={tab} onChange={setTab} />
      </FadeIn>

      {/* Recurring Tab */}
      {tab === "recurring" && (
        <div style={{ marginTop: 16 }}>
          {recurringLoading ? (
            <div style={{ padding: "24px 0", textAlign: "center", color: "var(--text-tertiary)" }}>Loading...</div>
          ) : recurringItems.length === 0 ? (
            <EmptyState title="No recurring transactions" subtitle="Add recurring items from the Calendar page" icon="repeat" />
          ) : (
            <Card hover={false} style={{ padding: "4px 0" }}>
              {recurringItems.map((item, i) => {
                const isIncome = item.type === "income";
                const freqLabel = item.frequency.charAt(0).toUpperCase() + item.frequency.slice(1);
                return (
                  <FadeIn key={item.id} delay={120 + i * 20}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "13px 20px",
                      borderBottom: i < recurringItems.length - 1 ? "1px solid var(--border-subtle)" : "none",
                      opacity: item.isActive ? 1 : 0.5,
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
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{item.description || "Recurring"}</div>
                        <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                          {freqLabel}{item.dayOfMonth ? ` · Day ${item.dayOfMonth}` : ""}{item.categoryName ? ` · ${item.categoryName}` : ""}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0, marginRight: 8 }}>
                        <div className="mono" style={{
                          fontSize: 14, fontWeight: 600,
                          color: isIncome ? "var(--positive)" : "var(--text-primary)",
                        }}>
                          {isIncome ? "+" : "-"}{formatINR(Number(item.amount))}
                        </div>
                        <div style={{ fontSize: 11, color: item.isActive ? "var(--positive)" : "var(--text-tertiary)" }}>
                          {item.isActive ? "Active" : "Inactive"}
                        </div>
                      </div>
                      {/* Toggle active */}
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch(`/api/recurring-transactions/${item.id}`, {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ isActive: !item.isActive }),
                            });
                            if (res.ok) {
                              fetchRecurring();
                              showToast(item.isActive ? "Paused" : "Activated", "info");
                            }
                          } catch { showToast("Failed to update", "error"); }
                        }}
                        aria-label={item.isActive ? "Pause" : "Activate"}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--text-tertiary)" }}
                      >
                        <Icon name={item.isActive ? "pause" : "play"} size={14} />
                      </button>
                      {/* Delete */}
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch(`/api/recurring-transactions/${item.id}`, { method: "DELETE" });
                            if (res.ok) {
                              fetchRecurring();
                              showToast("Recurring item removed", "info");
                            }
                          } catch { showToast("Failed to delete", "error"); }
                        }}
                        aria-label="Delete recurring"
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--text-tertiary)" }}
                      >
                        <Icon name="x" size={14} />
                      </button>
                    </div>
                  </FadeIn>
                );
              })}
            </Card>
          )}
        </div>
      )}

      {/* Transactions Tab */}
      <div style={{ marginTop: 16, display: tab === "recurring" ? "none" : "block" }}>
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
                    <button onClick={() => setDeleteConfirm({ id: tx.id, name: tx.description || "Transaction" })}
                      aria-label="Delete transaction"
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

      {/* Load More */}
      {hasMore && tab !== "recurring" && (
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Button variant="secondary" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}

      <div style={{ height: 32 }} />

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <ConfirmDialog
          title="Delete transaction?"
          message={`Delete "${deleteConfirm.name}"? You can undo for a few seconds.`}
          onConfirm={async () => {
            const { id, name } = deleteConfirm;
            const txToRestore = txns.find(t => t.id === id);
            try {
              const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
              if (res.ok) {
                fetchData();
                showToast("Transaction deleted", "info", {
                  onUndo: async () => {
                    if (!txToRestore) return;
                    try {
                      const res = await fetch("/api/transactions", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          type: txToRestore.type,
                          amount: Number(txToRestore.amount),
                          categoryId: txToRestore.categoryId,
                          description: txToRestore.description,
                          date: txToRestore.date,
                          isRecurring: txToRestore.isRecurring,
                        }),
                      });
                      if (res.ok) {
                        fetchData();
                        showToast(`${name} restored`, "success");
                      } else {
                        showToast("Failed to restore", "error");
                      }
                    } catch {
                      showToast("Failed to restore", "error");
                    }
                  },
                });
              } else showToast("Failed to delete", "error");
            } catch { showToast("Failed to delete", "error"); }
            setDeleteConfirm(null);
          }}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

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
            <CurrencyInput
              value={Number(amount) || 0}
              onChange={v => setAmount(String(v))}
              placeholder="0"
              required
              autoFocus
              style={{ height: 48, fontSize: 20, fontWeight: 600 }}
            />
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
