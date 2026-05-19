import { db } from "./index";
import { categories, user, account } from "./schema";
import { auth } from "../auth";

/**
 * Seed default transaction categories.
 * These are system-level (userId = null) and available to all users.
 */
const defaultCategories = [
  // Expense categories
  { name: "Rent", type: "expense" as const, icon: "home", color: "#F87171", isEssential: true, sortOrder: 1 },
  { name: "Food & Dining", type: "expense" as const, icon: "circle", color: "#FB923C", isEssential: true, sortOrder: 2 },
  { name: "Groceries", type: "expense" as const, icon: "circle", color: "#FBBF24", isEssential: true, sortOrder: 3 },
  { name: "Transport", type: "expense" as const, icon: "car", color: "#34D399", isEssential: true, sortOrder: 4 },
  { name: "Utilities", type: "expense" as const, icon: "lightbulb", color: "#60A5FA", isEssential: true, sortOrder: 5 },
  { name: "Healthcare", type: "expense" as const, icon: "shield", color: "#A78BFA", isEssential: true, sortOrder: 6 },
  { name: "Shopping", type: "expense" as const, icon: "credit-card", color: "#F472B6", isEssential: false, sortOrder: 7 },
  { name: "Subscriptions", type: "expense" as const, icon: "calendar", color: "#818CF8", isEssential: false, sortOrder: 8 },
  { name: "Entertainment", type: "expense" as const, icon: "circle", color: "#C084FC", isEssential: false, sortOrder: 9 },
  { name: "Education", type: "expense" as const, icon: "laptop", color: "#22D3EE", isEssential: false, sortOrder: 10 },
  { name: "Insurance", type: "expense" as const, icon: "shield", color: "#2DD4BF", isEssential: true, sortOrder: 11 },
  { name: "EMI", type: "expense" as const, icon: "calendar", color: "#F87171", isEssential: true, sortOrder: 12 },
  { name: "Investment", type: "expense" as const, icon: "trending-up", color: "#34D399", isEssential: false, sortOrder: 13 },
  { name: "Other Expense", type: "expense" as const, icon: "circle", color: "#8B8B96", isEssential: false, sortOrder: 14 },

  // Income categories
  { name: "Salary", type: "income" as const, icon: "wallet", color: "#34D399", isEssential: false, sortOrder: 1 },
  { name: "Freelance", type: "income" as const, icon: "laptop", color: "#60A5FA", isEssential: false, sortOrder: 2 },
  { name: "Business", type: "income" as const, icon: "bar-chart", color: "#C9A84C", isEssential: false, sortOrder: 3 },
  { name: "Interest", type: "income" as const, icon: "trending-up", color: "#A78BFA", isEssential: false, sortOrder: 4 },
  { name: "Dividends", type: "income" as const, icon: "layers", color: "#FBBF24", isEssential: false, sortOrder: 5 },
  { name: "Rental Income", type: "income" as const, icon: "home", color: "#FB923C", isEssential: false, sortOrder: 6 },
  { name: "Other Income", type: "income" as const, icon: "circle", color: "#8B8B96", isEssential: false, sortOrder: 7 },
];

async function seed() {
  console.log("🌱 Seeding default categories...");

  for (const cat of defaultCategories) {
    await db    docker compose up -d --build
      .insert(categories)
      .values({
        userId: null, // system default
        ...cat,
      })
      .onConflictDoNothing();
  }

  console.log(`✅ Seeded ${defaultCategories.length} default categories`);

  // ── Default test user ──
  console.log("👤 Creating default test user...");
  try {
    const ctx = await auth.api.signUpEmail({
      body: {
        name: "Rahul",
        email: "rahul@test.com",
        password: "password123",
      },
    });
    console.log("✅ Test user created: rahul@test.com / password123");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("already exists") || message.includes("unique")) {
      console.log("ℹ️  Test user already exists, skipping");
    } else {
      console.log("⚠️  Could not create test user:", message);
    }
  }

  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});