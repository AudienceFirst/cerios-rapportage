/**
 * Secure API route for fetching and calculating MRR from HubSpot
 * Keeps HUBSPOT_API_KEY on server only
 */

import { NextRequest, NextResponse } from "next/server";
import {
  fetchDealsByPipeline,
  fetchDealLineItemAssociations,
  fetchLineItemsBatch,
} from "@/lib/hubspot";
import { calculateMRRFromDeals } from "@/lib/mrr-calculator";
import { BUSINESS_UNITS } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessUnitId = searchParams.get("businessUnit") || "testmonitor";

    const config = BUSINESS_UNITS.find((bu) => bu.id === businessUnitId);
    if (!config) {
      return NextResponse.json(
        { error: `Invalid business unit: ${businessUnitId}` },
        { status: 400 }
      );
    }

    const pipelineId = config.pipelineId;

    // 1. Fetch all deals from pipeline (paginated)
    const deals = await fetchDealsByPipeline(pipelineId);

    if (deals.length === 0) {
      return NextResponse.json({
        data: [],
        businessUnit: businessUnitId,
      });
    }

    const dealIds = deals.map((d) => d.id);

    // 2. Get line item associations for all deals
    const dealToLineItems = await fetchDealLineItemAssociations(dealIds);

    // 3. Collect all unique line item IDs
    const allLineItemIds = new Set<string>();
    dealToLineItems.forEach((ids) => ids.forEach((id) => allLineItemIds.add(id)));

    // 4. Batch fetch line items
    const lineItems = await fetchLineItemsBatch(Array.from(allLineItemIds));
    const lineItemMap = new Map(lineItems.map((li) => [li.id, li]));

    // 5. Build deals with their line items
    const dealsWithLineItems = deals.map((deal) => {
      const ids = dealToLineItems.get(deal.id) || [];
      const items = ids
        .map((id) => lineItemMap.get(id))
        .filter((li): li is NonNullable<typeof li> => li != null);
      return { deal, lineItems: items };
    });

    // 6. Calculate MRR
    const mrrData = calculateMRRFromDeals(dealsWithLineItems);

    return NextResponse.json({
      data: mrrData,
      businessUnit: businessUnitId,
    });
  } catch (error) {
    console.error("MRR API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message, data: [] },
      { status: 500 }
    );
  }
}
