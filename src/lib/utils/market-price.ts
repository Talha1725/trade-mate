import type { MarketAssetClass } from "@/types/market";
import { FOREX_PREFIXES } from "@/constants/market";

function isForexSymbol(symbol: string) {
  const normalized = symbol.trim().toUpperCase();

  if (normalized.length !== 6) {
    return false;
  }

  const base = normalized.slice(0, 3);
  const quote = normalized.slice(3);

  return FOREX_PREFIXES.includes(base) && FOREX_PREFIXES.includes(quote);
}

export function getMarketPricePrecision(symbol: string, assetClass?: MarketAssetClass | null, value?: number) {
  if (assetClass === "FOREX" || isForexSymbol(symbol)) {
    return 5;
  }

  const normalized = symbol.trim().toUpperCase();
  const isCrypto = assetClass === "CRYPTO" || normalized.endsWith("USDT") || normalized.endsWith("USD");
  if (isCrypto) {
    const numericValue = value == null ? null : Math.abs(value);
    if (numericValue != null) {
      if (numericValue >= 100) return 2;
      if (numericValue >= 1) return 4;
      if (numericValue >= 0.01) return 6;
      return 8;
    }

    return normalized.startsWith("BTC") || normalized.startsWith("ETH") ? 2 : 6;
  }

  return 2;
}

export function formatMarketPrice(
  value: number | string | null | undefined,
  symbol: string,
  assetClass?: MarketAssetClass | null,
) {
  if (value == null || value === "") {
    return "—";
  }

  const numericValue = typeof value === "number" ? value : Number(value);

  if (Number.isNaN(numericValue)) {
    return "—";
  }

  return numericValue.toFixed(getMarketPricePrecision(symbol, assetClass, numericValue));
}
