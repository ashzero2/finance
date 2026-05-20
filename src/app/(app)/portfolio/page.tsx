"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { ChangeIndicator } from "@/components/ui/change-indicator";
import { MiniDonut } from "@/components/ui/mini-donut";
import { FadeIn } from "@/components/ui/fade-in";
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/utils";
import { CurrencyInput } from "@/components/ui/currency-input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { PageSkeleton } from "@/components/ui/skeleton";

interface Asset {
  id: string; name: string; category: string; subCategory: string | null;
  currentValue: string; isLiquid: boolean; liquidityDays: number;
  institution: string | null; notes: string | null;
}

interface Liability {
  id: string; name: string; category: string;
  principalAmount: string; outstandingAmount: string;
  interestRate: string | null; emiAmount: string | null; emiDay: number | null;
  institution: string | null;
}

interface SnapshotData {
  previousValue: number | null;
  previousDate: string | null;
  change: number;
  changePercent: number;
  history: { value: number; date: string }[];
}

const ASSET_CATEGORIES = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank Account" },
  { value: "investment", label: "Investment" },
  { value: "property", label: "Property" },
  { value: "vehicle", label: "Vehicle" },
  { value: "other", label: "Other" },
];

const LIABILITY_CATEGORIES = [
  { value: "loan", label: "Loan" },
  { value: "credit_card", label: "Credit Card" },
  { value: "personal_debt", label: "Personal Debt" },
  { value: "other", label: "Other" },
];

const CATEGORY_COLORS: Record<string, string> = {
  cash: "#34D399", bank: "#34D399", investment: "#60A5FA",
  property: "#FBBF24", vehicle: "#FB923C", other: "#8B8B96",
};

const CATEGORY_ICONS: Record<string, string> = {
  cash: "wallet", bank: "wallet", investment: "trending-up",
  property: "home", vehicle: "car", other: "circle",
  loan: "calendar", credit_card: "credit-card", personal_debt: "circle",
};

