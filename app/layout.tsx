import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MRR Dashboard | Recurring Revenue",
  description: "Monthly Recurring Revenue visualization from HubSpot",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-50 font-sans text-slate-900">
        {children}
      </body>
    </html>
  );
}
