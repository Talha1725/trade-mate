import { FOREX_PREFIXES } from "@/constants/market";

function isForexSymbol(symbol: string) {
  const normalized = symbol.trim().toUpperCase();
  if (normalized.length !== 6) return false;

  return (
    FOREX_PREFIXES.includes(normalized.slice(0, 3)) &&
    FOREX_PREFIXES.includes(normalized.slice(3))
  );
}

function getTradingPriceDecimals(value: number, symbol?: string, assetClass?: string | null) {
  if (assetClass === "FOREX" || (symbol ? isForexSymbol(symbol) : false)) return 5;

  const normalized = symbol?.trim().toUpperCase() ?? "";
  const isCrypto = assetClass === "CRYPTO" || normalized.endsWith("USDT") || normalized.endsWith("USD");
  if (isCrypto) {
    const absoluteValue = Math.abs(value);
    if (absoluteValue >= 100) return 2;
    if (absoluteValue >= 1) return 4;
    if (absoluteValue >= 0.01) return 6;
    return 8;
  }

  return value < 1 ? 4 : 2;
}

export function formatTradingPrice(value: number, symbol?: string, assetClass?: string | null) {
  const decimals = getTradingPriceDecimals(value, symbol, assetClass);
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatTradingQty(value: number) {
  if (Number.isInteger(value) || value >= 100) return value.toLocaleString("en-US");

  return value.toLocaleString("en-US", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
}

export function formatUsdPrice(value: number, symbol?: string, assetClass?: string | null) {
  return `$${formatTradingPrice(value, symbol, assetClass)}`;
}
