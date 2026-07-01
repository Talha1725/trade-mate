import type { EodhdAssetQuote } from "@/types/eodhd";
import type { TradingTimeframe } from "@/types/trading-filter-bar";

export type LightweightTradingChartProps = {
  symbol: string;
  compareSymbol?: string | null;
  timeframe?: TradingTimeframe;
  liveQuote?: EodhdAssetQuote | null;
  className?: string;
};

export type ChartLegendValues = {
  ema20: number | null;
  ema50: number | null;
  vwap: number | null;
  vwapRolling: number | null;
  lastPrice: number | null;
};
