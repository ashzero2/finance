/**
 * Dashboard page — placeholder for Phase 5.
 * Auth is enforced by the proxy (cookie check).
 * Full session data will be fetched via API routes in Phase 5.
 */
export default function DashboardPage() {
  return (
    <div style={{ padding: 32 }}>
      <h1
        style={{
          fontSize: 22,
          fontWeight: 600,
          color: "var(--text-primary)",
          marginBottom: 8,
        }}
      >
        Dashboard
      </h1>
      <p style={{ fontSize: 14, color: "var(--text-tertiary)" }}>
        Dashboard UI coming in Phase 5. You are logged in.
      </p>
    </div>
  );
}
