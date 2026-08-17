import type { ChartLiveQuote } from "@/types/eodhd";
import type { PortfolioPosition, PortfolioTrade } from "@/types/dashboard";
import type { TradingTimeframe } from "@/types/trading-filter-bar";
import type { TradeMarker } from "@/components/dashboard/trade-marker-overlay";

export type LightweightTradingChartProps = {
  symbol: string;
  compareSymbol?: string | null;
  timeframe?: TradingTimeframe;
  liveQuote?: ChartLiveQuote | null;
  compareLiveQuote?: ChartLiveQuote | null;
  trades?: PortfolioTrade[];
  tradePositions?: PortfolioPosition[];
  markers?: TradeMarker[];
  showTradeMarkers?: boolean;
  onTradeMarkerClick?: (marker: TradeMarker) => void;
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

export type ChartIndicatorId = "ema" | "vwap";

export type ChartPoint = {
  time: number;
  price: number;
  logicalIndex?: number;
  snappedField?: "open" | "high" | "low" | "close" | null;
};

export type MagnetMode = "off" | "weak" | "strong";

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

export type FibonacciLevel = {
  id: string;
  ratio: number;
  visible: boolean;
  color: string;
  opacity: number;
  lineWidth?: number;
  lineStyle?: "solid" | "dashed" | "dotted";
  fillColor?: string;
  fillOpacity?: number;
  customText?: string;
};

export type FibonacciStyle = {
  showBaseline: boolean;
  baselineColor: string;
  baselineOpacity: number;
  baselineWidth: number;
  baselineStyle: "solid" | "dashed" | "dotted";
  levelLineWidth: number;
  levelLineStyle: "solid" | "dashed" | "dotted";
  extendLeft: boolean;
  extendRight: boolean;
  showBackground: boolean;
  backgroundOpacity: number;
  useOneColor: boolean;
  oneColor?: string;
  reverse: boolean;
  useLogScaleCalculation: boolean;
};

export type FibonacciLabelSettings = {
  showRatio: boolean;
  ratioDisplay: "decimal" | "percentage";
  showPrice: boolean;
  showCustomText: boolean;
  horizontalPosition: "left" | "center" | "right";
  verticalPosition: "above" | "center" | "below";
  fontSize: number;
  textColor?: string;
};

export type FibonacciDrawing = {
  id: string;
  tool: "fibonacci";
  points: [ChartPoint, ChartPoint];
  levels: FibonacciLevel[];
  style: FibonacciStyle;
  labels: FibonacciLabelSettings;
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

export type AnyChartDrawing = ChartDrawing | TrendlineDrawing | FibonacciDrawing;
