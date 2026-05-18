// ── Enums ──

export type AssetCategory =
  | "cash"
  | "bank"
  | "investment"
  | "property"
  | "vehicle"
  | "other";

export type AssetSubCategory =
  | "stocks"
  | "mf"
  | "fd"
  | "ppf"
  | "nps"
  | "gold"
  | "crypto"
  | "etf"
  | null;

export type LiabilityCategory =
  | "loan"
  | "credit_card"
  | "personal_debt"
  | "other";

export type TransactionType = "income" | "expense" | "transfer";

export type CategoryType = "income" | "expense";

export type Frequency =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly";

export type GoalPriority = "high" | "medium" | "low";

export type GoalCategory =
  | "emergency"
  | "retirement"
  | "purchase"
  | "travel"
  | "education"
  | "other";

export type InsightType =
  | "anomaly"
  | "milestone"
  | "suggestion"
  | "warning"
  | "celebration";

export type InsightPriority = "high" | "medium" | "low";

export type PeriodType = "weekly" | "monthly";

export type Theme = "light" | "dark" | "system";

export type WeekDay =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

export type SnapshotSource = "manual" | "api" | "estimated";

// ── Core Entities ──

export interface Asset {
  id: string;
  userId: string;
  name: string;
  category: AssetCategory;
  subCategory: AssetSubCategory;
  currentValue: number;
  isLiquid: boolean;
  liquidityDays: number;
  institution: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Liability {
  id: string;
  userId: string;
  name: string;
  category: LiabilityCategory;
  principalAmount: number;
  outstandingAmount: number;
  interestRate: number | null;
  emiAmount: number | null;
  emiDay: number | null;
  startDate: Date | null;
  endDate: Date | null;
  institution: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  description: string | null;
  date: Date;
  isRecurring: boolean;
  recurringId: string | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionCategory {
  id: string;
  userId: string | null;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  isEssential: boolean;
  sortOrder: number;
}

export interface Goal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date | null;
  priority: GoalPriority;
  category: GoalCategory;
  icon: string;
  color: string;
  isCompleted: boolean;
  completedAt: Date | null;
  monthlyContribution: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmergencyFund {
  id: string;
  userId: string;
  targetMonths: number;
  monthlyEssentialExpenses: number;
  currentFundAmount: number;
  linkedAssetIds: string[];
  updatedAt: Date;
}

export interface FinancialSnapshot {
  id: string;
  userId: string;
  snapshotDate: Date;
  periodType: PeriodType;
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  totalLiquid: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  runwayMonths: number;
  healthScore: number;
  metadata: Record<string, unknown>;
}

export interface Insight {
  id: string;
  userId: string;
  type: InsightType;
  title: string;
  body: string;
  priority: InsightPriority;
  isRead: boolean;
  isDismissed: boolean;
  generatedAt: Date;
  expiresAt: Date | null;
  metadata: Record<string, unknown>;
}

export interface UserSettings {
  userId: string;
  currency: string;
  financialMonthStartDay: number;
  weeklyReviewDay: WeekDay;
  theme: Theme;
  onboardingCompleted: boolean;
  updatedAt: Date;
}

// ── API Response Types ──

export interface DashboardData {
  netWorth: {
    current: number;
    previousMonth: number;
    change: number;
    changePercent: number;
    history: { month: string; value: number }[];
  };
  liquidity: {
    total: number;
    items: { name: string; amount: number; type: string }[];
  };
  monthly: {
    income: number;
    expenses: number;
    savings: number;
    savingsRate: number;
    breakdown: { category: string; amount: number; pct: number }[];
  };
  emergencyFund: {
    current: number;
    target: number;
    monthsCovered: number;
    targetMonths: number;
  };
  goals: Goal[];
  insights: Insight[];
  recentTransactions: Transaction[];
  upcoming: { date: string; name: string; amount: number; type: string }[];
}

export interface FinancialPosition {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  totalLiquid: number;
  monthlyBurn: number;
  runwayMonths: number;
  savingsRate: number;
  healthScore: number;
}