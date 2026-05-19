import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

export async function register() {
  // Skip in edge runtime; run in Node.js (NEXT_RUNTIME may be undefined in standalone)
  if (process.env.NEXT_RUNTIME === "edge") return;

  try {
    console.log("[migrate] running database migrations...");
    const client = postgres(process.env.DATABASE_URL!, { max: 1 });
    const db = drizzle(client);
    await migrate(db, { migrationsFolder: "./drizzle/migrations" });
    await client.end();
    console.log("[migrate] migrations complete");
  } catch (err: unknown) {
    // Ignore "already exists" errors — migrations already applied to DB
    const errStr = String(err);
    const causeStr = err instanceof Error && "cause" in err ? String((err as { cause: unknown }).cause) : "";
    if (errStr.includes("already exists") || causeStr.includes("already exists")) {
      console.log("[migrate] schema already up to date");
    } else {
      console.error("[migrate] migration error:", err);
    }
  }
}
