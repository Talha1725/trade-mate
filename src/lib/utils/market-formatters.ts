import { getMarketPricePrecision } from "@/lib/utils/market-price";
import { formatSignedPercent } from "@/lib/utils/number-formatters";

export function formatSignedChange(value: number, symbol?: string) {
  const precision = getMarketPricePrecision(symbol ?? "");
  const prefix = value >= 0 ? "+" : "";

  return `${prefix}${value.toLocaleString("en-US", {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  })}`;
}

export function formatPercent(value: number) {
  return formatSignedPercent(value);
}

export function formatVolume(value: number | null | undefined) {
  if (value == null) return "—";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return value.toLocaleString("en-US");
}
