/**
 * Proration utilities for MRR calculation
 * Revenue is attributed only to months when subscription is active.
 * Partial months (start/end not on 1st) are prorated.
 */

export type BillingFrequency = "monthly" | "annually" | "Monthly" | "Annually";

/**
 * Calculate base MRR for a line item based on billing frequency
 * Monthly: MRR = price * quantity
 * Annually: MRR = (price * quantity) / 12
 */
export function calculateBaseMRR(
  price: number,
  quantity: number,
  frequency: BillingFrequency
): number {
  const total = price * quantity;
  const freq = (frequency || "").toLowerCase();
  if (freq === "annually" || freq === "annual" || freq === "yearly") {
    return total / 12;
  }
  return total; // Monthly or default
}

/**
 * Get the number of days in a given month
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Calculate prorated MRR for a specific month
 * @param baseMRR - The full monthly MRR for the line item
 * @param year - Year of the month
 * @param month - Month (1-12)
 * @param startDate - Subscription start date
 * @param endDate - Subscription end date (undefined = ongoing)
 * @returns Prorated MRR for that month, or 0 if not active
 */
export function calculateProratedMRR(
  baseMRR: number,
  year: number,
  month: number,
  startDate: Date,
  endDate: Date | undefined
): number {
  const monthStart = new Date(year, month - 1, 1);
  const daysInMonth = getDaysInMonth(year, month);
  const monthEnd = new Date(year, month - 1, daysInMonth);

  // Subscription not started yet
  if (endDate && endDate < monthStart) return 0;
  if (startDate > monthEnd) return 0;

  // Determine active date range within the month
  let effectiveStart = startDate > monthStart ? startDate : monthStart;
  let effectiveEnd = monthEnd;

  if (endDate) {
    if (endDate < monthStart) return 0;
    effectiveEnd = endDate < monthEnd ? endDate : monthEnd;
  }

  // Calculate active days (inclusive)
  const activeDays =
    Math.ceil((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  if (activeDays <= 0) return 0;

  const proratedAmount = (activeDays / daysInMonth) * baseMRR;
  return Math.round(proratedAmount * 100) / 100;
}

/**
 * Parse a date string from HubSpot (various formats: ISO, milliseconds, etc.)
 */
export function parseHubSpotDate(dateStr: string | undefined): Date | undefined {
  if (!dateStr) return undefined;

  // HubSpot may return milliseconds
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return undefined;
  return parsed;
}

/**
 * Get array of year-month keys between two dates (inclusive of months that overlap)
 */
export function getMonthKeysBetween(startDate: Date, endDate: Date): string[] {
  const keys: string[] = [];
  const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

  while (current <= endDate) {
    keys.push(
      `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`
    );
    current.setMonth(current.getMonth() + 1);
  }

  return keys;
}
