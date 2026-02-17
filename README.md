# MRR Dashboard - Recurring Revenue from HubSpot

A Next.js application that calculates and visualizes **Monthly Recurring Revenue (MRR)** from HubSpot CRM data. Designed for embedding in HubSpot dashboards via iframe.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Data:** Next.js API Routes (keeps HubSpot API key server-side)

## Project Structure

```
├── app/
│   ├── api/mrr/route.ts    # Secure API route - fetches HubSpot data
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── BusinessUnitSelector.tsx
│   └── MRRChart.tsx
├── lib/
│   ├── hubspot.ts          # HubSpot API client
│   ├── mrr-calculator.ts   # MRR & proration logic
│   ├── proration.ts        # Proration utilities
│   └── types.ts
└── ...
```

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure HubSpot API:**
   - Copy `.env.local.example` to `.env.local`
   - Create a HubSpot Private App with scopes: `crm.objects.deals.read`, `crm.objects.line_items.read`
   - Add the access token to `HUBSPOT_API_KEY` in `.env.local`

3. **Configure pipeline IDs** (optional):  
   Edit `lib/types.ts` and set the correct `pipelineId` for each Business Unit (Omnext, JOSF, Supportbook). Testmonitor uses `3450105070`.

## Running

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## HubSpot Data

- **Deals:** From pipeline (configurable per Business Unit). Properties: `subscription_start_date`, `subscription_end_date`, `hs_is_closed`
- **Line Items:** Associated with deals. Properties: `price`, `quantity`, `recurringbillingfrequency`, `hs_recurring_billing_period`

## MRR Calculation

- **Monthly:** MRR = price × quantity  
- **Annually:** MRR = (price × quantity) / 12  
- **Proration:** Partial months at start/end are prorated: (Active Days / Days in Month) × MRR

## Embedding in HubSpot

Deploy the app and add an iframe to your HubSpot dashboard pointing to your deployed URL. The app sends headers to allow embedding in HubSpot domains.
