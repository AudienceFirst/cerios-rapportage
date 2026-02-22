/**
 * HubSpot Serverless Function: MRR API
 * Fetches deals + line items from HubSpot, calculates prorated MRR, returns JSON.
 * Uses PRIVATE_APP_ACCESS_TOKEN (auto-injected by HubSpot).
 */

const HUBSPOT_API_BASE = "https://api.hubapi.com";
const BUSINESS_UNITS = {
  testmonitor: "3450105070",
  omnext: "default",
  josf: "default",
  supportbook: "default",
};

async function hubspotFetch(path, options = {}) {
  const token = process.env["PRIVATE_APP_ACCESS_TOKEN"];
  if (!token) throw new Error("PRIVATE_APP_ACCESS_TOKEN not configured");
  const res = await fetch(`${HUBSPOT_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`HubSpot API ${res.status}: ${await res.text()}`);
  return res.json();
}

function parseDate(str) {
  if (!str) return undefined;
  const d = new Date(str);
  return isNaN(d.getTime()) ? undefined : d;
}

function getDaysInMonth(y, m) {
  return new Date(y, m, 0).getDate();
}

function getMonthKeysBetween(start, end) {
  const keys = [];
  let cur = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cur <= end) {
    keys.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`);
    cur.setMonth(cur.getMonth() + 1);
  }
  return keys;
}

function calcBaseMRR(price, qty, freq) {
  const total = price * qty;
  const f = (freq || "").toLowerCase();
  if (f === "annually" || f === "annual" || f === "yearly") return total / 12;
  return total;
}

