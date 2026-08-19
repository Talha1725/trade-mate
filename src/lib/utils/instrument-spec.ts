import type { AssetCategory } from "@/types/asset";
import type { TradingFilterBarAsset } from "@/types/trading-filter-bar";

export type InstrumentSpec = {
  symbol: string;
  assetClass: AssetCategory;
  contractSize: number;
  quoteCurrency: string;
  leverage: number;
};

export type QuotePriceMap = Record<string, number | null | undefined>;
type AssetMetadata = Pick<TradingFilterBarAsset, "symbol" | "category" | "contractSize" | "quoteCurrency" | "leverage">;

function normalizeSymbol(symbol: string) { return symbol.trim().toUpperCase(); }

function findAsset(symbol: string, assets: AssetMetadata[]) {
  const normalized = normalizeSymbol(symbol);
  return assets.find((asset) => normalizeSymbol(asset.symbol) === normalized);
}

function getSupportedQuoteSymbol(spec: InstrumentSpec, assets: AssetMetadata[]) {
  const quoteCurrency = spec.quoteCurrency.toUpperCase();
  if (quoteCurrency === "USD" || quoteCurrency === "USDT") {
    return null;
  }

  const candidates = [
    `${quoteCurrency}USD`,
    `${quoteCurrency}USDT`,
    `USD${quoteCurrency}`,
  ];

  return candidates.find((candidate) =>
    candidate !== spec.symbol && assets.some((asset) => normalizeSymbol(asset.symbol) === candidate),
  ) ?? null;
}

export function getInstrumentSpec(symbol: string, assets: AssetMetadata[] = []): InstrumentSpec | null {
  const asset = findAsset(symbol, assets);
  if (!asset) return null;
  return {
    symbol: normalizeSymbol(asset.symbol),
    assetClass: asset.category,
    contractSize: asset.contractSize,
    quoteCurrency: asset.quoteCurrency,
    leverage: asset.leverage,
  };
}

export function getSupplementalQuoteSymbol(symbol: string, assets: AssetMetadata[] = []) {
  const spec = getInstrumentSpec(symbol, assets);
  return spec ? getSupportedQuoteSymbol(spec, assets) : null;
}

export function getQuoteToUsdRate(
  spec: InstrumentSpec,
  markPrice: number,
  quotePrices: QuotePriceMap = {},
  assets: AssetMetadata[] = [],
) {
  const normalizedSymbol = normalizeSymbol(spec.symbol);
  const quoteCurrency = spec.quoteCurrency.toUpperCase();
  if (quoteCurrency === "USD" || quoteCurrency === "USDT") {
    return 1;
  }

  if (normalizedSymbol === `USD${quoteCurrency}` && markPrice > 0) {
    return 1 / markPrice;
  }

  const supplementalSymbol = getSupportedQuoteSymbol(spec, assets);
  const price = quotePrices[supplementalSymbol ?? ""] ?? null;
  if (price == null || price <= 0) return null;

  return supplementalSymbol?.startsWith("USD") ? 1 / price : price;
}

export function calculateNotionalUsd(symbol: string, lots: number, price: number, quotePrices: QuotePriceMap = {}, assets: AssetMetadata[] = []) {
  const spec = getInstrumentSpec(symbol, assets);
  if (!spec) return null;
  const quoteToUsd = getQuoteToUsdRate(spec, price, quotePrices, assets);
  return quoteToUsd == null ? null : lots * spec.contractSize * price * quoteToUsd;
}

export function calculateMarginUsd(symbol: string, lots: number, price: number, quotePrices: QuotePriceMap = {}, assets: AssetMetadata[] = []) {
  const spec = getInstrumentSpec(symbol, assets);
  const notional = calculateNotionalUsd(symbol, lots, price, quotePrices, assets);
  return spec && notional != null ? notional / spec.leverage : null;
}
