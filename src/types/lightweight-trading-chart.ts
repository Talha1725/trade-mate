import type { ChartLiveQuote } from "@/types/eodhd";
import type { TradingTimeframe } from "@/types/trading-filter-bar";

export type LightweightTradingChartProps = {
  symbol: string;
  compareSymbol?: string | null;
  timeframe?: TradingTimeframe;
  liveQuote?: ChartLiveQuote | null;
  className?: string;
};

export type ChartLegendValues = {
  ema20: number | null;
  ema50: number | null;
  vwap: number | null;
  vwapRolling: number | null;
  lastPrice: number | null;
};

export type ChartToolId =
  | "crosshair"
  | "trendline"
  | "fibonacci"
  | "brush"
  | "path"
  | "text"
  | "ruler";

export type ChartIndicatorId = "ema20" | "ema50" | "vwap" | "rolling-vwap";

export type ChartPoint = {
  time: number;
  price: number;
};

export type ChartDrawing = {
  id: string;
  tool: Exclude<ChartToolId, "crosshair">;
  points: ChartPoint[];
  text?: string;
};
