# MRR Dashboard - HubSpot Hosted

This folder contains everything needed to host the MRR dashboard **inside HubSpot** using HubSpot Serverless Functions and a static page.

## Requirements

- **Content Hub Enterprise** subscription (for serverless endpoint functions)
- **HubSpot CLI** installed and authenticated
- **Platform version 2025.1** (serverless is not supported in 2025.2)

## Project Structure

```
hubspot/
├── hsproject.json
├── mrr-dashboard.html      # Frontend - paste into HubSpot Custom HTML module
├── README.md
└── src/
    └── app/
        ├── app.json
        └── app.functions/
            ├── mrr.js           # Serverless function (API logic)
            ├── serverless.json
            └── package.json
```

## Deploy Steps

### 1. Create the HubSpot Project

```bash
cd hubspot
hs project create --platform-version 2025.1
# When prompted: choose "Create an empty project" or similar
# Name it e.g. "cerios-mrr"
```

If you already have a project, **replace** its `src/app` content with the contents of this `hubspot/src/app` folder.

### 2. Configure the Private App

- In HubSpot: **Settings → Integrations → Private Apps**
- Create a new private app (or use existing) with scopes:
  - `crm.objects.deals.read`
  - `crm.objects.line_items.read`
- For a **new project**: When you run `hs project upload`, HubSpot will create/link the app. Use platform version **2025.1**.

### 3. Upload the Project

```bash
cd hubspot
hs project upload
```

Follow the prompts to create the project in your HubSpot account. Wait for the build to complete.

### 4. Get Your Endpoint URL

After deployment, your serverless function is available at:

```
https://YOUR_DOMAIN/hs/serverless/mrr
```

- **YOUR_DOMAIN** = a domain connected to your HubSpot account, e.g.:
  - `12345678.hs-sites.com` (default HubSpot domain)
  - Your custom domain (e.g. `www.yourcompany.com`)

Test it: Open `https://YOUR_DOMAIN/hs/serverless/mrr?businessUnit=testmonitor` in a browser. You should see JSON.

### 5. Add the Dashboard to a HubSpot Page

1. Create a new **Website page** or **Landing page** in HubSpot.
2. Add a **Custom HTML** module (or "Embed" / "HTML" depending on your theme).
3. Open `mrr-dashboard.html` and copy its **entire contents**.
4. Paste into the Custom HTML module.
5. The script uses `window.location.origin` for the API URL, so it will automatically call `/hs/serverless/mrr` on the same domain. **Important:** The page must be hosted on the same domain as the serverless endpoint (e.g. your `*.hs-sites.com` or custom domain).
6. Publish the page.

### 6. Pipeline Configuration

Edit `src/app/app.functions/mrr.js` and update the `BUSINESS_UNITS` object with your actual pipeline IDs:

```js
const BUSINESS_UNITS = {
  testmonitor: "3450105070",  // Already set
  omnext: "YOUR_PIPELINE_ID",
  josf: "YOUR_PIPELINE_ID",
  supportbook: "YOUR_PIPELINE_ID",
};
```

Redeploy with `hs project upload` after changes.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Serverless not supported" | Use platform version **2025.1** in `hsproject.json` |
| "PRIVATE_APP_ACCESS_TOKEN not configured" | Ensure the private app has the correct scopes and is linked to the project |
| CORS / "Failed to load" | Page and endpoint must be on the same domain |
| Empty data | Check pipeline IDs in `mrr.js`; verify deals have `subscription_start_date` and line items |
| 10 second timeout | Reduce data volume or add pagination limits |

## Limits

- **Execution:** 10 seconds max per request
- **Rate:** 600 execution seconds per minute total
- **Payload:** 6MB max

## Local Development

```bash
cd hubspot
# Add PRIVATE_APP_ACCESS_TOKEN to src/app/app.functions/.env for local testing
hs project run
```

## Files to Deploy

- `hsproject.json`
- `src/app/app.json`
- `src/app/app.functions/mrr.js`
- `src/app/app.functions/serverless.json`
- `src/app/app.functions/package.json`

The `mrr-dashboard.html` file is **not** uploaded via CLI—you paste it into a HubSpot Custom HTML module when building your page.
