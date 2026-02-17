/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow embedding in iframes (HubSpot dashboard)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Allow embedding in HubSpot dashboards
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self' https://*.hubspot.com https://*.hubspotusercontent.com" },
        ],
      },
    ];
  },
};

export default nextConfig;