function calcProrated(baseMRR, year, month, startDate, endDate) {
  const monthStart = new Date(year, month - 1, 1);
  const daysInMonth = getDaysInMonth(year, month);
  const monthEnd = new Date(year, month - 1, daysInMonth);
  if (endDate && endDate < monthStart) return 0;
  if (startDate > monthEnd) return 0;
  let effectiveStart = startDate > monthStart ? startDate : monthStart;
  let effectiveEnd = monthEnd;
  if (endDate && endDate < monthEnd) effectiveEnd = endDate;
  const activeDays =
    Math.ceil((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  if (activeDays <= 0) return 0;
  return Math.round((activeDays / daysInMonth) * baseMRR * 100) / 100;
}

function calculateMRR(dealsWithItems) {
  const monthMap = new Map();
  const MONTH_LABELS = {
    "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr",
    "05": "May", "06": "Jun", "07": "Jul", "08": "Aug",
    "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec",
  };

  for (const { deal, lineItems } of dealsWithItems) {
    const isClosed = deal.properties.hs_is_closed === "true";
    const startDate = parseDate(deal.properties.subscription_start_date);
    const endDate = parseDate(deal.properties.subscription_end_date);
    if (!startDate) continue;
    const effectiveEnd = endDate || new Date(2099, 11, 31);
    const monthKeys = getMonthKeysBetween(startDate, effectiveEnd);

    for (const li of lineItems) {
      const price = parseFloat(li.properties.price || "0") || 0;
      const qty = parseFloat(li.properties.quantity || "1") || 1;
      const freq =
        li.properties.recurringbillingfrequency ||
        li.properties.hs_recurring_billing_period ||
        "monthly";
      const baseMRR = calcBaseMRR(price, qty, freq);

      for (const key of monthKeys) {
        const [y, m] = key.split("-").map(Number);
        const prorated = calcProrated(
          baseMRR,
          y,
          m,
          startDate,
          endDate || undefined
        );
        if (prorated > 0) {
          const ex = monthMap.get(key) || { openDeals: 0, closedDeals: 0 };
          if (isClosed) ex.closedDeals += prorated;
          else ex.openDeals += prorated;
          monthMap.set(key, ex);
        }
      }
    }
  }

  const order = [...monthMap.keys()].sort();
  return order.map((key) => {
    const [, month] = key.split("-");
    const d = monthMap.get(key) || { openDeals: 0, closedDeals: 0 };
    const total = d.openDeals + d.closedDeals;
    return {
      month: `${MONTH_LABELS[month] || month} ${key.split("-")[0]}`,
      monthKey: key,
      openDeals: Math.round(d.openDeals * 100) / 100,
      closedDeals: Math.round(d.closedDeals * 100) / 100,
      total: Math.round(total * 100) / 100,
    };
  });
}

exports.main = async (context = {}) => {
  let businessUnit = "testmonitor";
  if (context.query && context.query.businessUnit) {
    businessUnit = context.query.businessUnit;
  } else {
    const req = context.request;
    if (req && req.query && req.query.businessUnit) {
      businessUnit = req.query.businessUnit;
    } else if (req && req.url) {
    try {
      const url = new URL(req.url, "http://localhost");
      businessUnit = url.searchParams.get("businessUnit") || businessUnit;
    } catch (_) {}
  }
  }

  const config = BUSINESS_UNITS[businessUnit];
  if (!config) {
    return {
      statusCode: 400,
      body: { error: `Invalid businessUnit: ${businessUnit}`, data: [] },
      headers: { "Content-Type": "application/json" },
    };
  }

  try {
    const pipelineId = config;
    const allDeals = [];
    let after;

    do {
      const body = {
        filterGroups: [{ filters: [{ propertyName: "pipeline", operator: "EQ", value: pipelineId }] }],
        properties: ["subscription_start_date", "subscription_end_date", "hs_is_closed"],
        limit: 100,
      };
      if (after) body.after = after;
      const searchRes = await hubspotFetch("/crm/v3/objects/deals/search", {
        method: "POST",
        body: JSON.stringify(body),
      });
      allDeals.push(...searchRes.results.map((r) => ({ id: r.id, properties: r.properties })));
      after = searchRes.paging?.next?.after;
    } while (after);

    if (allDeals.length === 0) {
      return {
        statusCode: 200,
        body: { data: [], businessUnit },
        headers: { "Content-Type": "application/json" },
      };
    }

    const dealIds = allDeals.map((d) => d.id);
    const dealToLineItems = new Map();

    for (let i = 0; i < dealIds.length; i += 100) {
      const batch = dealIds.slice(i, i + 100);
      const assocRes = await hubspotFetch(
        "/crm/v4/associations/deals/line_items/batch/read",
        {
          method: "POST",
          body: JSON.stringify({ inputs: batch.map((id) => ({ id })) }),
        }
      );
      for (const r of assocRes.results) {
        const ids = (r.to || []).map((t) => String(t.toObjectId));
        dealToLineItems.set(r.from.id, ids);
      }
    }

    const allLineItemIds = [...new Set([].concat(...dealToLineItems.values()))];
    const lineItemMap = new Map();

    for (let i = 0; i < allLineItemIds.length; i += 100) {
      const batch = allLineItemIds.slice(i, i + 100);
      const liRes = await hubspotFetch(
        "/crm/v3/objects/line_items/batch/read",
        {
          method: "POST",
          body: JSON.stringify({
            properties: ["price", "quantity", "recurringbillingfrequency", "hs_recurring_billing_period"],
            inputs: batch.map((id) => ({ id })),
          }),
        }
      );
      for (const r of liRes.results) {
        lineItemMap.set(r.id, r);
      }
    }

    const dealsWithItems = allDeals.map((deal) => {
      const ids = dealToLineItems.get(deal.id) || [];
      const items = ids.map((id) => lineItemMap.get(id)).filter(Boolean);
      return { deal, lineItems: items };
    });

    const data = calculateMRR(dealsWithItems);

    return {
      statusCode: 200,
      body: { data, businessUnit },
      headers: { "Content-Type": "application/json" },
    };
  } catch (err) {
    console.error("MRR function error:", err.message);
    return {
      statusCode: 500,
      body: { error: err.message || "Unknown error", data: [] },
      headers: { "Content-Type": "application/json" },
    };
  }
};
