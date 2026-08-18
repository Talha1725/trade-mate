import type { AssetCategory } from "@/types/asset";

export const SYMBOL_CATEGORY_ORDER: AssetCategory[] = [
  "FOREX",
  "CRYPTO",
  "COMMODITIES",
  "INDICES",
  "STOCK",
];

export const SYMBOL_CATEGORY_LABELS: Record<AssetCategory, string> = {
  FOREX: "Forex",
  CRYPTO: "Crypto",
  COMMODITIES: "Commodities",
  INDICES: "Indices",
  STOCK: "Stocks",
};
