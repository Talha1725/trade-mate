import { NextRequest, NextResponse } from "next/server";

import { aggregateCandles } from "@/lib/utils/chart-indicators";
import { resolveEodhdSymbol } from "@/lib/utils/eodhd-symbol";
import { mapTimeframeToEodhdPlan } from "@/lib/utils/map-timeframe-to-eodhd";
import type { ChartCandle, EodhdEodBar, EodhdIntradayBar } from "@/types/eodhd";
import type { TradingTimeframe } from "@/types/trading-filter-bar";

const EODHD_BASE_URL = "https://eodhd.com/api";
const VALID_TIMEFRAMES = new Set<TradingTimeframe>(["1m", "5m", "15m", "1H", "4H", "D", "W"]);

function parseTimeframe(value: string | null): TradingTimeframe {
  if (value && VALID_TIMEFRAMES.has(value as TradingTimeframe)) {
    return value as TradingTimeframe;
  }

  return "4H";
}

function toUnixSecondsFromDate(value: string) {
  return Math.floor(new Date(`${value}T00:00:00Z`).getTime() / 1000);
}

function mapIntradayBars(bars: EodhdIntradayBar[]): ChartCandle[] {
  return bars
    .map((bar) => ({
      time: Math.floor(new Date(`${bar.datetime.replace(" ", "T")}Z`).getTime() / 1000),
      open: Number(bar.open),
      high: Number(bar.high),
      low: Number(bar.low),
      close: Number(bar.close),
      volume: Number(bar.volume ?? 0),
    }))
    .filter((bar) => Number.isFinite(bar.time))
    .sort((left, right) => left.time - right.time);
}

function mapEodBars(bars: EodhdEodBar[]): ChartCandle[] {
  return bars
    .map((bar) => ({
      time: toUnixSecondsFromDate(bar.date),
      open: Number(bar.open),
      high: Number(bar.high),
      low: Number(bar.low),
      close: Number(bar.close),
      volume: Number(bar.volume ?? 0),
    }))
    .sort((left, right) => left.time - right.time);
}

async function fetchEodhdJson<T>(url: string) {
  const response = await fetch(url, {
    next: { revalidate: 60 },
  });

  const body = await response.text();

  if (!response.ok) {
    throw new Error(body || `EODHD request failed (${response.status})`);
  }

  if (body.includes("Only EOD data allowed")) {
    throw new Error(body);
  }

  return JSON.parse(body) as T;
}

function isEodOnlyError(message: string) {
  return message.includes("Only EOD data allowed") || message.includes("403");
}

async function fetchEodCandles(
  eodhdSymbol: string,
  apiToken: string,
  from: number,
  now: number,
) {
  const url = new URL(`${EODHD_BASE_URL}/eod/${eodhdSymbol}`);
  url.searchParams.set("api_token", apiToken);
  url.searchParams.set("fmt", "json");
  url.searchParams.set("period", "d");
  url.searchParams.set("from", new Date(from * 1000).toISOString().slice(0, 10));
  url.searchParams.set("to", new Date(now * 1000).toISOString().slice(0, 10));

  const bars = await fetchEodhdJson<EodhdEodBar[]>(url.toString());
  return mapEodBars(Array.isArray(bars) ? bars : []);
}

export async function GET(request: NextRequest) {
  const apiToken = process.env.EODHD_API_TOKEN;

  if (!apiToken) {
    return NextResponse.json(
      { message: "EODHD API token is not configured." },
      { status: 500 },
    );
  }

  const symbol = request.nextUrl.searchParams.get("symbol")?.trim();
  const timeframe = parseTimeframe(request.nextUrl.searchParams.get("timeframe"));

  if (!symbol) {
    return NextResponse.json({ message: "Symbol is required." }, { status: 400 });
  }

  const eodhdSymbol = resolveEodhdSymbol(symbol);
  const plan = mapTimeframeToEodhdPlan(timeframe);
  const now = Math.floor(Date.now() / 1000);
  const from = now - plan.fromDays * 24 * 60 * 60;

  try {
    let candles: ChartCandle[] = [];
    let dataSource: "intraday" | "eod" = "intraday";

    if (plan.mode === "eod") {
      candles = await fetchEodCandles(eodhdSymbol, apiToken, from, now);
      dataSource = "eod";
    } else {
      try {
        const url = new URL(`${EODHD_BASE_URL}/intraday/${eodhdSymbol}`);
        url.searchParams.set("api_token", apiToken);
        url.searchParams.set("fmt", "json");
        url.searchParams.set("interval", plan.interval);
        url.searchParams.set("from", String(from));
        url.searchParams.set("to", String(now));

        const bars = await fetchEodhdJson<EodhdIntradayBar[]>(url.toString());
        candles = mapIntradayBars(Array.isArray(bars) ? bars : []);
      } catch (error) {
        const message = error instanceof Error ? error.message : "";

        if (!isEodOnlyError(message)) {
          throw error;
        }

        candles = await fetchEodCandles(eodhdSymbol, apiToken, from, now);
        dataSource = "eod";
      }
    }

    if (plan.aggregateBucketSeconds && !(dataSource === "eod" && plan.mode === "intraday")) {
      candles = aggregateCandles(candles, plan.aggregateBucketSeconds);
    }

    return NextResponse.json({
      symbol,
      eodhdSymbol,
      timeframe,
      candles,
      dataSource,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load chart candles.";

    return NextResponse.json({ message }, { status: 502 });
  }
}
