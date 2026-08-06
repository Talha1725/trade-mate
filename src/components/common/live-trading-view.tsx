"use client";

import { LightweightTradingChart } from "@/components/dashboard/lightweight-trading-chart";
import type { LiveTradingViewProps } from "@/types";

export function LiveTradingView({
  symbol,
  compareSymbol = null,
  timeframe = "4H",
  liveQuote = null,
  compareLiveQuote = null,
  trades = [],
  tradePositions = [],
  className,
}: LiveTradingViewProps) {
  return (
    <LightweightTradingChart
      symbol={symbol ?? "BTCUSDT"}
      compareSymbol={compareSymbol}
      timeframe={timeframe}
      liveQuote={liveQuote}
      compareLiveQuote={compareLiveQuote}
      trades={trades}
      tradePositions={tradePositions}
      className={className}
    />
  );
}
