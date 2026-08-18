import { formatTradingPrice } from "@/components/shared/trading-table-cells";
import type { MarketWatchItem } from "@/types/market-watch-card";

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
