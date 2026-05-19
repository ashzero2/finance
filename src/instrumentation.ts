import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

export async function register() {
  // Skip in edge runtime; run in Node.js (NEXT_RUNTIME may be undefined in standalone)
  if (process.env.NEXT_RUNTIME === "edge") return;

  console.log("[migrate] running database migrations...");
  const client = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(client);
  await migrate(db, { migrationsFolder: "./drizzle/migrations" });
  await client.end();
  console.log("[migrate] migrations complete");
}
