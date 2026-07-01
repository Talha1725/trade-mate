import { NextRequest, NextResponse } from "next/server";

import { resolveEodhdSymbol } from "@/lib/utils/eodhd-symbol";
import type { EodhdAssetQuote, EodhdEodBar, EodhdRealtimeBar } from "@/types/eodhd";

const EODHD_BASE_URL = "https://eodhd.com/api";

async function fetchEodhdJson<T>(url: string) {
  const response = await fetch(url, {
    next: { revalidate: 15 },
  });

  const body = await response.text();

  if (!response.ok) {
    throw new Error(body || `EODHD request failed (${response.status})`);
  }

  return JSON.parse(body) as T;
}

function mapRealtimeBar(
  symbol: string,
  eodhdSymbol: string,
  bar: EodhdRealtimeBar,
): EodhdAssetQuote {
  const price = Number(bar.close);
  const previousClose = Number(bar.previousClose ?? bar.open);
  const change = Number.isFinite(Number(bar.change))
    ? Number(bar.change)
    : price - previousClose;
  const changePercent = Number.isFinite(Number(bar.change_p))
    ? Number(bar.change_p)
    : previousClose !== 0
      ? (change / previousClose) * 100
      : 0;

  return {
    symbol,
    eodhdSymbol,
    price,
    change,
    changePercent,
    open: Number(bar.open),
    high: Number(bar.high),
    low: Number(bar.low),
    volume: Number(bar.volume ?? 0),
    dataSource: "realtime",
  };
}

function mapEodBarToQuote(
  symbol: string,
  eodhdSymbol: string,
  latest: EodhdEodBar,
  previous?: EodhdEodBar,
): EodhdAssetQuote {
  const price = Number(latest.close);
  const previousClose = Number(previous?.close ?? latest.open);
  const change = price - previousClose;
  const changePercent = previousClose !== 0 ? (change / previousClose) * 100 : 0;

  return {
    symbol,
    eodhdSymbol,
    price,
    change,
    changePercent,
    open: Number(latest.open),
    high: Number(latest.high),
    low: Number(latest.low),
    volume: Number(latest.volume ?? 0),
    dataSource: "eod",
  };
}

async function fetchEodQuote(
  symbol: string,
  eodhdSymbol: string,
  apiToken: string,
): Promise<EodhdAssetQuote> {
  const now = Math.floor(Date.now() / 1000);
  const from = now - 14 * 24 * 60 * 60;
  const url = new URL(`${EODHD_BASE_URL}/eod/${eodhdSymbol}`);
  url.searchParams.set("api_token", apiToken);
  url.searchParams.set("fmt", "json");
  url.searchParams.set("period", "d");
  url.searchParams.set("from", new Date(from * 1000).toISOString().slice(0, 10));
  url.searchParams.set("to", new Date(now * 1000).toISOString().slice(0, 10));

  const bars = await fetchEodhdJson<EodhdEodBar[]>(url.toString());
  const sorted = (Array.isArray(bars) ? bars : []).sort((left, right) =>
    left.date.localeCompare(right.date),
  );

  if (sorted.length === 0) {
    throw new Error(`No EOD quote data for ${symbol}.`);
  }

  const latest = sorted[sorted.length - 1];
  const previous = sorted.length > 1 ? sorted[sorted.length - 2] : undefined;

  return mapEodBarToQuote(symbol, eodhdSymbol, latest, previous);
}

async function fetchSymbolQuote(symbol: string, apiToken: string): Promise<EodhdAssetQuote> {
  const eodhdSymbol = resolveEodhdSymbol(symbol);

  try {
    const url = new URL(`${EODHD_BASE_URL}/real-time/${eodhdSymbol}`);
    url.searchParams.set("api_token", apiToken);
    url.searchParams.set("fmt", "json");

    const payload = await fetchEodhdJson<EodhdRealtimeBar | EodhdRealtimeBar[]>(url.toString());
    const bar = Array.isArray(payload) ? payload[0] : payload;

    if (!bar || !Number.isFinite(Number(bar.close))) {
      throw new Error(`Invalid real-time quote for ${symbol}.`);
    }

    return mapRealtimeBar(symbol, eodhdSymbol, bar);
  } catch {
    return fetchEodQuote(symbol, eodhdSymbol, apiToken);
  }
}

export async function GET(request: NextRequest) {
  const apiToken = process.env.EODHD_API_TOKEN;

  if (!apiToken) {
    return NextResponse.json(
      { message: "EODHD API token is not configured." },
      { status: 500 },
    );
  }

  const symbolsParam = request.nextUrl.searchParams.get("symbols");
  const symbols = Array.from(
    new Set(
      symbolsParam
        ?.split(",")
        .map((symbol) => symbol.trim().toUpperCase())
        .filter(Boolean) ?? [],
    ),
  );

  if (symbols.length === 0) {
    return NextResponse.json({ message: "At least one symbol is required." }, { status: 400 });
  }

  try {
    const quoteEntries = await Promise.all(
      symbols.map(async (symbol) => {
        const quote = await fetchSymbolQuote(symbol, apiToken);
        return [symbol, quote] as const;
      }),
    );

    const quotes = Object.fromEntries(quoteEntries);

    return NextResponse.json({ quotes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load market quotes.";

    return NextResponse.json({ message }, { status: 502 });
  }
}
