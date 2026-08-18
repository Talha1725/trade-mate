import { getMarketPricePrecision } from "@/lib/utils/market-price";

export function formatSignedChange(value: number, symbol?: string) {
  const precision = getMarketPricePrecision(symbol ?? "");
  const prefix = value >= 0 ? "+" : "";

  return `${prefix}${value.toLocaleString("en-US", {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  })}`;
}

export function formatPercent(value: number) {
  const prefix = value >= 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}%`;
}

export function formatVolume(value: number | null | undefined) {
  if (value == null) return "—";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return value.toLocaleString("en-US");
}
