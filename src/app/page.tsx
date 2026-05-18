export default function Home() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 12,
          background:
            "linear-gradient(135deg, rgba(201,168,76,0.19), rgba(201,168,76,0.06))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid rgba(201,168,76,0.13)",
        }}
      >
        <span
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: "var(--accent)",
            fontFamily: "var(--font-sans)",
          }}
        >
          F
        </span>
      </div>
      <h1
        style={{
          fontSize: 24,
          fontWeight: 600,
          color: "var(--text-primary)",
        }}
      >
        Finance
      </h1>
      <p
        style={{
          fontSize: 14,
          color: "var(--text-tertiary)",
          maxWidth: 320,
          textAlign: "center",
          lineHeight: 1.6,
        }}
      >
        Personal Finance Command Center — Phase 1 complete. Auth and dashboard
        coming next.
      </p>
    </div>
  );
}