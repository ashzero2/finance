import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

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
        Welcome, {session.user.name || session.user.email}. Dashboard UI coming
        in Phase 5.
      </p>
    </div>
  );
}