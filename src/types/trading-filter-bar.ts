import type { AssetCategory } from "@/types/asset";

export type TradingTimeframe = "1m" | "5m" | "15m" | "1H" | "4H" | "D" | "W";

export type TradingFilterBarActionId = "indicators" | "compare" | "replay";

export type TradingFilterBarAsset = {
  id: string;
  label: string;
  symbol: string;
  category: AssetCategory;
  contractSize: number;
  quoteCurrency: string;
  leverage: number;
};

export type TradingFilterBarQuote = {
  price: number;
  change: number;
  changePercent: number;
};

export type TradingFilterBarOhlcv = {
  open: number;
  high: number;
  low: number;
  volume: number;
};

export type TradingFilterBarAction = {
  id: TradingFilterBarActionId;
  label: string;
};

export type TradingFilterBarProps = {
  assets: TradingFilterBarAsset[];
  selectedAssetId: string;
  onAssetChange?: (assetId: string) => void;
  accountNumber?: string | null;
  quote: TradingFilterBarQuote;
  ohlcv: TradingFilterBarOhlcv;
  timeframe: TradingTimeframe;
  onTimeframeChange?: (timeframe: TradingTimeframe) => void;
  compareAssetId?: string | null;
  onCompareChange?: (assetId: string | null) => void;
  onActionClick?: (action: TradingFilterBarActionId) => void;
  className?: string;
};

export type TradingFilterBarState = {
  selectedAssetId: string;
  timeframe: TradingTimeframe;
};
