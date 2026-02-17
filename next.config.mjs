/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow embedding in iframes (HubSpot dashboard)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Allow embedding in iframes from any origin
          { key: 'Content-Security-Policy', value: "frame-ancestors *" },
        ],
      },
    ];
  },
};

export default nextConfig;
