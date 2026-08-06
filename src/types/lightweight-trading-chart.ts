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
  logicalIndex?: number;
  snappedField?: "open" | "high" | "low" | "close" | null;
};

export type TrendlineStyle = {
  color: string;
  opacity: number;
  width: number;
  lineStyle: "solid" | "dashed" | "dotted";
  leftEnd: "normal" | "arrow";
  rightEnd: "normal" | "arrow";
  extendLeft: boolean;
  extendRight: boolean;
};

export type TrendlineStatsSettings = {
  visible: boolean;
  showPriceChange: boolean;
  showPercentChange: boolean;
  showBarsRange: boolean;
  showTimeRange: boolean;
  showAngle: boolean;
  position: "above" | "below" | "center";
};

export type TrendlineDrawing = {
  id: string;
  tool: "trendline";
  points: [ChartPoint, ChartPoint];
  style: TrendlineStyle;
  stats: TrendlineStatsSettings;
  locked: boolean;
  hidden: boolean;
  createdAt: number;
  updatedAt: number;
};

export type ChartDrawing = {
  id: string;
  tool: Exclude<ChartToolId, "crosshair" | "trendline">;
  points: ChartPoint[];
  text?: string;
};

export type AnyChartDrawing = ChartDrawing | TrendlineDrawing;
