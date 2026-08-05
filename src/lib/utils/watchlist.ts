import type { TradingFilterBarAsset } from "@/types/trading-filter-bar";
import type { MarketWatchItem } from "@/types/market-watch-card";

const WATCHLIST_MOCK_PRICES: Record<string, { price: number; changePercent: number }> = {
  BTCUSDT: { price: 69102.75, changePercent: 0.86 },
  ETHUSDT: { price: 3450.25, changePercent: 0.62 },
  SOLUSDT: { price: 142.8, changePercent: 1.12 },
  BNBUSDT: { price: 612.4, changePercent: -0.34 },
  XRPUSDT: { price: 0.62, changePercent: 0.48 },
  ADAUSDT: { price: 0.45, changePercent: -0.21 },
  DOGEUSDT: { price: 0.16, changePercent: 2.14 },
  AVAXUSDT: { price: 36.8, changePercent: 0.95 },
  LINKUSDT: { price: 14.2, changePercent: 0.31 },
  TONUSDT: { price: 5.42, changePercent: -0.18 },
  TRXUSDT: { price: 0.12, changePercent: 0.09 },
  DOTUSDT: { price: 7.15, changePercent: 0.44 },
  LTCUSDT: { price: 84.3, changePercent: -0.52 },
  SUIUSDT: { price: 1.68, changePercent: 1.05 },
  EURUSD: { price: 1.08, changePercent: -0.12 },
  GBPUSD: { price: 1.27, changePercent: 0.08 },
  USDJPY: { price: 149.42, changePercent: 0.15 },
  USDCHF: { price: 0.88, changePercent: -0.06 },
  AUDUSD: { price: 0.66, changePercent: 0.11 },
  USDCAD: { price: 1.36, changePercent: -0.09 },
  NZDUSD: { price: 0.61, changePercent: 0.05 },
  XAUUSD: { price: 2348.5, changePercent: 0.28 },
  EURJPY: { price: 161.2, changePercent: 0.03 },
  GBPJPY: { price: 189.7, changePercent: 0.19 },
};

const DEFAULT_WATCHLIST_QUOTE = { price: 100, changePercent: 0 };

export const DEFAULT_WATCHLIST_ASSET_IDS: string[] = [];

function getWatchlistQuote(symbol: string) {
  return WATCHLIST_MOCK_PRICES[symbol.toUpperCase()] ?? DEFAULT_WATCHLIST_QUOTE;
}

export function tradingFilterAssetToWatchlistItem(
  asset: TradingFilterBarAsset,
): MarketWatchItem {
  const quote = getWatchlistQuote(asset.symbol);

  return {
    id: asset.id,
    symbol: asset.symbol,
    name: asset.label,
    price: quote.price,
    changePercent: quote.changePercent,
  };
}

export function buildWatchlistFromAssets(
  watchlistIds: string[],
  assets: TradingFilterBarAsset[],
): MarketWatchItem[] {
  const assetById = new Map(assets.map((asset) => [asset.id, asset]));

  return watchlistIds
    .map((id) => assetById.get(id))
    .filter((asset): asset is TradingFilterBarAsset => asset !== undefined)
    .map(tradingFilterAssetToWatchlistItem);
}

export function isAssetInWatchlist(assetId: string, watchlistIds: string[]) {
  return watchlistIds.includes(assetId);
}
