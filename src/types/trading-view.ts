import type { PositionSummary } from "@/types/dashboard";
import type { RecentActivityItem } from "@/types/dashboard";
import type { EodhdAssetQuote } from "@/types/eodhd";
import type {
  TradingFilterBarAsset,
  TradingFilterBarOhlcv,
  TradingFilterBarQuote,
  TradingTimeframe,
} from "@/types/trading-filter-bar";

export type TradingChartProps = {
  symbol?: string;
  compareSymbol?: string | null;
  interval?: string;
  title?: string;
  description?: string;
  className?: string;
  contentClassName?: string;
};

export type LiveTradingViewProps = {
  symbol?: string;
  compareSymbol?: string | null;
  timeframe?: TradingTimeframe;
  liveQuote?: EodhdAssetQuote | null;
  className?: string;
  positions?: PositionSummary[];
  recentActivity?: RecentActivityItem[];
  filterAssets?: TradingFilterBarAsset[];
  filterQuote?: TradingFilterBarQuote;
  filterOhlcv?: TradingFilterBarOhlcv;
  filterTimeframe?: TradingTimeframe;
  onFilterAssetChange?: (assetId: string) => void;
  onFilterTimeframeChange?: (timeframe: TradingTimeframe) => void;
};

export type TradingViewWidget = {
  widget: new (config: {
    autosize: boolean;
    symbol: string;
    interval: string;
    timezone: string;
    theme: "light" | "dark";
    style: string;
    locale: string;
    toolbar_bg?: string;
    enable_publishing?: boolean;
    allow_symbol_change?: boolean;
    hide_side_toolbar?: boolean;
    hide_top_toolbar?: boolean;
    save_image?: boolean;
    container_id: string;
  }) => unknown;
};

export type TradingViewWindow = Window & {
  TradingView?: TradingViewWidget;
};

export type TradingViewAdvancedChartConfig = {
  symbol: string;
  interval: string;
  compareSymbol?: string | null;
};
