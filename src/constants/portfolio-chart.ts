import type { TradingTimeframe } from "@/types/trading-filter-bar";

export const PORTFOLIO_TIMEFRAME_SPANS_MS: Record<TradingTimeframe, number> = {
  "1m": 60 * 60 * 1000,
  "5m": 6 * 60 * 60 * 1000,
  "15m": 12 * 60 * 60 * 1000,
  "1H": 24 * 60 * 60 * 1000,
  "4H": 7 * 24 * 60 * 60 * 1000,
  D: 30 * 24 * 60 * 60 * 1000,
  W: 90 * 24 * 60 * 60 * 1000,
};
