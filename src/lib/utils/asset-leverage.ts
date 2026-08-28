import type { TradingFilterBarAsset } from "@/types/trading-filter-bar";

export function getAssetLeverageLabel(asset: Pick<TradingFilterBarAsset, "leverage"> | null | undefined) {
  return asset && Number.isFinite(asset.leverage) ? `1:${asset.leverage}` : "—";
}
