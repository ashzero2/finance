import { z } from "zod";

// ── Shared helpers ──

/** Safely parse JSON body from request. Returns parsed data or null. */
export async function parseBody<T>(
  request: Request,
  schema: z.ZodType<T>
): Promise<{ data: T; error: null } | { data: null; error: string }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { data: null, error: "Invalid JSON body" };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return { data: null, error: issues };
  }

  return { data: result.data, error: null };
}

// ── Asset schemas ──

export const createAssetSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  category: z.enum(["cash", "bank", "investment", "property", "vehicle", "other"]),
  subCategory: z.enum(["stocks", "mf", "fd", "ppf", "nps", "gold", "crypto", "etf"]).nullable().optional(),
  currentValue: z.number().min(0).default(0),
  isLiquid: z.boolean().default(false),
  liquidityDays: z.number().int().min(0).default(0),
  institution: z.string().max(100).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const updateAssetSchema = createAssetSchema.partial();

// ── Liability schemas ──

export const createLiabilitySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  category: z.enum(["loan", "credit_card", "personal_debt", "other"]),
  principalAmount: z.number().min(0).default(0),
  outstandingAmount: z.number().min(0).default(0),
  interestRate: z.number().min(0).max(100).nullable().optional(),
  emiAmount: z.number().min(0).nullable().optional(),
  emiDay: z.number().int().min(1).max(31).nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  institution: z.string().max(100).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const updateLiabilitySchema = createLiabilitySchema.partial();

// ── Transaction schemas ──

export const createTransactionSchema = z.object({
  type: z.enum(["income", "expense", "transfer"]),
  amount: z.number().positive("Amount must be positive"),
  categoryId: z.string().nullable().optional(),
  description: z.string().max(200).nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format").optional(),
  isRecurring: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
});

export const updateTransactionSchema = createTransactionSchema.partial();

// ── Goal schemas ──

export const createGoalSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  targetAmount: z.number().min(0).default(0),
  currentAmount: z.number().min(0).default(0),
  targetDate: z.string().nullable().optional(),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  category: z.enum(["emergency", "retirement", "purchase", "travel", "education", "other"]).default("other"),
  icon: z.string().max(30).default("target"),
  color: z.string().max(10).default("#C9A84C"),
  monthlyContribution: z.number().min(0).nullable().optional(),
  linkedAssetIds: z.array(z.string()).optional().default([]),
});

export const updateGoalSchema = createGoalSchema.partial().extend({
  isCompleted: z.boolean().optional(),
});

// ── Settings schema ──

export const updateSettingsSchema = z.object({
  currency: z.enum(["INR", "USD", "EUR", "GBP"]).optional(),
  financialMonthStartDay: z.number().int().min(1).max(28).optional(),
  weeklyReviewDay: z.enum(["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]).optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
});

// ── Emergency Fund schema ──

export const updateEmergencyFundSchema = z.object({
  targetMonths: z.number().int().min(1).max(24).default(6),
  monthlyEssentialExpenses: z.number().min(0).default(0),
  currentFundAmount: z.number().min(0).default(0),
  linkedAssetIds: z.array(z.string()).optional(),
});

// ── Category schemas ──

export const createCategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
  type: z.enum(["income", "expense"]),
  icon: z.string().max(30).default("circle"),
  color: z.string().max(10).default("#8B8B96"),
  isEssential: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
});

export const updateCategorySchema = createCategorySchema.partial().extend({
  id: z.string().min(1, "Category ID is required"),
});

// ── Insights schema ──

export const insightActionSchema = z.object({
  id: z.string().min(1, "Insight ID is required"),
  action: z.enum(["dismiss", "read"]),
});

// ── Recurring Transaction schemas ──

export const createRecurringTransactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.number().positive("Amount must be positive"),
  categoryId: z.string().min(1).nullable().optional(),
  description: z.string().min(1, "Description is required").max(200),
  frequency: z.enum(["daily", "weekly", "monthly", "quarterly", "yearly"]),
  dayOfMonth: z.number().int().min(1).max(31).nullable().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD").nullable().optional(),
});

export const updateRecurringTransactionSchema = createRecurringTransactionSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// ── Onboarding schema ──

export const onboardingSchema = z.object({
  bankBalances: z.array(z.object({
    name: z.string().min(1).max(100),
    amount: z.number().min(0),
  })).optional().default([]),
  investments: z.array(z.object({
    name: z.string().min(1).max(100),
    amount: z.number().min(0),
  })).optional().default([]),
  loans: z.array(z.object({
    name: z.string().min(1).max(100),
    amount: z.number().min(0),
    emi: z.number().min(0).optional().default(0),
  })).optional().default([]),
  monthlyIncome: z.number().min(0).default(0),
  monthlyExpenses: z.number().min(0).default(0),
  goal: z.object({
    type: z.string(),
    name: z.string().min(1).max(100),
    targetAmount: z.number().min(0),
    targetDate: z.string().optional().default(""),
  }).nullable().optional(),
});