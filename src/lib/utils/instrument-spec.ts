import type { AssetCategory } from "@/types/asset";
import { FOREX_PREFIXES } from "@/constants/market";

export type InstrumentSpec = {
  symbol: string;
  assetClass: AssetCategory;
  contractSize: number;
  quoteCurrency: string;
  leverage: number;
};

export type QuotePriceMap = Record<string, number | null | undefined>;

function normalizeSymbol(symbol: string) {
  return symbol.trim().toUpperCase();
}

function isForexSymbol(symbol: string) {
  const normalized = normalizeSymbol(symbol);

  if (normalized.length !== 6) {
    return false;
  }

  const base = normalized.slice(0, 3);
  const quote = normalized.slice(3);

  return FOREX_PREFIXES.includes(base) && FOREX_PREFIXES.includes(quote);
}

function getSupportedQuoteSymbol(spec: InstrumentSpec) {
  switch (spec.quoteCurrency) {
    case "EUR":
      return spec.symbol === "EURUSD" ? null : "EURUSD";
    case "GBP":
      return spec.symbol === "GBPUSD" ? null : "GBPUSD";
    case "AUD":
      return spec.symbol === "AUDUSD" ? null : "AUDUSD";
    case "NZD":
      return spec.symbol === "NZDUSD" ? null : "NZDUSD";
    case "JPY":
      return spec.symbol === "USDJPY" ? null : "USDJPY";
    case "CHF":
      return spec.symbol === "USDCHF" ? null : "USDCHF";
    case "CAD":
      return spec.symbol === "USDCAD" ? null : "USDCAD";
    default:
      return null;
  }
}

export function getSupplementalQuoteSymbol(symbol: string) {
  return getSupportedQuoteSymbol(getInstrumentSpec(symbol));
}

export function getInstrumentSpec(symbol: string): InstrumentSpec {
  const normalized = normalizeSymbol(symbol);

  if (normalized === "BTCUSD" || normalized.endsWith("USDT")) {
    return {
      symbol: normalized,
      assetClass: "CRYPTO",
      contractSize: 1,
      quoteCurrency: "USD",
      leverage: 2,
    };
  }

  if (normalized === "XAUUSD") {
    return {
      symbol: normalized,
      assetClass: "COMMODITIES",
      contractSize: 100,
      quoteCurrency: "USD",
      leverage: 20,
    };
  }

  if (normalized === "XAGUSD") {
    return {
      symbol: normalized,
      assetClass: "COMMODITIES",
      contractSize: 5_000,
      quoteCurrency: "USD",
      leverage: 20,
    };
  }

  if (normalized === "XBRUSD") {
    return {
      symbol: normalized,
      assetClass: "COMMODITIES",
      contractSize: 1_000,
      quoteCurrency: "USD",
      leverage: 20,
    };
  }

  if (normalized === "SPX500") {
    return {
      symbol: normalized,
      assetClass: "INDICES",
      contractSize: 1,
      quoteCurrency: "USD",
      leverage: 20,
    };
  }

  if (isForexSymbol(normalized)) {
    return {
      symbol: normalized,
      assetClass: "FOREX",
      contractSize: 100_000,
      quoteCurrency: normalized.slice(3),
      leverage: 100,
    };
  }

  return {
    symbol: normalized,
    assetClass: "STOCK",
    contractSize: 1,
    quoteCurrency: "USD",
    leverage: 20,
  };
}

export function getQuoteToUsdRate(
  spec: InstrumentSpec,
  markPrice: number,
  quotePrices: QuotePriceMap = {},
) {
  const normalizedSymbol = normalizeSymbol(spec.symbol);
  const supplementalSymbol = getSupportedQuoteSymbol(spec);

  switch (spec.quoteCurrency) {
    case "USD":
    case "USDT":
      return 1;
    case "EUR":
    case "GBP":
    case "AUD":
    case "NZD": {
      const price = quotePrices[supplementalSymbol ?? ""] ?? null;
      return price != null && price > 0 ? price : null;
    }
    case "JPY":
    case "CHF":
    case "CAD": {
      if (normalizedSymbol === `USD${spec.quoteCurrency}` && markPrice > 0) {
        return 1 / markPrice;
      }

      const price = quotePrices[supplementalSymbol ?? ""] ?? null;
      return price != null && price > 0 ? 1 / price : null;
    }
    default:
      return 1;
  }
}

export function calculateNotionalUsd(
  symbol: string,
  lots: number,
  price: number,
  quotePrices: QuotePriceMap = {},
) {
  const spec = getInstrumentSpec(symbol);
  const quoteToUsd = getQuoteToUsdRate(spec, price, quotePrices);

  if (quoteToUsd == null) {
    return null;
  }

  return lots * spec.contractSize * price * quoteToUsd;
}

export function calculateMarginUsd(
  symbol: string,
  lots: number,
  price: number,
  quotePrices: QuotePriceMap = {},
) {
  const spec = getInstrumentSpec(symbol);
  const notional = calculateNotionalUsd(symbol, lots, price, quotePrices);

  if (notional == null) {
    return null;
  }

  return notional / spec.leverage;
}
