/**
 * HubSpot API client for fetching deals and line items
 * Keeps API key secure on server-side only
 */

import type { HubSpotDeal, HubSpotLineItem } from "./types";

const HUBSPOT_API_BASE = "https://api.hubapi.com";

async function hubspotFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = process.env.HUBSPOT_API_KEY;
  if (!apiKey) {
    throw new Error("HUBSPOT_API_KEY is not configured");
  }

  const url = `${HUBSPOT_API_BASE}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `HubSpot API error ${response.status}: ${errorBody || response.statusText}`
    );
  }

  return response.json();
}

interface DealsSearchResponse {
  results: Array<{ id: string; properties: Record<string, string> }>;
  paging?: {
    next?: { after: string };
  };
}

/**
 * Search deals by pipeline with pagination
 */
export async function fetchDealsByPipeline(
  pipelineId: string,
  limit = 100
): Promise<HubSpotDeal[]> {
  const allDeals: HubSpotDeal[] = [];
  let after: string | undefined;

  do {
    const body: Record<string, unknown> = {
      filterGroups: [
        {
          filters: [
            {
              propertyName: "pipeline",
              operator: "EQ",
              value: pipelineId,
            },
          ],
        },
      ],
      properties: [
        "subscription_start_date",
        "subscription_end_date",
        "hs_is_closed",
      ],
      limit,
    };

    if (after) {
      body.after = after;
    }

    const response = await hubspotFetch<DealsSearchResponse>(
      "/crm/v3/objects/deals/search",
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );

    const deals = response.results.map((r) => ({
      id: r.id,
      properties: r.properties,
    }));
    allDeals.push(...deals);

    after = response.paging?.next?.after;
  } while (after);

  return allDeals;
}

interface AssociationBatchResponse {
  results: Array<{
    from: { id: string };
    to: Array<{ toObjectId: string }>;
  }>;
}

/**
 * Get line item IDs associated with deals (batch, max 100 per request)
 */
export async function fetchDealLineItemAssociations(
  dealIds: string[]
): Promise<Map<string, string[]>> {
  const dealToLineItems = new Map<string, string[]>();

  // Batch read supports up to 100 inputs
  for (let i = 0; i < dealIds.length; i += 100) {
    const batch = dealIds.slice(i, i + 100);
    const response = await hubspotFetch<AssociationBatchResponse>(
      "/crm/v4/associations/deals/line_items/batch/read",
      {
        method: "POST",
        body: JSON.stringify({
          inputs: batch.map((id) => ({ id })),
        }),
      }
    );

    for (const result of response.results) {
      const lineItemIds = (result.to || []).map((t) => String(t.toObjectId));
      dealToLineItems.set(result.from.id, lineItemIds);
    }
  }

  return dealToLineItems;
}

interface LineItemsBatchResponse {
  results: Array<{ id: string; properties: Record<string, string> }>;
}

/**
 * Batch fetch line items by ID
 */
export async function fetchLineItemsBatch(
  lineItemIds: string[]
): Promise<HubSpotLineItem[]> {
  if (lineItemIds.length === 0) return [];

  const allItems: HubSpotLineItem[] = [];

  // HubSpot batch read limit is typically 100
  for (let i = 0; i < lineItemIds.length; i += 100) {
    const batchIds = lineItemIds.slice(i, i + 100);
    const response = await hubspotFetch<LineItemsBatchResponse>(
      "/crm/v3/objects/line_items/batch/read",
      {
        method: "POST",
        body: JSON.stringify({
          properties: [
            "price",
            "quantity",
            "recurringbillingfrequency",
            "hs_recurring_billing_period",
          ],
          inputs: batchIds.map((id) => ({ id })),
        }),
      }
    );

    allItems.push(
      ...response.results.map((r) => ({
        id: r.id,
        properties: r.properties,
      }))
    );
  }

  return allItems;
}
