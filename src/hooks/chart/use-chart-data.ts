import * as React from "react";

import { useChartMarketData } from "@/hooks/use-chart-market-data";
import { useEodhdMarketQuotes } from "@/hooks/use-eodhd-market-quotes";
import {
  buildIndicatorSeries,
  buildAlignedCompareSeries,
  calculateEma,
  calculateVwap,
  type VwapCalculationSettings,
} from "@/lib/utils/chart-indicators";
import { mergeLiveQuoteIntoCandles } from "@/lib/utils/merge-live-quote-candles";
import type { ChartLiveQuote } from "@/types/eodhd";
import type { ChartIndicatorId } from "@/types/lightweight-trading-chart";
import type { TradingTimeframe } from "@/types/trading-filter-bar";

const EMPTY_CANDLES: import("@/types/eodhd").ChartCandle[] = [];

type UseChartDataOptions = {
  symbol: string;
  compareSymbol: string | null;
  timeframe: TradingTimeframe;
  liveQuote: ChartLiveQuote | null;
  compareLiveQuote: ChartLiveQuote | null;
  enabledIndicators: ChartIndicatorId[];
  emaPeriod: number;
  vwapSettings: VwapCalculationSettings;
};

export function useChartData({
  symbol,
  compareSymbol,
  timeframe,
  liveQuote,
  compareLiveQuote,
  enabledIndicators,
  emaPeriod,
  vwapSettings,
}: UseChartDataOptions) {
  const { data, isLoading, isError } = useChartMarketData(symbol, timeframe);
  const { data: quoteResponse } = useEodhdMarketQuotes([symbol], { refetchInterval: 15_000 });
  const { data: compareData, isLoading: isCompareLoading } = useChartMarketData(compareSymbol ?? "", timeframe, { enabled: !!compareSymbol });
  const candles = data?.candles ?? EMPTY_CANDLES;
  const effectiveLiveQuote = liveQuote ?? quoteResponse?.quotes[symbol.toUpperCase()] ?? null;
  const compareCandles = compareData?.candles ?? EMPTY_CANDLES;

  const displayCandles = React.useMemo(
    () => effectiveLiveQuote ? mergeLiveQuoteIntoCandles(candles, effectiveLiveQuote, timeframe) : candles,
    [candles, effectiveLiveQuote, timeframe],
  );
  const displayCompareCandles = React.useMemo(
    () => compareLiveQuote && compareSymbol ? mergeLiveQuoteIntoCandles(compareCandles, compareLiveQuote, timeframe) : compareCandles,
    [compareCandles, compareLiveQuote, compareSymbol, timeframe],
  );
  const chartDataKey = React.useMemo(() => [
    symbol,
    timeframe,
    compareSymbol ?? "",
    candles.length,
    candles[candles.length - 1]?.time ?? 0,
    displayCompareCandles.length,
    displayCompareCandles[displayCompareCandles.length - 1]?.time ?? 0,
    compareLiveQuote?.price ?? "",
  ].join("|"), [candles, compareLiveQuote?.price, compareSymbol, displayCompareCandles, symbol, timeframe]);

  const ema = React.useMemo(
    () => enabledIndicators.includes("ema") ? buildIndicatorSeries(displayCandles, calculateEma(displayCandles.map((candle) => candle.close), emaPeriod)) : [],
    [displayCandles, emaPeriod, enabledIndicators],
  );
  const vwap = React.useMemo(
    () => enabledIndicators.includes("vwap") ? calculateVwap(displayCandles, vwapSettings) : [],
    [displayCandles, enabledIndicators, vwapSettings],
  );
  const compareTrack = React.useMemo(
    () => compareSymbol ? buildAlignedCompareSeries(displayCandles, displayCompareCandles) : [],
    [compareSymbol, displayCandles, displayCompareCandles],
  );
  const latestVwapPoint = vwap[vwap.length - 1] ?? null;

  return {
    candles,
    effectiveLiveQuote,
    displayCandles,
    displayCompareCandles,
    compareTrack,
    ema,
    vwap,
    latestVwapPoint,
    chartDataKey,
    isChartLoading: isLoading || (!!compareSymbol && isCompareLoading),
    isError,
    lastDisplayedClose: displayCandles[displayCandles.length - 1]?.close ?? null,
  };
}