export default function PortfolioPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [liabs, setLiabs] = useState<Liability[]>([]);
  const [snapshots, setSnapshots] = useState<Record<string, SnapshotData>>({});
  const [loading, setLoading] = useState(true);
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [showLiabForm, setShowLiabForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [editingLiab, setEditingLiab] = useState<Liability | null>(null);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "asset" | "liability"; id: string; name: string } | null>(null);
  const { showToast } = useToast();

  const fetchData = useCallback(() => {
    Promise.all([
      fetch("/api/assets").then(r => r.ok ? r.json() : []),
      fetch("/api/liabilities").then(r => r.ok ? r.json() : []),
      fetch("/api/assets/snapshots").then(r => r.ok ? r.json() : {}).catch(() => ({})),
    ]).then(([a, l, s]) => {
      setAssets(Array.isArray(a) ? a : []);
      setLiabs(Array.isArray(l) ? l : []);
      setSnapshots(s || {});
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalAssets = assets.reduce((s, a) => s + Number(a.currentValue), 0);
  const totalLiabilities = liabs.reduce((s, l) => s + Number(l.outstandingAmount), 0);
  const netWorth = totalAssets - totalLiabilities;

  // Group assets by category
  const grouped = assets.reduce<Record<string, Asset[]>>((acc, a) => {
    (acc[a.category] = acc[a.category] || []).push(a);
    return acc;
  }, {});

  // Allocation segments
  const allocation = Object.entries(grouped).map(([cat, items]) => ({
    name: ASSET_CATEGORIES.find(c => c.value === cat)?.label || cat,
    value: items.reduce((s, a) => s + Number(a.currentValue), 0),
    color: CATEGORY_COLORS[cat] || "#8B8B96",
  })).filter(s => s.value > 0);

  if (loading) {
    return <PageSkeleton rows={4} />;
  }

  return (
    <div>
      <FadeIn delay={0}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600 }}>Portfolio</h1>
          <div style={{ display: "flex", gap: 8 }}>
            <Button onClick={() => { setEditingAsset(null); setShowAssetForm(true); }}>
              <Icon name="plus" size={14} color="var(--bg-root)" /> Asset
            </Button>
            <Button variant="secondary" onClick={() => { setEditingLiab(null); setShowLiabForm(true); }}>
              <Icon name="plus" size={14} /> Liability
            </Button>
          </div>
        </div>
      </FadeIn>

      {/* Summary Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))" }}>
        <FadeIn delay={50}>
          <Card hover={false} style={{ padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)", fontWeight: 500, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Total Assets</div>
            <div className="mono" style={{ fontSize: 20, fontWeight: 700 }}>
              <AnimatedNumber value={totalAssets} delay={100} />
            </div>
          </Card>
        </FadeIn>
        <FadeIn delay={100}>
          <Card hover={false} style={{ padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)", fontWeight: 500, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Total Liabilities</div>
            <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: "var(--negative)" }}>
              <AnimatedNumber value={totalLiabilities} delay={150} />
            </div>
          </Card>
        </FadeIn>
        <FadeIn delay={150}>
          <Card hover={false} style={{ padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)", fontWeight: 500, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Net Worth</div>
            <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: "var(--accent)" }}>
              <AnimatedNumber value={netWorth} delay={200} />
            </div>
          </Card>
        </FadeIn>
      </div>

      {/* Allocation */}
      {allocation.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <SectionHeader title="Allocation" />
          <FadeIn delay={200}>
            <Card hover={false} style={{ padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap" }}>
                <div style={{ position: "relative" }}>
                  <MiniDonut segments={allocation} size={140} strokeWidth={18} />
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 500 }}>Total</span>
                    <span className="mono" style={{ fontSize: 18, fontWeight: 700 }}>{formatINR(totalAssets, { compact: true })}</span>
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 180, display: "flex", flexDirection: "column", gap: 10 }}>
                  {allocation.map((seg, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: seg.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: "var(--text-secondary)", flex: 1 }}>{seg.name}</span>
                      <span className="mono" style={{ fontSize: 13, fontWeight: 500 }}>{formatINR(seg.value, { compact: true })}</span>
                      <span className="mono" style={{ fontSize: 12, color: "var(--text-tertiary)", width: 40, textAlign: "right" }}>
                        {totalAssets > 0 ? (seg.value / totalAssets * 100).toFixed(0) : 0}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </FadeIn>
        </div>
      )}

      {/* Holdings */}
      <div style={{ marginTop: 28 }}>
        <SectionHeader title="Holdings" />
        {assets.length === 0 ? (
          <EmptyState icon="wallet" title="No assets yet" subtitle="Add your first asset to see your holdings" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {Object.entries(grouped).map(([cat, items], ci) => {
              const catTotal = items.reduce((s, a) => s + Number(a.currentValue), 0);
              const isOpen = expandedCat === cat;
              return (
                <FadeIn key={cat} delay={250 + ci * 50}>
                  <Card hover={false} style={{ padding: 0, overflow: "hidden" }}>
                    <div onClick={() => setExpandedCat(isOpen ? null : cat)}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", cursor: "pointer", transition: "background 0.15s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <div style={{ width: 36, height: 36, borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icon name={CATEGORY_ICONS[cat] || "circle"} size={18} color="var(--text-secondary)" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>
                          {ASSET_CATEGORIES.find(c => c.value === cat)?.label || cat}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                          {items.length} holding{items.length !== 1 ? "s" : ""}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", marginRight: 8 }}>
                        <div className="mono" style={{ fontSize: 15, fontWeight: 600 }}>{formatINR(catTotal, { compact: true })}</div>
                      </div>
                      <Icon name={isOpen ? "chevron-down" : "chevron-right"} size={16} color="var(--text-tertiary)" />
                    </div>
                    {isOpen && (
                      <div style={{ borderTop: "1px solid var(--border-subtle)" }}>
                        {items.map((item, i) => (
                          <div key={item.id} style={{
                            display: "flex", alignItems: "center", gap: 12, padding: "12px 20px 12px 68px",
                            borderBottom: i < items.length - 1 ? "1px solid var(--border-subtle)" : "none",
                          }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 500 }}>{item.name}</div>
                              {item.institution && <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{item.institution}</span>}
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div className="mono" style={{ fontSize: 13, fontWeight: 500 }}>{formatINR(Number(item.currentValue))}</div>
                              {(() => {
                                const snap = snapshots[item.id];
                                if (!snap || snap.previousValue == null) return null;
                                const currentVal = Number(item.currentValue);
                                const change = currentVal - snap.previousValue;
                                const changePct = snap.previousValue > 0 ? (change / snap.previousValue) * 100 : 0;
                                if (Math.abs(change) < 1) return null;
                                return (
                                  <div style={{ marginTop: 2 }}>
                                    <ChangeIndicator value={change} percent={Math.round(changePct * 10) / 10} size="sm" compact />
                                  </div>
                                );
                              })()}
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); setEditingAsset(item); setShowAssetForm(true); }}
                              style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--text-tertiary)" }}>
                              <Icon name="settings" size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </FadeIn>
              );
            })}
          </div>
        )}
      </div>

      {/* Liabilities */}
      <div style={{ marginTop: 28 }}>
        <SectionHeader title="Liabilities" />
        {liabs.length === 0 ? (
          <EmptyState icon="credit-card" title="No liabilities" subtitle="Add loans or credit cards to track" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {liabs.map((li, i) => (
              <FadeIn key={li.id} delay={400 + i * 50}>
                <Card style={{ padding: "16px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "var(--radius-sm)",
                      background: "var(--negative-dim)", display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Icon name={CATEGORY_ICONS[li.category] || "credit-card"} size={18} color="var(--negative)" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{li.name}</div>
                      <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                        {li.emiAmount ? `EMI ${formatINR(Number(li.emiAmount))}/mo` : ""}
                        {li.institution ? ` · ${li.institution}` : ""}
                      </div>
                    </div>
                    <span className="mono" style={{ fontSize: 15, fontWeight: 600, color: "var(--negative)" }}>
                      {formatINR(Number(li.outstandingAmount))}
                    </span>
                    <button onClick={() => { setEditingLiab(li); setShowLiabForm(true); }}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--text-tertiary)" }}>
                      <Icon name="settings" size={14} />
                    </button>
                  </div>
                </Card>
              </FadeIn>
            ))}
          </div>
        )}
      </div>

      <div style={{ height: 32 }} />

      {/* Asset Form Modal */}
      {showAssetForm && (
        <FormModal
          title={editingAsset ? "Edit Asset" : "Add Asset"}
          onClose={() => { setShowAssetForm(false); setEditingAsset(null); }}
          onSubmit={async (data) => {
            if (editingAsset) {
              await fetch(`/api/assets/${editingAsset.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
            } else {
              await fetch("/api/assets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
            }
            setShowAssetForm(false); setEditingAsset(null); fetchData();
          }}
          onDelete={editingAsset ? () => {
            setShowAssetForm(false);
            setDeleteConfirm({ type: "asset", id: editingAsset.id, name: editingAsset.name });
          } : undefined}
          fields={[
            { name: "name", label: "Name", type: "text", required: true, defaultValue: editingAsset?.name || "" },
            { name: "category", label: "Category", type: "select", options: ASSET_CATEGORIES, required: true, defaultValue: editingAsset?.category || "bank" },
            { name: "currentValue", label: "Current Value (₹)", type: "number", required: true, defaultValue: editingAsset ? Number(editingAsset.currentValue) : "" },
            { name: "isLiquid", label: "Liquid (accessible in 48hrs)?", type: "toggle", defaultValue: editingAsset?.isLiquid || false },
            { name: "institution", label: "Institution", type: "text", defaultValue: editingAsset?.institution || "" },
            { name: "notes", label: "Notes", type: "text", defaultValue: editingAsset?.notes || "" },
          ]}
        />
      )}

      {/* Liability Form Modal */}
      {showLiabForm && (
        <FormModal
          title={editingLiab ? "Edit Liability" : "Add Liability"}
          onClose={() => { setShowLiabForm(false); setEditingLiab(null); }}
          onSubmit={async (data) => {
            if (editingLiab) {
              await fetch(`/api/liabilities/${editingLiab.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
            } else {
              await fetch("/api/liabilities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
            }
            setShowLiabForm(false); setEditingLiab(null); fetchData();
          }}
          onDelete={editingLiab ? () => {
            setShowLiabForm(false);
            setDeleteConfirm({ type: "liability", id: editingLiab.id, name: editingLiab.name });
          } : undefined}
          fields={[
            { name: "name", label: "Name", type: "text", required: true, defaultValue: editingLiab?.name || "" },
            { name: "category", label: "Category", type: "select", options: LIABILITY_CATEGORIES, required: true, defaultValue: editingLiab?.category || "loan" },
            { name: "outstandingAmount", label: "Outstanding Amount (₹)", type: "number", required: true, defaultValue: editingLiab ? Number(editingLiab.outstandingAmount) : "" },
            { name: "principalAmount", label: "Principal Amount (₹)", type: "number", defaultValue: editingLiab ? Number(editingLiab.principalAmount) : "" },
            { name: "emiAmount", label: "EMI Amount (₹)", type: "number", defaultValue: editingLiab?.emiAmount ? Number(editingLiab.emiAmount) : "" },
            { name: "interestRate", label: "Interest Rate (%)", type: "number", defaultValue: editingLiab?.interestRate ? Number(editingLiab.interestRate) : "" },
            { name: "institution", label: "Institution", type: "text", defaultValue: editingLiab?.institution || "" },
          ]}
        />
      )}
      {/* Delete Confirmation */}
      {deleteConfirm && (
        <ConfirmDialog
          title={`Delete ${deleteConfirm.name}?`}
          message="This action cannot be undone. All associated data will be permanently removed."
          onConfirm={async () => {
            const url = deleteConfirm.type === "asset"
              ? `/api/assets/${deleteConfirm.id}`
              : `/api/liabilities/${deleteConfirm.id}`;
            try {
              const res = await fetch(url, { method: "DELETE" });
              if (res.ok) {
                showToast(`${deleteConfirm.name} deleted`, "success");
              } else {
                showToast("Failed to delete", "error");
              }
            } catch {
              showToast("Failed to delete", "error");
            }
            setDeleteConfirm(null);
            setEditingAsset(null);
            setEditingLiab(null);
            fetchData();
          }}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}

// ── Generic Form Modal ──

interface FormField {
  name: string; label: string; type: "text" | "number" | "select" | "toggle";
  options?: { value: string; label: string }[];
  required?: boolean; defaultValue?: string | number | boolean;
}

function FormModal({ title, onClose, onSubmit, onDelete, fields }: {
  title: string; onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onDelete?: () => void;
  fields: FormField[];
}) {
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const init: Record<string, unknown> = {};
    fields.forEach(f => { init[f.name] = f.defaultValue ?? ""; });
    return init;
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit(values);
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
        width: "100%", maxWidth: 440, padding: 28, animation: "slideUp 0.25s ease",
        maxHeight: "80vh", overflowY: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", padding: 4 }}>
            <Icon name="x" size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {fields.map(f => (
            <div key={f.name}>
              {f.type === "toggle" ? (
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <input type="checkbox" checked={!!values[f.name]}
                    onChange={e => setValues(v => ({ ...v, [f.name]: e.target.checked }))}
                    style={{ width: 18, height: 18, accentColor: "var(--accent)" }} />
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{f.label}</span>
                </label>
              ) : (
                <>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>
                    {f.label}
                  </label>
                  {f.type === "select" ? (
                    <select value={String(values[f.name] || "")}
                      onChange={e => setValues(v => ({ ...v, [f.name]: e.target.value }))}
                      required={f.required}
                      style={{
                        width: "100%", height: 40, padding: "0 12px", borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border)", background: "var(--bg-elevated)",
                        color: "var(--text-primary)", fontSize: 14, fontFamily: "var(--font-sans)",
                      }}>
                      {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : f.type === "number" && f.label.includes("₹") ? (
                    <CurrencyInput
                      value={Number(values[f.name]) || 0}
                      onChange={v => setValues(prev => ({ ...prev, [f.name]: v }))}
                      required={f.required}
                    />
                  ) : (
                    <input type={f.type} value={String(values[f.name] ?? "")}
                      onChange={e => setValues(v => ({ ...v, [f.name]: f.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value }))}
                      required={f.required}
                      step={f.type === "number" ? "any" : undefined}
                      style={{
                        width: "100%", height: 40, padding: "0 12px", borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border)", background: "var(--bg-elevated)",
                        color: "var(--text-primary)", fontSize: 14, outline: "none", fontFamily: "var(--font-sans)",
                      }} />
                  )}
                </>
              )}
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button type="submit" disabled={submitting} style={{
              flex: 1, height: 42, borderRadius: "var(--radius-sm)", border: "none",
              background: "var(--accent)", color: "var(--bg-root)", fontSize: 14, fontWeight: 600,
              cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1,
              fontFamily: "var(--font-sans)",
            }}>
              {submitting ? "Saving..." : "Save"}
            </button>
            {onDelete && (
              <button type="button" onClick={onDelete} style={{
                height: 42, padding: "0 16px", borderRadius: "var(--radius-sm)",
                border: "1px solid var(--negative)", background: "transparent",
                color: "var(--negative)", fontSize: 14, fontWeight: 500, cursor: "pointer",
                fontFamily: "var(--font-sans)",
              }}>
                Delete
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
