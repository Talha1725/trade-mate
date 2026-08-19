import type * as React from "react";
import type { IChartApi, ISeriesApi } from "lightweight-charts";

import type { VwapCalculationSettings } from "@/types/chart/indicators";
import type { ChartCandle, ChartLiveQuote } from "@/types/eodhd";
import type { TradingTimeframe } from "@/types/trading-filter-bar";

export type ChartInstanceOptions = {
  mainContainerRef: React.RefObject<HTMLDivElement | null>;
  subContainerRef: React.RefObject<HTMLDivElement | null>;
  mainChartRef: React.MutableRefObject<IChartApi | null>;
  subChartRef: React.MutableRefObject<IChartApi | null>;
  mainSeriesRef: React.MutableRefObject<ISeriesApi<"Candlestick" | "Line" | "Area">[]>;
  subSeriesRef: React.MutableRefObject<ISeriesApi<"Area">[]>;
  candleSeriesRef: React.MutableRefObject<ISeriesApi<"Candlestick"> | null>;
  emaSeriesRef: React.MutableRefObject<ISeriesApi<"Line"> | null>;
  vwapSeriesRef: React.MutableRefObject<ISeriesApi<"Line"> | null>;
  vwapUpperSeriesRefs: React.MutableRefObject<Array<ISeriesApi<"Line"> | null>>;
  vwapLowerSeriesRefs: React.MutableRefObject<Array<ISeriesApi<"Line"> | null>>;
  priceLineRef: React.MutableRefObject<ReturnType<ISeriesApi<"Candlestick">["createPriceLine"]> | null>;
  priceLabelRef: React.RefObject<HTMLDivElement | null>;
  lastCloseRef: React.MutableRefObject<number | null>;
  initialViewKeyRef: React.MutableRefObject<string | null>;
  symbol: string;
  timeframe: TradingTimeframe;
  normalizedCompareSymbol: string | null;
  displayCandles: ChartCandle[];
  displayCompareCandles: ChartCandle[];
  compareTrack: Array<{ time: number; value: number }>;
  enabledIndicators: string[];
  vwap: Array<{
    time: number;
    value: number;
    upperBands: Array<number | null>;
    lowerBands: Array<number | null>;
  }>;
  vwapSettings: VwapCalculationSettings;
  ema: Array<{ time: number; value: number }>;
  effectiveLiveQuote: ChartLiveQuote | null;
  candles: ChartCandle[];
  chartDataKey: string;
  overlayRevision: React.Dispatch<React.SetStateAction<number>>;
  indicatorPeriods: { ema: number };
  syncLastPriceLabel: (
    series: ISeriesApi<"Candlestick">,
    price: number,
    label: HTMLDivElement | null,
    symbol: string,
  ) => void;
};
