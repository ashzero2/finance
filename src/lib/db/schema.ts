import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  decimal,
  date,
  jsonb,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";

// ── Enums ──

export const assetCategoryEnum = pgEnum("asset_category", [
  "cash",
  "bank",
  "investment",
  "property",
  "vehicle",
  "other",
]);

export const assetSubCategoryEnum = pgEnum("asset_sub_category", [
  "stocks",
  "mf",
  "fd",
  "ppf",
  "nps",
  "gold",
  "crypto",
  "etf",
]);

export const liabilityCategoryEnum = pgEnum("liability_category", [
  "loan",
  "credit_card",
  "personal_debt",
  "other",
]);

export const transactionTypeEnum = pgEnum("transaction_type", [
  "income",
  "expense",
  "transfer",
]);

export const categoryTypeEnum = pgEnum("category_type", [
  "income",
  "expense",
]);

export const frequencyEnum = pgEnum("frequency", [
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
]);

export const goalPriorityEnum = pgEnum("goal_priority", [
  "high",
  "medium",
  "low",
]);

export const goalCategoryEnum = pgEnum("goal_category", [
  "emergency",
  "retirement",
  "purchase",
  "travel",
  "education",
  "other",
]);

export const insightTypeEnum = pgEnum("insight_type", [
  "anomaly",
  "milestone",
  "suggestion",
  "warning",
  "celebration",
]);

export const insightPriorityEnum = pgEnum("insight_priority", [
  "high",
  "medium",
  "low",
]);

export const periodTypeEnum = pgEnum("period_type", ["weekly", "monthly"]);

export const snapshotSourceEnum = pgEnum("snapshot_source", [
  "manual",
  "api",
  "estimated",
]);

export const themeEnum = pgEnum("theme", ["light", "dark", "system"]);

export const weekDayEnum = pgEnum("week_day", [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
]);

// ── Better Auth Tables ──
// These are required by Better Auth for authentication

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ── Application Tables ──

export const assets = pgTable(
  "assets",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: assetCategoryEnum("category").notNull(),
    subCategory: assetSubCategoryEnum("sub_category"),
    currentValue: decimal("current_value", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    isLiquid: boolean("is_liquid").notNull().default(false),
    liquidityDays: integer("liquidity_days").notNull().default(0),
    institution: text("institution"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_assets_user_category").on(table.userId, table.category),
  ]
);

export const assetSnapshots = pgTable("asset_snapshots", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  assetId: text("asset_id")
    .notNull()
    .references(() => assets.id, { onDelete: "cascade" }),
  value: decimal("value", { precision: 15, scale: 2 }).notNull(),
  recordedAt: date("recorded_at").notNull(),
  source: snapshotSourceEnum("source").notNull().default("manual"),
});

export const liabilities = pgTable("liabilities", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: liabilityCategoryEnum("category").notNull(),
  principalAmount: decimal("principal_amount", { precision: 15, scale: 2 })
    .notNull()
    .default("0"),
  outstandingAmount: decimal("outstanding_amount", { precision: 15, scale: 2 })
    .notNull()
    .default("0"),
  interestRate: decimal("interest_rate", { precision: 5, scale: 2 }),
  emiAmount: decimal("emi_amount", { precision: 15, scale: 2 }),
  emiDay: integer("emi_day"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  institution: text("institution"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const categories = pgTable("categories", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: categoryTypeEnum("type").notNull(),
  icon: text("icon").notNull().default("circle"),
  color: text("color").notNull().default("#8B8B96"),
  isEssential: boolean("is_essential").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const transactions = pgTable(
  "transactions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: transactionTypeEnum("type").notNull(),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    categoryId: text("category_id").references(() => categories.id),
    description: text("description"),
    date: date("date").notNull(),
    isRecurring: boolean("is_recurring").notNull().default(false),
    recurringId: text("recurring_id"),
    tags: jsonb("tags").$type<string[]>().default([]),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_transactions_user_date").on(table.userId, table.date),
  ]
);

export const recurringTransactions = pgTable("recurring_transactions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  type: transactionTypeEnum("type").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  categoryId: text("category_id").references(() => categories.id),
  description: text("description"),
  frequency: frequencyEnum("frequency").notNull(),
  dayOfMonth: integer("day_of_month"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  isActive: boolean("is_active").notNull().default(true),
  lastGeneratedAt: date("last_generated_at"),
});

export const goals = pgTable("goals", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  targetAmount: decimal("target_amount", { precision: 15, scale: 2 })
    .notNull()
    .default("0"),
  currentAmount: decimal("current_amount", { precision: 15, scale: 2 })
    .notNull()
    .default("0"),
  targetDate: date("target_date"),
  priority: goalPriorityEnum("priority").notNull().default("medium"),
  category: goalCategoryEnum("category").notNull().default("other"),
  icon: text("icon").notNull().default("target"),
  color: text("color").notNull().default("#C9A84C"),
  isCompleted: boolean("is_completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  monthlyContribution: decimal("monthly_contribution", {
    precision: 15,
    scale: 2,
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const emergencyFund = pgTable("emergency_fund", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" })
    .unique(),
  targetMonths: integer("target_months").notNull().default(6),
  monthlyEssentialExpenses: decimal("monthly_essential_expenses", {
    precision: 15,
    scale: 2,
  })
    .notNull()
    .default("0"),
  currentFundAmount: decimal("current_fund_amount", {
    precision: 15,
    scale: 2,
  })
    .notNull()
    .default("0"),
  linkedAssetIds: jsonb("linked_asset_ids").$type<string[]>().default([]),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const financialSnapshots = pgTable(
  "financial_snapshots",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    snapshotDate: date("snapshot_date").notNull(),
    periodType: periodTypeEnum("period_type").notNull(),
    netWorth: decimal("net_worth", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    totalAssets: decimal("total_assets", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    totalLiabilities: decimal("total_liabilities", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    totalLiquid: decimal("total_liquid", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    monthlyIncome: decimal("monthly_income", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    monthlyExpenses: decimal("monthly_expenses", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    savingsRate: decimal("savings_rate", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),
    runwayMonths: decimal("runway_months", { precision: 5, scale: 1 })
      .notNull()
      .default("0"),
    healthScore: integer("health_score").notNull().default(0),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  },
  (table) => [
    index("idx_snapshots_user_date").on(table.userId, table.snapshotDate),
  ]
);

export const insights = pgTable(
  "insights",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: insightTypeEnum("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    priority: insightPriorityEnum("priority").notNull().default("medium"),
    isRead: boolean("is_read").notNull().default(false),
    isDismissed: boolean("is_dismissed").notNull().default(false),
    generatedAt: timestamp("generated_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  },
  (table) => [
    index("idx_insights_user_unread").on(
      table.userId,
      table.isRead,
      table.generatedAt
    ),
  ]
);

export const userSettings = pgTable("user_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  currency: text("currency").notNull().default("INR"),
  financialMonthStartDay: integer("financial_month_start_day")
    .notNull()
    .default(1),
  weeklyReviewDay: weekDayEnum("weekly_review_day").notNull().default("sunday"),
  theme: themeEnum("theme").notNull().default("dark"),
  onboardingCompleted: boolean("onboarding_completed")
    .notNull()
    .default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
