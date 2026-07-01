import type { TradingFilterBarAsset } from "@/types/trading-filter-bar";
import type { MarketWatchItem } from "@/types/market-watch-card";

export const DEFAULT_WATCHLIST_ASSET_IDS: string[] = [];

export function tradingFilterAssetToWatchlistItem(
  asset: TradingFilterBarAsset,
): MarketWatchItem {
  return {
    id: asset.id,
    symbol: asset.symbol,
    name: asset.label,
    price: 0,
    changePercent: 0,
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
