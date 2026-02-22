import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ACCESS_KEY = process.env.DASHBOARD_ACCESS_KEY;

export function middleware(request: NextRequest) {
  if (!ACCESS_KEY) return NextResponse.next();

  const url = request.nextUrl;
  const key = url.searchParams.get("key");

  if (key !== ACCESS_KEY) {
    if (url.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return new NextResponse(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Unauthorized</title></head><body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8fafc"><div style="text-align:center;padding:2rem"><h1 style="color:#64748b;font-size:1.25rem">Access restricted</h1><p style="color:#94a3b8;font-size:0.875rem">Add your access key to the URL: <code>?key=YOUR_KEY</code></p></div></body></html>`,
      { status: 401, headers: { "Content-Type": "text/html" } }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/api/mrr"],
};
