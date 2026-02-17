/**
 * MRR calculation orchestrator
 * Combines deals, line items, and proration logic
 */

import {
  calculateBaseMRR,
  calculateProratedMRR,
  parseHubSpotDate,
  getMonthKeysBetween,
} from "./proration";
import type { HubSpotDeal, HubSpotLineItem, MRRDataPoint } from "./types";
import type { BillingFrequency } from "./proration";

interface DealWithLineItems {
  deal: HubSpotDeal;
  lineItems: HubSpotLineItem[];
}

/**
 * Calculate MRR data points from deals and their line items
 */
export function calculateMRRFromDeals(
  dealsWithLineItems: DealWithLineItems[]
): MRRDataPoint[] {
  const monthMap = new Map<
    string,
    { openDeals: number; closedDeals: number }
  >();

  for (const { deal, lineItems } of dealsWithLineItems) {
    const isClosed = deal.properties.hs_is_closed === "true";
    const startDate = parseHubSpotDate(deal.properties.subscription_start_date);
    const endDate = parseHubSpotDate(deal.properties.subscription_end_date);

    if (!startDate) continue; // Skip deals without start date

    // If no end date, use far future (ongoing subscription)
    const effectiveEndDate = endDate || new Date(2099, 11, 31);

    const monthKeys = getMonthKeysBetween(startDate, effectiveEndDate);

    for (const lineItem of lineItems) {
      const price = parseFloat(lineItem.properties.price || "0") || 0;
      const quantity = parseFloat(lineItem.properties.quantity || "1") || 1;
      const frequency = (lineItem.properties.recurringbillingfrequency ||
        lineItem.properties.hs_recurring_billing_period ||
        "monthly") as BillingFrequency;

      const baseMRR = calculateBaseMRR(price, quantity, frequency);

      for (const monthKey of monthKeys) {
        const [yearStr, monthStr] = monthKey.split("-");
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);

        const prorated = calculateProratedMRR(
          baseMRR,
          year,
          month,
          startDate,
          endDate || undefined
        );

        if (prorated > 0) {
          const existing = monthMap.get(monthKey) || {
            openDeals: 0,
            closedDeals: 0,
          };
          if (isClosed) {
            existing.closedDeals += prorated;
          } else {
            existing.openDeals += prorated;
          }
          monthMap.set(monthKey, existing);
        }
      }
    }
  }

  // Convert to sorted array and format for chart
  const monthOrder = Array.from(monthMap.keys()).sort();
  const MONTH_LABELS: Record<string, string> = {
    "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr",
    "05": "May", "06": "Jun", "07": "Jul", "08": "Aug",
    "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec",
  };

  return monthOrder.map((monthKey) => {
    const [year, month] = monthKey.split("-");
    const data = monthMap.get(monthKey) || { openDeals: 0, closedDeals: 0 };
    const total = data.openDeals + data.closedDeals;
    const monthLabel = MONTH_LABELS[month] || month;

    return {
      month: `${monthLabel} ${year}`,
      monthKey,
      openDeals: Math.round(data.openDeals * 100) / 100,
      closedDeals: Math.round(data.closedDeals * 100) / 100,
      total: Math.round(total * 100) / 100,
    };
  });
}
