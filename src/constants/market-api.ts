import type { TradingTimeframe } from "@/types/trading-filter-bar";

export const EODHD_BASE_URL = process.env.EODHD_BASE_URL;
export const VALID_MARKET_TIMEFRAMES = new Set<TradingTimeframe>(["1m", "5m", "15m", "1H", "4H", "D", "W"]);
