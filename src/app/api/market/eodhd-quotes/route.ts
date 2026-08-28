import { NextRequest, NextResponse } from "next/server";

function backendUrl() {
  return process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4100";
}

export async function GET(request: NextRequest) {
  const url = new URL("/api/market/quotes", backendUrl());
  url.searchParams.set("symbols", request.nextUrl.searchParams.get("symbols") ?? "");

  const response = await fetch(url, { cache: "no-store" });
  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}
