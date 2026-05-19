"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { FadeIn } from "@/components/ui/fade-in";
import { formatINR } from "@/lib/utils";
import { CurrencyInput } from "@/components/ui/currency-input";

interface BankEntry { name: string; amount: number }
interface InvestmentEntry { name: string; amount: number }
interface LoanEntry { name: string; amount: number; emi: number }
interface GoalEntry { type: string; name: string; targetAmount: number; targetDate: string }

const GOAL_PRESETS = [
  { type: "emergency", name: "Emergency Fund", icon: "shield", color: "#34D399" },
  { type: "house", name: "House Down Payment", icon: "home", color: "#60A5FA" },
  { type: "car", name: "New Car", icon: "car", color: "#A78BFA" },
  { type: "travel", name: "Travel Fund", icon: "plane", color: "#C9A84C" },
  { type: "retirement", name: "Retirement", icon: "target", color: "#FBBF24" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Data
  const [banks, setBanks] = useState<BankEntry[]>([{ name: "", amount: 0 }]);
  const [investments, setInvestments] = useState<InvestmentEntry[]>([{ name: "", amount: 0 }]);
  const [loans, setLoans] = useState<LoanEntry[]>([{ name: "", amount: 0, emi: 0 }]);
  const [monthlyIncome, setMonthlyIncome] = useState<number>(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState<number>(0);
  const [goal, setGoal] = useState<GoalEntry>({ type: "", name: "", targetAmount: 0, targetDate: "" });

  const steps = [
    { title: "Welcome", subtitle: "Let's get a snapshot of your finances" },
    { title: "Bank Balances", subtitle: "How much do you have in your bank accounts?" },
    { title: "Investments", subtitle: "Any investments? (Skip if none)" },
    { title: "Loans & EMIs", subtitle: "Any outstanding loans? (Skip if none)" },
    { title: "Monthly Flow", subtitle: "Your approximate monthly income and expenses" },
    { title: "Set a Goal", subtitle: "What's one financial goal you're working toward?" },
    { title: "You're all set!", subtitle: "" },
  ];

  const canNext = () => {
    if (step === 1) return banks.some(b => b.name && b.amount > 0);
    if (step === 4) return monthlyIncome > 0;
    return true;
  };

  const handleFinish = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankBalances: banks.filter(b => b.name && b.amount > 0),
          investments: investments.filter(i => i.name && i.amount > 0),
          loans: loans.filter(l => l.name && l.amount > 0),
          monthlyIncome,
          monthlyExpenses,
          goal: goal.type ? goal : null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      // Small delay to ensure DB write is committed
      await new Promise(r => setTimeout(r, 200));
      router.push("/dashboard");
    } catch {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", height: 40, padding: "0 12px", borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)", background: "var(--bg-elevated)",
    color: "var(--text-primary)", fontSize: 14, outline: "none", fontFamily: "var(--font-sans)",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6,
  };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "40px 0" }}>
      {/* Progress */}
      <div style={{ display: "flex", gap: 4, marginBottom: 32 }}>
        {steps.map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i <= step ? "var(--accent)" : "var(--border)",
            transition: "background 0.3s",
          }} />
        ))}
      </div>

      <FadeIn key={step} delay={0}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>{steps[step].title}</h1>
          {steps[step].subtitle && (
            <p style={{ fontSize: 14, color: "var(--text-tertiary)", lineHeight: 1.6 }}>{steps[step].subtitle}</p>
          )}
        </div>

        {/* Step 0: Welcome */}
        {step === 0 && (
          <Card hover={false} style={{ padding: 32, textAlign: "center" }}>
            <div style={{
              width: 72, height: 72, borderRadius: "var(--radius-lg)", margin: "0 auto 20px",
              background: "linear-gradient(135deg, rgba(201,168,76,0.19), rgba(201,168,76,0.06))",
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "1px solid rgba(201,168,76,0.13)",
            }}>
              <span style={{ fontSize: 32, fontWeight: 800, color: "var(--accent)" }}>F</span>
            </div>
            <p style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.7, maxWidth: 320, margin: "0 auto" }}>
              In the next few steps, we'll build a picture of your financial position. Don't worry about being exact — you can always update later.
            </p>
          </Card>
        )}

        {/* Step 1: Bank Balances */}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {banks.map((b, i) => (
              <Card key={i} hover={false} style={{ padding: 16 }}>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Account Name</label>
                    <input style={inputStyle} placeholder="e.g. HDFC Savings" value={b.name}
                      onChange={e => { const n = [...banks]; n[i].name = e.target.value; setBanks(n); }} />
                  </div>
                  <div style={{ width: 140 }}>
                    <label style={labelStyle}>Balance (₹)</label>
                    <CurrencyInput value={b.amount} onChange={v => { const n = [...banks]; n[i].amount = v; setBanks(n); }} placeholder="0" />
                  </div>
                </div>
              </Card>
            ))}
            <button onClick={() => setBanks([...banks, { name: "", amount: 0 }])}
              style={{ background: "none", border: "1px dashed var(--border)", borderRadius: "var(--radius-sm)", padding: "10px", color: "var(--text-tertiary)", cursor: "pointer", fontSize: 13 }}>
              + Add another account
            </button>
          </div>
        )}

        {/* Step 2: Investments */}
        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {investments.map((inv, i) => (
              <Card key={i} hover={false} style={{ padding: 16 }}>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Investment Name</label>
                    <input style={inputStyle} placeholder="e.g. Mutual Funds" value={inv.name}
                      onChange={e => { const n = [...investments]; n[i].name = e.target.value; setInvestments(n); }} />
                  </div>
                  <div style={{ width: 140 }}>
                    <label style={labelStyle}>Value (₹)</label>
                    <CurrencyInput value={inv.amount} onChange={v => { const n = [...investments]; n[i].amount = v; setInvestments(n); }} placeholder="0" />
                  </div>
                </div>
              </Card>
            ))}
            <button onClick={() => setInvestments([...investments, { name: "", amount: 0 }])}
              style={{ background: "none", border: "1px dashed var(--border)", borderRadius: "var(--radius-sm)", padding: "10px", color: "var(--text-tertiary)", cursor: "pointer", fontSize: 13 }}>
              + Add another investment
            </button>
          </div>
        )}

        {/* Step 3: Loans */}
        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {loans.map((l, i) => (
              <Card key={i} hover={false} style={{ padding: 16 }}>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 150px" }}>
                    <label style={labelStyle}>Loan Name</label>
                    <input style={inputStyle} placeholder="e.g. Home Loan" value={l.name}
                      onChange={e => { const n = [...loans]; n[i].name = e.target.value; setLoans(n); }} />
                  </div>
                  <div style={{ width: 120 }}>
                    <label style={labelStyle}>Outstanding (₹)</label>
                    <CurrencyInput value={l.amount} onChange={v => { const n = [...loans]; n[i].amount = v; setLoans(n); }} placeholder="0" />
                  </div>
                  <div style={{ width: 100 }}>
                    <label style={labelStyle}>EMI (₹)</label>
                    <CurrencyInput value={l.emi} onChange={v => { const n = [...loans]; n[i].emi = v; setLoans(n); }} placeholder="0" />
                  </div>
                </div>
              </Card>
            ))}
            <button onClick={() => setLoans([...loans, { name: "", amount: 0, emi: 0 }])}
              style={{ background: "none", border: "1px dashed var(--border)", borderRadius: "var(--radius-sm)", padding: "10px", color: "var(--text-tertiary)", cursor: "pointer", fontSize: 13 }}>
              + Add another loan
            </button>
          </div>
        )}

        {/* Step 4: Monthly Flow */}
        {step === 4 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Card hover={false} style={{ padding: 20 }}>
              <label style={labelStyle}>Monthly Income (₹)</label>
              <CurrencyInput value={monthlyIncome} onChange={setMonthlyIncome} placeholder="0"
                style={{ height: 48, fontSize: 20, fontWeight: 600 }} />
            </Card>
            <Card hover={false} style={{ padding: 20 }}>
              <label style={labelStyle}>Monthly Expenses (₹)</label>
              <CurrencyInput value={monthlyExpenses} onChange={setMonthlyExpenses} placeholder="0"
                style={{ height: 48, fontSize: 20, fontWeight: 600 }} />
            </Card>
            {monthlyIncome > 0 && monthlyExpenses > 0 && (
              <div style={{ textAlign: "center", padding: 12, color: "var(--text-tertiary)", fontSize: 14 }}>
                Savings: <span className="mono" style={{ color: "var(--positive)", fontWeight: 600 }}>
                  {formatINR(monthlyIncome - monthlyExpenses, { compact: true })}
                </span> /month ({((monthlyIncome - monthlyExpenses) / monthlyIncome * 100).toFixed(0)}% rate)
              </div>
            )}
          </div>
        )}

        {/* Step 5: Goal */}
        {step === 5 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8 }}>
              {GOAL_PRESETS.map(preset => (
                <Card key={preset.type}
                  onClick={() => setGoal({ ...goal, type: preset.type, name: preset.name })}
                  style={{
                    padding: 16, textAlign: "center", cursor: "pointer",
                    border: goal.type === preset.type ? `2px solid ${preset.color}` : undefined,
                  }}>
                  <Icon name={preset.icon} size={24} color={preset.color} style={{ marginBottom: 8 }} />
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{preset.name}</div>
                </Card>
              ))}
            </div>
            {goal.type && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
                <div>
                  <label style={labelStyle}>Target Amount (₹)</label>
                  <CurrencyInput value={goal.targetAmount} onChange={v => setGoal({ ...goal, targetAmount: v })} placeholder="0" />
                </div>
                <div>
                  <label style={labelStyle}>Target Date (optional)</label>
                  <input style={inputStyle} type="date" value={goal.targetDate}
                    onChange={e => setGoal({ ...goal, targetDate: e.target.value })} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 6: Complete */}
        {step === 6 && (
          <Card hover={false} style={{ padding: 32, textAlign: "center" }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%", margin: "0 auto 20px",
              background: "var(--positive-dim)", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon name="check" size={32} color="var(--positive)" />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Here&apos;s your financial position</h2>
            <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 16, marginBottom: 8, flexWrap: "wrap" }}>
              {banks.filter(b => b.amount > 0).length > 0 && (
                <div>
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Bank</div>
                  <div className="mono" style={{ fontSize: 16, fontWeight: 600, color: "var(--positive)" }}>
                    {formatINR(banks.reduce((s, b) => s + b.amount, 0), { compact: true })}
                  </div>
                </div>
              )}
              {investments.filter(i => i.amount > 0).length > 0 && (
                <div>
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Investments</div>
                  <div className="mono" style={{ fontSize: 16, fontWeight: 600, color: "var(--info)" }}>
                    {formatINR(investments.reduce((s, i) => s + i.amount, 0), { compact: true })}
                  </div>
                </div>
              )}
              {loans.filter(l => l.amount > 0).length > 0 && (
                <div>
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Loans</div>
                  <div className="mono" style={{ fontSize: 16, fontWeight: 600, color: "var(--negative)" }}>
                    {formatINR(loans.reduce((s, l) => s + l.amount, 0), { compact: true })}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}
      </FadeIn>

      {/* Navigation */}
      <div style={{ display: "flex", gap: 8, marginTop: 28 }}>
        {step > 0 && step < 6 && (
          <button onClick={() => setStep(step - 1)} style={{
            height: 42, padding: "0 20px", borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)", background: "transparent",
            color: "var(--text-secondary)", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-sans)",
          }}>Back</button>
        )}
        {(step === 2 || step === 3 || step === 5) && (
          <button onClick={() => setStep(step + 1)} style={{
            height: 42, padding: "0 20px", borderRadius: "var(--radius-sm)",
            border: "none", background: "var(--bg-elevated)",
            color: "var(--text-tertiary)", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-sans)",
          }}>Skip</button>
        )}
        <div style={{ flex: 1 }} />
        {step < 6 && (
          <button onClick={() => setStep(step + 1)} disabled={!canNext()} style={{
            height: 42, padding: "0 28px", borderRadius: "var(--radius-sm)",
            border: "none", background: "var(--accent)", color: "var(--bg-root)",
            fontSize: 14, fontWeight: 600, cursor: canNext() ? "pointer" : "not-allowed",
            opacity: canNext() ? 1 : 0.5, fontFamily: "var(--font-sans)",
          }}>Continue</button>
        )}
        {step === 6 && (
          <button onClick={handleFinish} disabled={submitting} style={{
            height: 42, padding: "0 32px", borderRadius: "var(--radius-sm)",
            border: "none", background: "var(--accent)", color: "var(--bg-root)",
            fontSize: 14, fontWeight: 600, cursor: submitting ? "not-allowed" : "pointer",
            opacity: submitting ? 0.7 : 1, fontFamily: "var(--font-sans)",
          }}>{submitting ? "Setting up..." : "Go to Dashboard"}</button>
        )}
      </div>
    </div>
  );
}
