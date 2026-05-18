/**
 * Financial calculation functions.
 * All monetary values are in the smallest meaningful unit (rupees, not paise).
 */

interface AssetForCalc {
  currentValue: number;
  isLiquid: boolean;
}

interface LiabilityForCalc {
  outstandingAmount: number;
}

interface TransactionForCalc {
  type: "income" | "expense" | "transfer";
  amount: number;
}

interface GoalForCalc {
  targetAmount: number;
  currentAmount: number;
}

interface HealthScoreInput {
  emergencyMonthsCovered: number;
  emergencyTargetMonths: number;
  savingsRate: number;
  totalLiabilities: number;
  totalAssets: number;
  totalLiquid: number;
  monthlyBurn: number;
  goals: GoalForCalc[];
}

/**
 * Net worth = total assets - total liabilities
 */
export function calculateNetWorth(
  assets: AssetForCalc[],
  liabilities: LiabilityForCalc[]
): number {
  const totalAssets = assets.reduce((sum, a) => sum + a.currentValue, 0);
  const totalLiabilities = liabilities.reduce(
    (sum, l) => sum + l.outstandingAmount,
    0
  );
  return totalAssets - totalLiabilities;
}

/**
 * Total liquid assets (accessible within 48 hours)
 */
export function calculateLiquidity(assets: AssetForCalc[]): number {
  return assets
    .filter((a) => a.isLiquid)
    .reduce((sum, a) => sum + a.currentValue, 0);
}

/**
 * Average monthly expenses over the given transactions.
 * Pass transactions for N months, and it divides by N.
 */
export function calculateMonthlyBurn(
  transactions: TransactionForCalc[],
  months: number = 3
): number {
  const totalExpenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  return months > 0 ? totalExpenses / months : 0;
}

/**
 * Runway in months = liquid assets / monthly burn
 */
export function calculateRunway(
  liquidAssets: number,
  monthlyBurn: number
): number {
  if (monthlyBurn <= 0) return Infinity;
  return liquidAssets / monthlyBurn;
}

/**
 * Savings rate = (income - expenses) / income × 100
 */
export function calculateSavingsRate(
  income: number,
  expenses: number
): number {
  if (income <= 0) return 0;
  return ((income - expenses) / income) * 100;
}

/**
 * Goal progress as a percentage (0–1)
 */
export function calculateGoalProgress(goal: GoalForCalc): number {
  if (goal.targetAmount <= 0) return 1;
  return Math.min(goal.currentAmount / goal.targetAmount, 1);
}

/**
 * Financial Health Score (0–100)
 *
 * Weighted formula:
 * - Emergency fund coverage: 30%
 * - Savings rate: 25%
 * - Debt-to-asset ratio: 20%
 * - Liquidity ratio: 15%
 * - Goal progress: 10%
 */
export function calculateHealthScore(input: HealthScoreInput): number {
  // Emergency fund score (0–100): how close to target months
  const emergencyScore = Math.min(
    (input.emergencyMonthsCovered / Math.max(input.emergencyTargetMonths, 1)) *
      100,
    100
  );

  // Savings rate score (0–100): 50%+ savings rate = perfect score
  const savingsScore = Math.min(Math.max(input.savingsRate, 0) * 2, 100);

  // Debt ratio score (0–100): lower debt-to-asset ratio is better
  const debtRatio =
    input.totalAssets > 0 ? input.totalLiabilities / input.totalAssets : 0;
  const debtScore = Math.max(0, (1 - debtRatio) * 100);

  // Liquidity score (0–100): 6+ months of burn in liquid assets = perfect
  const liquidityMonths =
    input.monthlyBurn > 0 ? input.totalLiquid / input.monthlyBurn : 6;
  const liquidityScore = Math.min((liquidityMonths / 6) * 100, 100);

  // Goal progress score (0–100): average progress across all goals
  const goalScore =
    input.goals.length > 0
      ? (input.goals.reduce(
          (sum, g) => sum + calculateGoalProgress(g),
          0
        ) /
          input.goals.length) *
        100
      : 50; // default if no goals

  const score =
    emergencyScore * 0.3 +
    savingsScore * 0.25 +
    debtScore * 0.2 +
    liquidityScore * 0.15 +
    goalScore * 0.1;

  return Math.round(Math.min(Math.max(score, 0), 100));
}