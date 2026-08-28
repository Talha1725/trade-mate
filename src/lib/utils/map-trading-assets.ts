import type { AssetRecord } from "@/types/asset";
import type { TradingFilterBarAsset } from "@/types/trading-filter-bar";

export function mapAssetRecordsToTradingFilterAssets(
  assets: AssetRecord[],
): TradingFilterBarAsset[] {
  return [...assets]
    .filter((asset) => asset.isActive)
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((asset) => ({
      id: asset.id,
      label: asset.label,
      symbol: asset.symbol,
      category: asset.category,
      contractSize: asset.contractSize,
      quoteCurrency: asset.quoteCurrency,
      leverage: asset.leverage,
    }));
}
