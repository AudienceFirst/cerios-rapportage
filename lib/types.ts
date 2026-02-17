/**
 * Type definitions for HubSpot MRR Dashboard
 */

export type BusinessUnit = "omnext" | "josf" | "supportbook" | "testmonitor";

export type BusinessUnitConfig = {
  id: BusinessUnit;
  label: string;
  pipelineId: string;
};

export const BUSINESS_UNITS: BusinessUnitConfig[] = [
  { id: "testmonitor", label: "Testmonitor", pipelineId: "3450105070" },
  { id: "omnext", label: "Omnext", pipelineId: "default" }, // Placeholder - configure your pipeline ID
  { id: "josf", label: "JOSF", pipelineId: "default" }, // Placeholder - configure your pipeline ID
  { id: "supportbook", label: "Supportbook", pipelineId: "default" }, // Placeholder - configure your pipeline ID
];

export interface HubSpotDeal {
  id: string;
  properties: {
    subscription_start_date?: string;
    subscription_end_date?: string;
    hs_is_closed?: string;
  };
}

export interface HubSpotLineItem {
  id: string;
  properties: {
    price?: string;
    quantity?: string;
    recurringbillingfrequency?: string;
    hs_recurring_billing_period?: string;
  };
}

export interface MRRDataPoint {
  month: string;
  monthKey: string; // YYYY-MM for sorting
  openDeals: number;
  closedDeals: number;
  total: number;
}

export interface MRRApiResponse {
  data: MRRDataPoint[];
  businessUnit: BusinessUnit;
  error?: string;
}
