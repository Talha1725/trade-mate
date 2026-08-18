import { formatTradingPrice } from "@/components/shared/trading-table-cells";
import type { MarketWatchItem } from "@/types/market-watch-card";

export function formatWatchlistPercent(value: number) {
  const prefix = value >= 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}%`;
}

export function formatWatchlistChange(item: MarketWatchItem) {
  if (item.change == null) {
    return "—";
  }

  const sign = item.change >= 0 ? "+" : "-";
  const absoluteValue = Math.abs(item.change);
  const value = item.category === "CRYPTO"
    ? formatTradingPrice(absoluteValue, item.symbol, item.category)
    : absoluteValue.toFixed(5);

  return `${sign}${value}`;
}

export function formatWatchlistValue(value: number | null | undefined, symbol: string) {
  return value == null ? "—" : formatTradingPrice(value, symbol);
}

export function formatWatchlistVolume(value: number | null | undefined) {
  if (value == null) return "—";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return value.toLocaleString("en-US");
}
