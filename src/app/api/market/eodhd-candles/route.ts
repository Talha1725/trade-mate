import { NextRequest, NextResponse } from "next/server";

function backendUrl() {
  return process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4100";
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const timeframe = params.get("timeframe");
  const url = new URL(timeframe ? "/api/market/chart" : "/api/market/history", backendUrl());
  url.searchParams.set("symbol", params.get("symbol") ?? "");
  if (timeframe) {
    url.searchParams.set("timeframe", timeframe);
  } else {
    url.searchParams.set("interval", params.get("interval") ?? "1d");
    url.searchParams.set("limit", params.get("limit") ?? "500");
  }

  const response = await fetch(url, { cache: "no-store" });
  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}
