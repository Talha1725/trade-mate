import type { PortfolioValuePoint } from "@/types/portfolio-value-chart";
import type { TradingTimeframe } from "@/types/trading-filter-bar";
import { DISPLAY_TIME_ZONE } from "@/constants/timezone";
import { PORTFOLIO_TIMEFRAME_SPANS_MS } from "@/constants/portfolio-chart";

const INTRADAY_TIMEFRAMES = new Set<TradingTimeframe>(["1m", "5m", "15m", "1H", "4H"]);

export function formatPortfolioValueTimestamp(timestamp: number, timeframe: TradingTimeframe) {
  const date = new Date(timestamp);

  if (INTRADAY_TIMEFRAMES.has(timeframe)) {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: DISPLAY_TIME_ZONE,
      timeZoneName: "short",
    });
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: DISPLAY_TIME_ZONE,
    timeZoneName: "short",
  });
}

export function buildPortfolioValueSeries(
  values: number[],
  timeframe: TradingTimeframe,
  endTime = Date.now(),
): PortfolioValuePoint[] {
  const span = PORTFOLIO_TIMEFRAME_SPANS_MS[timeframe];
  const startTime = endTime - span;
  const step = span / Math.max(values.length - 1, 1);

  return values.map((value, index) => {
    const timestamp = Math.round(startTime + step * index);

    return {
      timestamp,
      label: formatPortfolioValueTimestamp(timestamp, timeframe),
      value,
    };
  });
}
