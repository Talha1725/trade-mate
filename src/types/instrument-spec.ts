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
export type AssetMetadata = Pick<
  TradingFilterBarAsset,
  "symbol" | "category" | "contractSize" | "quoteCurrency" | "leverage"
>;
