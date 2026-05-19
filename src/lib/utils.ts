import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as Indian Rupees.
 * - compact: true → ₹4.2L, ₹1.8Cr, ₹95K
 * - default → ₹4,20,000 (Indian numbering)
 */
export function formatINR(
  amount: number,
  opts: { compact?: boolean } = {}
): string {
  const abs = Math.abs(amount);
  if (opts.compact) {
    if (abs >= 1_00_00_000)
      return (amount < 0 ? "-" : "") + "₹" + (abs / 1_00_00_000).toFixed(1) + "Cr";
    if (abs >= 1_00_000)
      return (amount < 0 ? "-" : "") + "₹" + (abs / 1_00_000).toFixed(1) + "L";
    if (abs >= 1000)
      return (amount < 0 ? "-" : "") + "₹" + (abs / 1000).toFixed(0) + "K";
  }
  return (amount < 0 ? "-₹" : "₹") + abs.toLocaleString("en-IN");
}

/**
 * Format a percentage with +/- sign.
 * e.g. 3.95 → "+3.9%", -1.2 → "-1.2%"
 */
export function formatPercent(value: number): string {
  return (value >= 0 ? "+" : "") + value.toFixed(1) + "%";
}

/**
 * Format a date string to a short human-readable form.
 * Returns "Today", "Yesterday", "Tomorrow", or "18 May".
 */
export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round(
    (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  if (diff === 1) return "Tomorrow";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/**
 * Returns a greeting based on the current time of day.
 */
export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * Format a number with Indian grouping (commas) for display in inputs.
 * e.g. 100000 → "1,00,000", 1234567 → "12,34,567"
 */
export function formatIndianNumber(value: string | number): string {
  const num = typeof value === "string" ? value.replace(/,/g, "") : String(value);
  if (!num || num === "-" || num === ".") return num;

  const parts = num.split(".");
  const intPart = parts[0];
  const decPart = parts.length > 1 ? "." + parts[1] : "";

  const isNeg = intPart.startsWith("-");
  const digits = isNeg ? intPart.slice(1) : intPart;

  if (digits.length <= 3) return intPart + decPart;

  // Indian grouping: last 3 digits, then groups of 2
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");

  return (isNeg ? "-" : "") + grouped + "," + last3 + decPart;
}

/**
 * Parse a formatted Indian number string back to a raw number.
 * e.g. "1,00,000" → 100000
 */
export function parseIndianNumber(formatted: string): number {
  const cleaned = formatted.replace(/,/g, "");
  const num = Number(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Calculate months remaining until a deadline date.
 */
export function getMonthsRemaining(deadline: string | Date): number {
  const now = new Date();
  const end = new Date(deadline);
  return Math.max(
    0,
    (end.getFullYear() - now.getFullYear()) * 12 +
      end.getMonth() -
      now.getMonth()
  );
}