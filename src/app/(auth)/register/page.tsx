"use client";

import { useState } from "react";
import { signUp } from "@/lib/auth-client";
import Link from "next/link";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await signUp.email({
      name,
      email,
      password,
    });

    if (error) {
      setError(error.message || "Registration failed");
      setLoading(false);
    } else {
      window.location.href = "/dashboard";
    }
  };

  return (
    <div style={{ width: "100%", maxWidth: 400 }}>
      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "var(--radius-sm)",
            background:
              "linear-gradient(135deg, rgba(201,168,76,0.19), rgba(201,168,76,0.06))",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid rgba(201,168,76,0.13)",
            marginBottom: 16,
          }}
        >
          <span
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: "var(--accent)",
            }}
          >
            F
          </span>
        </div>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: 6,
          }}
        >
          Create your account
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-tertiary)" }}>
          Start tracking your financial position
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {error && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "var(--radius-sm)",
                background: "var(--negative-dim)",
                color: "var(--negative)",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="name"
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 500,
                color: "var(--text-secondary)",
                marginBottom: 6,
              }}
            >
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
              autoComplete="name"
              style={{
                width: "100%",
                height: 40,
                padding: "0 12px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                background: "var(--bg-elevated)",
                color: "var(--text-primary)",
                fontSize: 14,
                outline: "none",
                fontFamily: "var(--font-sans)",
              }}
            />
          </div>

          <div>
            <label
              htmlFor="email"
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 500,
                color: "var(--text-secondary)",
                marginBottom: 6,
              }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              style={{
                width: "100%",
                height: 40,
                padding: "0 12px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                background: "var(--bg-elevated)",
                color: "var(--text-primary)",
                fontSize: 14,
                outline: "none",
                fontFamily: "var(--font-sans)",
              }}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 500,
                color: "var(--text-secondary)",
                marginBottom: 6,
              }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              minLength={8}
              autoComplete="new-password"
              style={{
                width: "100%",
                height: 40,
                padding: "0 12px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                background: "var(--bg-elevated)",
                color: "var(--text-primary)",
                fontSize: 14,
                outline: "none",
                fontFamily: "var(--font-sans)",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              height: 42,
              borderRadius: "var(--radius-sm)",
              border: "none",
              background: "var(--accent)",
              color: "var(--bg-root)",
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              fontFamily: "var(--font-sans)",
              transition: "opacity 0.15s",
            }}
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </div>
      </form>

      <p
        style={{
          textAlign: "center",
          marginTop: 20,
          fontSize: 13,
          color: "var(--text-tertiary)",
        }}
      >
        Already have an account?{" "}
        <Link
          href="/login"
          style={{
            color: "var(--accent)",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}