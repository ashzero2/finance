"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { ProgressRing } from "@/components/ui/progress-ring";
import { FadeIn } from "@/components/ui/fade-in";
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { formatINR, getMonthsRemaining } from "@/lib/utils";
import { CurrencyInput } from "@/components/ui/currency-input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { PageSkeleton } from "@/components/ui/skeleton";

interface Goal {
  id: string; name: string; targetAmount: string; currentAmount: string;
  targetDate: string | null; priority: string; category: string;
  icon: string; color: string; isCompleted: boolean;
  monthlyContribution: string | null;
  linkedAssetIds: string[];
}

interface AssetOption {
  id: string; name: string; category: string; currentValue: string;
}

interface EmergencyFundData {
  id: string; targetMonths: number; monthlyEssentialExpenses: string;
  currentFundAmount: string; linkedAssetIds: string[];
}

const GOAL_COLORS = ["#C9A84C", "#34D399", "#60A5FA", "#A78BFA", "#F87171", "#FB923C", "#FBBF24"];

export default function GoalsPage() {
  const [goalsList, setGoalsList] = useState<Goal[]>([]);
  const [ef, setEf] = useState<EmergencyFundData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showEfForm, setShowEfForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const { showToast } = useToast();

  const fetchData = useCallback(() => {
    Promise.all([
      fetch("/api/goals").then(r => r.ok ? r.json() : []),
      fetch("/api/emergency-fund").then(r => r.ok ? r.json() : null),
    ]).then(([g, e]) => {
      setGoalsList(Array.isArray(g) ? g : []);
      setEf(e && e.id ? e : null);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalTarget = goalsList.reduce((s, g) => s + Number(g.targetAmount), 0);
  const totalSaved = goalsList.reduce((s, g) => s + Number(g.currentAmount), 0);
  const totalPct = totalTarget > 0 ? totalSaved / totalTarget : 0;

  if (loading) return <PageSkeleton rows={3} />;

  return (
    <div>
      <FadeIn delay={0}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600 }}>Goals</h1>
          <Button onClick={() => { setEditingGoal(null); setShowGoalForm(true); }}>
            <Icon name="plus" size={14} color="var(--bg-root)" /> Goal
          </Button>
        </div>
      </FadeIn>

      {/* Summary */}
      {goalsList.length > 0 && (
        <FadeIn delay={50}>
          <Card hover={false} style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
              <ProgressRing progress={totalPct} size={80} sw={6} color="var(--accent)">
                <span className="mono" style={{ fontSize: 18, fontWeight: 700, color: "var(--accent)" }}>
                  {Math.round(totalPct * 100)}%
                </span>
              </ProgressRing>
              <div>
                <div style={{ fontSize: 12, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
                  Total Goal Progress
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span className="mono" style={{ fontSize: 22, fontWeight: 700 }}>{formatINR(totalSaved, { compact: true })}</span>
                  <span className="mono" style={{ fontSize: 14, color: "var(--text-tertiary)" }}>/ {formatINR(totalTarget, { compact: true })}</span>
                </div>
                <div style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 4 }}>across {goalsList.length} goals</div>
              </div>
            </div>
          </Card>
        </FadeIn>
      )}

      {/* Emergency Fund */}
      <div style={{ marginTop: 24 }}>
        <SectionHeader title="Emergency Fund" action={ef ? "Edit" : "Set up"} onAction={() => setShowEfForm(true)} />
        {ef ? (
          <FadeIn delay={100}>
            <Card hover={false} style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <ProgressRing progress={Number(ef.monthlyEssentialExpenses) > 0 ? Number(ef.currentFundAmount) / (Number(ef.monthlyEssentialExpenses) * ef.targetMonths) : 0}
                  size={56} sw={4} color="#34D399">
                  <Icon name="shield" size={20} color="#34D399" />
                </ProgressRing>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Emergency Fund</div>
                  <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
                    {Number(ef.monthlyEssentialExpenses) > 0
                      ? `${(Number(ef.currentFundAmount) / Number(ef.monthlyEssentialExpenses)).toFixed(1)} months covered`
                      : "Set monthly expenses to track"
                    } · Target: {ef.targetMonths} months
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="mono" style={{ fontSize: 16, fontWeight: 600, color: "#34D399" }}>{formatINR(Number(ef.currentFundAmount), { compact: true })}</div>
                  <div className="mono" style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                    / {formatINR(Number(ef.monthlyEssentialExpenses) * ef.targetMonths, { compact: true })}
                  </div>
                </div>
              </div>
            </Card>
          </FadeIn>
        ) : (
          <EmptyState icon="shield" title="No emergency fund" subtitle="Set up your emergency fund target" />
        )}
      </div>

      {/* Goals Grid */}
      <div style={{ marginTop: 24 }}>
        <SectionHeader title="Active Goals" />
        {goalsList.length === 0 ? (
          <EmptyState icon="target" title="No goals yet" subtitle="Create your first financial goal" />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {goalsList.map((g, i) => {
              const pct = Number(g.targetAmount) > 0 ? Number(g.currentAmount) / Number(g.targetAmount) : 0;
              const months = g.targetDate ? getMonthsRemaining(g.targetDate) : 0;
              const remaining = Number(g.targetAmount) - Number(g.currentAmount);
              return (
                <FadeIn key={g.id} delay={150 + i * 60}>
                  <Card onClick={() => setSelectedGoal(g)} style={{ padding: 24 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 18, marginBottom: 20 }}>
                      <ProgressRing progress={pct} size={64} sw={4.5} color={g.color}>
                        <span className="mono" style={{ fontSize: 15, fontWeight: 700, color: g.color }}>{Math.round(pct * 100)}%</span>
                      </ProgressRing>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <Icon name={g.icon} size={16} color={g.color} />
                          <h3 style={{ fontSize: 16, fontWeight: 600 }}>{g.name}</h3>
                        </div>
                        <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
                          {months > 0 ? `${months} months to deadline` : g.targetDate ? "Past deadline" : "No deadline"}
                        </div>
                      </div>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                        <span className="mono" style={{ fontSize: 18, fontWeight: 700 }}>{formatINR(Number(g.currentAmount), { compact: true })}</span>
                        <span className="mono" style={{ fontSize: 13, color: "var(--text-tertiary)" }}>of {formatINR(Number(g.targetAmount), { compact: true })}</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 3, background: "var(--border)", overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 3, background: g.color, width: `${Math.min(pct, 1) * 100}%`, transition: "width 1.2s cubic-bezier(0.4,0,0.15,1)" }} />
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                        {g.monthlyContribution ? `${formatINR(Number(g.monthlyContribution), { compact: true })}/month` : ""}
                      </span>
                      <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{formatINR(remaining, { compact: true })} to go</span>
                    </div>
                  </Card>
                </FadeIn>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ height: 32 }} />

      {/* Goal Detail Modal */}
      {selectedGoal && (
        <GoalDetailModal goal={selectedGoal}
          onClose={() => setSelectedGoal(null)}
          onEdit={() => { setEditingGoal(selectedGoal); setSelectedGoal(null); setShowGoalForm(true); }}
          onDelete={() => {
            setSelectedGoal(null);
            setDeleteConfirm({ id: selectedGoal.id, name: selectedGoal.name });
          }}
        />
      )}

      {/* Goal Form Modal */}
      {showGoalForm && (
        <GoalFormModal
          goal={editingGoal}
          onClose={() => { setShowGoalForm(false); setEditingGoal(null); }}
          onSave={async (data) => {
            if (editingGoal) {
              await fetch(`/api/goals/${editingGoal.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
            } else {
              await fetch("/api/goals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
            }
            setShowGoalForm(false); setEditingGoal(null); fetchData();
          }}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <ConfirmDialog
          title={`Delete ${deleteConfirm.name}?`}
          message="You can undo this action for a few seconds after deleting."
          onConfirm={async () => {
            const { id, name } = deleteConfirm;
            const goalToRestore = goalsList.find(g => g.id === id);
            try {
              const res = await fetch(`/api/goals/${id}`, { method: "DELETE" });
              if (res.ok) {
                fetchData();
                showToast(`${name} deleted`, "info", {
                  onUndo: async () => {
                    if (!goalToRestore) return;
                    try {
                      const res = await fetch("/api/goals", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          name: goalToRestore.name,
                          targetAmount: Number(goalToRestore.targetAmount),
                          currentAmount: Number(goalToRestore.currentAmount),
                          targetDate: goalToRestore.targetDate,
                          monthlyContribution: goalToRestore.monthlyContribution ? Number(goalToRestore.monthlyContribution) : null,
                          color: goalToRestore.color,
                          icon: goalToRestore.icon,
                          priority: goalToRestore.priority,
                          category: goalToRestore.category,
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

      {/* Emergency Fund Form Modal */}
      {showEfForm && (
        <EfFormModal ef={ef} onClose={() => setShowEfForm(false)}
          onSave={async (data) => {
            await fetch("/api/emergency-fund", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
            setShowEfForm(false); fetchData();
          }}
        />
      )}
    </div>
  );
}

// ── Goal Detail Modal ──
function GoalDetailModal({ goal, onClose, onEdit, onDelete }: {
  goal: Goal; onClose: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const [linkedAssetNames, setLinkedAssetNames] = useState<string[]>([]);
  const pct = Number(goal.targetAmount) > 0 ? Number(goal.currentAmount) / Number(goal.targetAmount) : 0;
  const remaining = Number(goal.targetAmount) - Number(goal.currentAmount);
  const months = goal.targetDate ? getMonthsRemaining(goal.targetDate) : 0;
  const monthly = Number(goal.monthlyContribution || 0);
  const projectedMonths = monthly > 0 ? Math.ceil(remaining / monthly) : Infinity;

  // Fetch linked asset names
  useEffect(() => {
    if (!goal.linkedAssetIds || goal.linkedAssetIds.length === 0) return;
    fetch("/api/assets").then(r => r.ok ? r.json() : []).then((allAssets: AssetOption[]) => {
      const names = (goal.linkedAssetIds || [])
        .map(id => allAssets.find((a: AssetOption) => a.id === id)?.name)
        .filter(Boolean) as string[];
      setLinkedAssetNames(names);
    }).catch(() => {});
  }, [goal.linkedAssetIds]);

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
      zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "var(--bg-surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)",
        width: "100%", maxWidth: 440, padding: 28, animation: "slideUp 0.25s ease",
      }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", padding: 4 }}>
            <Icon name="x" size={18} />
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: linkedAssetNames.length > 0 ? 12 : 28 }}>
          <ProgressRing progress={pct} size={72} sw={5} color={goal.color}>
            <span className="mono" style={{ fontSize: 16, fontWeight: 700, color: goal.color }}>{Math.round(pct * 100)}%</span>
          </ProgressRing>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{goal.name}</h2>
            <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
              {months > 0 ? `Deadline: ${new Date(goal.targetDate!).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}` : goal.targetDate ? "Past deadline" : "No deadline set"}
            </div>
          </div>
        </div>
        {linkedAssetNames.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
            <Icon name="link" size={12} color="var(--text-tertiary)" />
            <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Linked to:</span>
            {linkedAssetNames.map((name, i) => (
              <span key={i} style={{
                fontSize: 11, fontWeight: 500, color: "var(--accent)",
                background: "var(--accent-dim)", padding: "2px 8px",
                borderRadius: "var(--radius-full)",
              }}>{name}</span>
            ))}
            <span style={{ fontSize: 11, color: "var(--positive)", fontStyle: "italic" }}>· auto-tracking</span>
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Saved", value: formatINR(Number(goal.currentAmount)), color: goal.color },
            { label: "Remaining", value: formatINR(remaining) },
            { label: "Monthly", value: monthly > 0 ? formatINR(monthly) : "—" },
            { label: "Projected", value: projectedMonths < Infinity ? `${projectedMonths} mo` : "—" },
          ].map((s, i) => (
            <div key={i} style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius-md)", padding: "14px 16px" }}>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>{s.label}</div>
              <div className="mono" style={{ fontSize: 16, fontWeight: 600, color: s.color || "var(--text-primary)" }}>{s.value}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onEdit} style={{
            flex: 1, height: 40, borderRadius: "var(--radius-sm)", border: "none",
            background: "var(--accent)", color: "var(--bg-root)", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)",
          }}>Edit</button>
          <button onClick={onDelete} style={{
            height: 40, padding: "0 16px", borderRadius: "var(--radius-sm)",
            border: "1px solid var(--negative)", background: "transparent",
            color: "var(--negative)", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-sans)",
          }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── Goal Form Modal ──
function GoalFormModal({ goal, onClose, onSave }: {
  goal: Goal | null; onClose: () => void; onSave: (data: Record<string, unknown>) => Promise<void>;
}) {
  const [name, setName] = useState(goal?.name || "");
  const [targetAmount, setTargetAmount] = useState(goal ? Number(goal.targetAmount) : "");
  const [currentAmount, setCurrentAmount] = useState(goal ? Number(goal.currentAmount) : "");
  const [targetDate, setTargetDate] = useState(goal?.targetDate || "");
  const [monthlyContribution, setMonthlyContribution] = useState(goal?.monthlyContribution ? Number(goal.monthlyContribution) : "");
  const [color, setColor] = useState(goal?.color || GOAL_COLORS[0]);
  const [icon, setIcon] = useState(goal?.icon || "target");
  const [linkedAssetIds, setLinkedAssetIds] = useState<string[]>(goal?.linkedAssetIds || []);
  const [availableAssets, setAvailableAssets] = useState<AssetOption[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const hasLinkedAssets = linkedAssetIds.length > 0;

  // Fetch available assets on mount
  useEffect(() => {
    fetch("/api/assets").then(r => r.ok ? r.json() : []).then(data => {
      setAvailableAssets(Array.isArray(data) ? data : []);
    }).catch(() => {});
  }, []);

  const toggleAsset = (assetId: string) => {
    setLinkedAssetIds(prev =>
      prev.includes(assetId) ? prev.filter(id => id !== assetId) : [...prev, assetId]
    );
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
      zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "var(--bg-surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)",
        width: "100%", maxWidth: 440, padding: 28, animation: "slideUp 0.25s ease", maxHeight: "80vh", overflowY: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>{goal ? "Edit Goal" : "New Goal"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", padding: 4 }}>
            <Icon name="x" size={18} />
          </button>
        </div>
        <form onSubmit={async (e) => {
          e.preventDefault(); setSubmitting(true);
          await onSave({
            name,
            targetAmount: Number(targetAmount),
            currentAmount: hasLinkedAssets ? 0 : Number(currentAmount),
            targetDate: targetDate || null,
            monthlyContribution: monthlyContribution ? Number(monthlyContribution) : null,
            color, icon,
            linkedAssetIds,
          });
          setSubmitting(false);
        }}
          style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <InputField label="Goal Name" value={name} onChange={setName} required />
          <InputField label="Target Amount (₹)" value={String(targetAmount)} onChange={v => setTargetAmount(v === "" ? "" : Number(v))} type="number" required />

          {/* Link Assets */}
          {availableAssets.length > 0 && (
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>
                Link Assets <span style={{ fontWeight: 400, color: "var(--text-tertiary)" }}>(auto-tracks progress)</span>
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 140, overflowY: "auto",
                border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: 6 }}>
                {availableAssets.map(asset => {
                  const isSelected = linkedAssetIds.includes(asset.id);
                  return (
                    <button key={asset.id} type="button" onClick={() => toggleAsset(asset.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
                        background: isSelected ? "var(--accent-dim)" : "transparent",
                        border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer",
                        textAlign: "left", fontFamily: "var(--font-sans)", width: "100%",
                      }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                        border: isSelected ? "none" : "2px solid var(--border)",
                        background: isSelected ? "var(--accent)" : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {isSelected && <Icon name="check" size={12} color="var(--bg-root)" />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{asset.name}</div>
                        <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{asset.category}</div>
                      </div>
                      <span className="mono" style={{ fontSize: 12, color: "var(--text-secondary)", flexShrink: 0 }}>
                        {formatINR(Number(asset.currentValue), { compact: true })}
                      </span>
                    </button>
                  );
                })}
              </div>
              {hasLinkedAssets && (
                <div style={{ fontSize: 11, color: "var(--positive)", marginTop: 4 }}>
                  ✓ Progress will auto-update when linked assets change
                </div>
              )}
            </div>
          )}

          {/* Saved So Far — only shown when no assets linked */}
          {!hasLinkedAssets && (
            <InputField label="Saved So Far (₹)" value={String(currentAmount)} onChange={v => setCurrentAmount(v === "" ? "" : Number(v))} type="number" />
          )}

          <InputField label="Monthly Contribution (₹)" value={String(monthlyContribution)} onChange={v => setMonthlyContribution(v === "" ? "" : Number(v))} type="number" />
          <InputField label="Target Date" value={targetDate} onChange={setTargetDate} type="date" />
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Color</label>
            <div style={{ display: "flex", gap: 6 }}>
              {GOAL_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)} style={{
                  width: 28, height: 28, borderRadius: "50%", background: c, border: color === c ? "2px solid var(--text-primary)" : "2px solid transparent", cursor: "pointer",
                }} />
              ))}
            </div>
          </div>
          <button type="submit" disabled={submitting || !name || !targetAmount} style={{
            height: 42, borderRadius: "var(--radius-sm)", border: "none", marginTop: 4,
            background: "var(--accent)", color: "var(--bg-root)", fontSize: 14, fontWeight: 600,
            cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1, fontFamily: "var(--font-sans)",
          }}>{submitting ? "Saving..." : "Save Goal"}</button>
        </form>
      </div>
    </div>
  );
}

// ── Emergency Fund Form ──
function EfFormModal({ ef, onClose, onSave }: {
  ef: EmergencyFundData | null; onClose: () => void; onSave: (data: Record<string, unknown>) => Promise<void>;
}) {
  const [targetMonths, setTargetMonths] = useState<number | string>(ef?.targetMonths || 6);
  const [monthlyExp, setMonthlyExp] = useState(ef ? Number(ef.monthlyEssentialExpenses) : "");
  const [currentFund, setCurrentFund] = useState(ef ? Number(ef.currentFundAmount) : "");
  const [submitting, setSubmitting] = useState(false);

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
      zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "var(--bg-surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)",
        width: "100%", maxWidth: 400, padding: 28, animation: "slideUp 0.25s ease",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>Emergency Fund</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", padding: 4 }}>
            <Icon name="x" size={18} />
          </button>
        </div>
        <form onSubmit={async (e) => {
          e.preventDefault(); setSubmitting(true);
          await onSave({ targetMonths: Number(targetMonths) || 6, monthlyEssentialExpenses: Number(monthlyExp) || 0, currentFundAmount: Number(currentFund) || 0 });
          setSubmitting(false);
        }} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <InputField label="Target Months" value={String(targetMonths)} onChange={v => setTargetMonths(v === "" ? "" : Number(v))} type="number" required />
          <InputField label="Monthly Essential Expenses (₹)" value={String(monthlyExp)} onChange={v => setMonthlyExp(v === "" ? "" : Number(v))} type="number" required />
          <InputField label="Current Fund Amount (₹)" value={String(currentFund)} onChange={v => setCurrentFund(v === "" ? "" : Number(v))} type="number" />
          <button type="submit" disabled={submitting} style={{
            height: 42, borderRadius: "var(--radius-sm)", border: "none", marginTop: 4,
            background: "var(--accent)", color: "var(--bg-root)", fontSize: 14, fontWeight: 600,
            cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1, fontFamily: "var(--font-sans)",
          }}>{submitting ? "Saving..." : "Save"}</button>
        </form>
      </div>
    </div>
  );
}

// ── Reusable Input Field ──
function InputField({ label, value, onChange, type = "text", required = false }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean;
}) {
  // Use CurrencyInput for rupee amount fields
  if (type === "number" && label.includes("₹")) {
    return (
      <div>
        <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>{label}</label>
        <CurrencyInput
          value={Number(value) || 0}
          onChange={v => onChange(String(v))}
          required={required}
        />
      </div>
    );
  }

  return (
    <div>
      <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} required={required}
        step={type === "number" ? "any" : undefined}
        style={{
          width: "100%", height: 40, padding: "0 12px", borderRadius: "var(--radius-sm)",
          border: "1px solid var(--border)", background: "var(--bg-elevated)",
          color: "var(--text-primary)", fontSize: 14, outline: "none", fontFamily: "var(--font-sans)",
        }} />
    </div>
  );
}
