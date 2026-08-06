export type CompareAssetItem = {
  id: string;
  symbol: string;
  name: string;
};

export type CompareAssetsDropdownProps = {
  primaryAssetId: string;
  assets: import("@/types/trading-filter-bar").TradingFilterBarAsset[];
  compareAssetId?: string | null;
  onCompareChange?: (assetId: string | null) => void;
  className?: string;
};
