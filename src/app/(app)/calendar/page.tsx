"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { FadeIn } from "@/components/ui/fade-in";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { TabPill } from "@/components/ui/tab-pill";
import { CurrencyInput } from "@/components/ui/currency-input";
import { useToast } from "@/components/ui/toast";
import { formatINR } from "@/lib/utils";

// ── Types ──

interface CalendarEvent {
  date: string;
  type: "emi" | "recurring" | "transaction";
  subType: "income" | "expense";
  amount: number;
  description: string;
  categoryName?: string;
  sourceId: string;
}

interface Category {
  id: string;
  name: string;
  type: string;
}

// ── Helpers ──

function getMonthStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay(); // 0=Sun
}

// ── Main Component ──

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const { showToast } = useToast();

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const monthStr = getMonthStr(currentMonth);
  const todayStr = toDateStr(new Date());

  const fetchEvents = useCallback(() => {
    setLoading(true);
    fetch(`/api/calendar?month=${monthStr}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setEvents(Array.isArray(data) ? data : []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [monthStr]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Group events by date
  const eventsByDate: Record<string, CalendarEvent[]> = {};
  for (const ev of events) {
    if (!eventsByDate[ev.date]) eventsByDate[ev.date] = [];
    eventsByDate[ev.date].push(ev);
  }

  const selectedEvents = selectedDate ? eventsByDate[selectedDate] || [] : [];

  const navigateMonth = (delta: number) => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
    setSelectedDate(null);
  };

  // Calendar grid
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Build grid cells
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad to fill last row
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = new Date(year, month, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <FadeIn delay={0}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600 }}>Calendar</h1>
          <Button onClick={() => setShowRecurringModal(true)}>
            <Icon name="plus" size={14} color="var(--bg-root)" /> Recurring
          </Button>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 16 }}>
          EMIs, recurring items & transactions
        </p>
      </FadeIn>

      {/* Month Navigation */}
      <FadeIn delay={40}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 16, padding: "0 4px",
        }}>
          <button onClick={() => navigateMonth(-1)} aria-label="Previous month" style={{
            background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-sm)", width: 36, height: 36, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-primary)",
          }}>
            <Icon name="chevron-left" size={16} />
          </button>
          <span style={{ fontSize: 16, fontWeight: 600 }}>{monthLabel}</span>
          <button onClick={() => navigateMonth(1)} aria-label="Next month" style={{
            background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-sm)", width: 36, height: 36, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-primary)",
          }}>
            <Icon name="chevron-right" size={16} />
          </button>
        </div>
      </FadeIn>

      {/* Calendar Grid */}
      <FadeIn delay={80}>
        <Card style={{ padding: 12, marginBottom: 16 }}>
          {/* Day name headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
            {dayNames.map((d) => (
              <div key={d} style={{
                textAlign: "center", fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)",
                padding: "4px 0", textTransform: "uppercase", letterSpacing: "0.04em",
              }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
            {cells.map((day, i) => {
              if (day === null) return <div key={`empty-${i}`} />;

              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayEvents = eventsByDate[dateStr] || [];
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              const hasIncome = dayEvents.some((e) => e.subType === "income");
              const hasExpense = dayEvents.some((e) => e.subType === "expense" && e.type !== "emi");
              const hasEmi = dayEvents.some((e) => e.type === "emi");

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  style={{
                    background: isSelected
                      ? "var(--accent)"
                      : isToday
                        ? "var(--bg-elevated)"
                        : "transparent",
                    border: isToday && !isSelected ? "1px solid var(--accent)" : "1px solid transparent",
                    borderRadius: "var(--radius-sm)",
                    padding: "6px 2px 4px",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 3,
                    minHeight: 44,
                    color: isSelected ? "var(--bg-root)" : "var(--text-primary)",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: isToday ? 700 : 400, lineHeight: 1 }}>
                    {day}
                  </span>
                  {dayEvents.length > 0 && (
                    <div style={{ display: "flex", gap: 2 }}>
                      {hasIncome && (
                        <span style={{
                          width: 5, height: 5, borderRadius: "50%",
                          background: isSelected ? "var(--bg-root)" : "var(--positive)",
                        }} />
                      )}
                      {hasExpense && (
                        <span style={{
                          width: 5, height: 5, borderRadius: "50%",
                          background: isSelected ? "var(--bg-root)" : "var(--text-tertiary)",
                        }} />
                      )}
                      {hasEmi && (
                        <span style={{
                          width: 5, height: 5, borderRadius: "50%",
                          background: isSelected ? "var(--bg-root)" : "var(--negative)",
                        }} />
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{
            display: "flex", gap: 16, justifyContent: "center", marginTop: 10, paddingTop: 8,
            borderTop: "1px solid var(--border-subtle)",
          }}>
            {[
              { color: "var(--positive)", label: "Income" },
              { color: "var(--text-tertiary)", label: "Expense" },
              { color: "var(--negative)", label: "EMI" },
            ].map(({ color, label }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-tertiary)" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
                {label}
              </div>
            ))}
          </div>
        </Card>
      </FadeIn>

      {/* Selected Date Events */}
      {selectedDate && (
        <FadeIn delay={100}>
          <div style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 13, fontWeight: 600, color: "var(--text-tertiary)",
              textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10,
            }}>
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", {
                weekday: "long", day: "numeric", month: "long",
              })}
            </div>

            {selectedEvents.length === 0 ? (
              <Card style={{ padding: "20px", textAlign: "center" }}>
                <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>No events on this day</p>
              </Card>
            ) : (
              <Card hover={false} style={{ padding: "4px 0" }}>
                {selectedEvents.map((ev, i) => {
                  const isIncome = ev.subType === "income";
                  const typeLabel = ev.type === "emi" ? "EMI" : ev.type === "recurring" ? "Recurring" : "Transaction";
                  const typeColor = ev.type === "emi" ? "var(--negative)" : isIncome ? "var(--positive)" : "var(--text-tertiary)";

                  return (
                    <div key={`${ev.sourceId}-${i}`} style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "13px 20px",
                      borderBottom: i < selectedEvents.length - 1 ? "1px solid var(--border-subtle)" : "none",
                    }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: "var(--radius-sm)",
                        background: ev.type === "emi" ? "var(--negative-dim)" : isIncome ? "var(--positive-dim)" : "var(--bg-elevated)",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        <Icon
                          name={ev.type === "emi" ? "landmark" : isIncome ? "trending-up" : "trending-down"}
                          size={16}
                          color={typeColor}
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{ev.description}</div>
                        <div style={{ fontSize: 11, color: typeColor, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          {typeLabel}{ev.categoryName ? ` · ${ev.categoryName}` : ""}
                        </div>
                      </div>
                      <span className="mono" style={{
                        fontSize: 14, fontWeight: 600, flexShrink: 0,
                        color: isIncome ? "var(--positive)" : ev.type === "emi" ? "var(--negative)" : "var(--text-primary)",
                      }}>
                        {isIncome ? "+" : "-"}{formatINR(ev.amount)}
                      </span>
                    </div>
                  );
                })}
              </Card>
            )}
          </div>
        </FadeIn>
      )}

      {/* Monthly Summary */}
      {!selectedDate && events.length > 0 && (
        <FadeIn delay={120}>
          <MonthSummary events={events} />
        </FadeIn>
      )}

      {loading && (
        <div style={{ padding: "24px 0", textAlign: "center", color: "var(--text-tertiary)" }}>
          Loading...
        </div>
      )}

      <div style={{ height: 32 }} />

      {/* Recurring Transaction Modal */}
      {showRecurringModal && (
        <RecurringModal
          categories={categories}
          onClose={() => setShowRecurringModal(false)}
          onSave={() => {
            setShowRecurringModal(false);
            fetchEvents();
            showToast("Recurring transaction created", "success");
          }}
        />
      )}
    </div>
  );
}

// ── Month Summary ──

function MonthSummary({ events }: { events: CalendarEvent[] }) {
  const totalIncome = events.filter((e) => e.subType === "income").reduce((s, e) => s + e.amount, 0);
  const totalExpense = events.filter((e) => e.subType === "expense").reduce((s, e) => s + e.amount, 0);

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)",
        textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10,
      }}>
        Month Overview
      </div>
      <Card style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-around" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 4 }}>Expected Income</div>
            <div className="mono" style={{ fontSize: 16, fontWeight: 600, color: "var(--positive)" }}>
              {formatINR(totalIncome, { compact: true })}
            </div>
          </div>
          <div style={{ width: 1, background: "var(--border-subtle)" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 4 }}>Expected Expenses</div>
            <div className="mono" style={{ fontSize: 16, fontWeight: 600, color: "var(--negative)" }}>
              {formatINR(totalExpense, { compact: true })}
            </div>
          </div>
          <div style={{ width: 1, background: "var(--border-subtle)" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 4 }}>Net</div>
            <div className="mono" style={{
              fontSize: 16, fontWeight: 600,
              color: totalIncome - totalExpense >= 0 ? "var(--positive)" : "var(--negative)",
            }}>
              {formatINR(totalIncome - totalExpense, { compact: true })}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ── Recurring Transaction Modal ──

function RecurringModal({ categories, onClose, onSave }: {
  categories: Category[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const filteredCats = categories.filter((c) => c.type === type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        type,
        amount: Number(amount),
        description,
        categoryId: categoryId || null,
        frequency,
        startDate,
      };
      if (frequency !== "daily" && frequency !== "weekly") {
        body.dayOfMonth = Number(dayOfMonth);
      }
      if (endDate) body.endDate = endDate;

      const res = await fetch("/api/recurring-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        onSave();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", height: 40, padding: "0 12px", borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)", background: "var(--bg-elevated)",
    color: "var(--text-primary)", fontSize: 14, fontFamily: "var(--font-sans)",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6,
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
      zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      animation: "fadeIn 0.2s ease",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "var(--bg-surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)",
        width: "100%", maxWidth: 420, padding: 28, animation: "slideUp 0.25s ease",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>Add Recurring Transaction</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", padding: 4 }}>
            <Icon name="x" size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Type toggle */}
          <div style={{ display: "flex", gap: 8 }}>
            {(["expense", "income"] as const).map((t) => (
              <button key={t} type="button" onClick={() => { setType(t); setCategoryId(""); }}
                style={{
                  flex: 1, height: 36, borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer",
                  background: type === t ? (t === "expense" ? "var(--negative-dim)" : "var(--positive-dim)") : "var(--bg-elevated)",
                  color: type === t ? (t === "expense" ? "var(--negative)" : "var(--positive)") : "var(--text-tertiary)",
                  fontSize: 13, fontWeight: 600, fontFamily: "var(--font-sans)", textTransform: "capitalize",
                }}>
                {t}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div>
            <label style={labelStyle}>Amount (₹)</label>
            <CurrencyInput
              value={Number(amount) || 0}
              onChange={(v) => setAmount(String(v))}
              placeholder="0"
              required
              autoFocus
              style={{ height: 48, fontSize: 20, fontWeight: 600 }}
            />
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Description</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Netflix, Rent, Salary" required style={inputStyle} />
          </div>

          {/* Category */}
          <div>
            <label style={labelStyle}>Category</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={inputStyle}>
              <option value="">Select category</option>
              {filteredCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Frequency */}
          <div>
            <label style={labelStyle}>Frequency</label>
            <select value={frequency} onChange={(e) => setFrequency(e.target.value)} style={inputStyle}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          {/* Day of Month (for monthly/quarterly/yearly) */}
          {frequency !== "daily" && frequency !== "weekly" && (
            <div>
              <label style={labelStyle}>Day of Month</label>
              <input type="number" min="1" max="31" value={dayOfMonth}
                onChange={(e) => setDayOfMonth(e.target.value)} style={inputStyle} />
            </div>
          )}

          {/* Start Date */}
          <div>
            <label style={labelStyle}>Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              required style={inputStyle} />
          </div>

          {/* End Date (optional) */}
          <div>
            <label style={labelStyle}>End Date (optional)</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              style={inputStyle} />
          </div>

          <button type="submit" disabled={submitting || !amount || !description} style={{
            height: 42, borderRadius: "var(--radius-sm)", border: "none", marginTop: 4,
            background: "var(--accent)", color: "var(--bg-root)", fontSize: 14, fontWeight: 600,
            cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1,
            fontFamily: "var(--font-sans)",
          }}>
            {submitting ? "Saving..." : "Create Recurring"}
          </button>
        </form>
      </div>
    </div>
  );
}
