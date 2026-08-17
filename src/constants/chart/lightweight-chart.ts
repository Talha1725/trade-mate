import type { ChartCandle } from "@/types/eodhd";
import type { FibonacciDrawing } from "@/types/lightweight-trading-chart";

export const CHART_BACKGROUND = "transparent";
export const GRID_COLOR = "rgba(255, 255, 255, 0.06)";
export const TEXT_COLOR = "#ffffff";
export const LAST_PRICE_COLOR = "#22E0A2";
export const SUB_CHART_X_AXIS_FONT_SIZE = 10;
export const SUB_CHART_AXIS_COLOR = "#ffffff";
export const CANDLE_UP = "#10B981";
export const CANDLE_DOWN = "#EF4444";
export const EMA50_COLOR = "#3B82F6";
export const VWAP_COLOR = "#FF8000";
export const VWAP_BAND_COLORS = ["#2962FF", "#089981", "#F23645"];
export const COMPARE_LINE_COLOR = "#C084FC";

export const TRENDLINE_DEFAULT_STYLE = {
  color: "#2962FF",
  opacity: 1,
  width: 2,
  lineStyle: "solid" as const,
  leftEnd: "normal" as const,
  rightEnd: "normal" as const,
  extendLeft: false,
  extendRight: false,
};

export const TRENDLINE_DEFAULT_STATS = {
  visible: true,
  showPriceChange: true,
  showPercentChange: true,
  showBarsRange: false,
  showTimeRange: false,
  showAngle: false,
  position: "above" as const,
};

export const FIBONACCI_DEFAULT_STYLE: FibonacciDrawing["style"] = {
  showBaseline: true,
  baselineColor: "#9CA3AF",
  baselineOpacity: 0.8,
  baselineWidth: 1,
  baselineStyle: "dashed",
  levelLineWidth: 1,
  levelLineStyle: "solid",
  extendLeft: false,
  extendRight: false,
  showBackground: true,
  backgroundOpacity: 0.08,
  useOneColor: false,
  oneColor: "#2962FF",
  reverse: false,
  useLogScaleCalculation: false,
};

export const FIBONACCI_DEFAULT_LABELS: FibonacciDrawing["labels"] = {
  showRatio: true,
  ratioDisplay: "decimal",
  showPrice: true,
  showCustomText: true,
  horizontalPosition: "left",
  verticalPosition: "center",
  fontSize: 11,
  textColor: "#FFFFFF",
};

export const EMPTY_CANDLES: ChartCandle[] = [];

export function getDefaultVisibleBars(timeframe: string) {
  switch (timeframe) {
    case "1m": return 120;
    case "5m": return 140;
    case "15m": return 160;
    case "1H": return 180;
    case "4H": return 150;
    case "D": return 180;
    case "W": return 120;
    default: return 150;
  }
}

