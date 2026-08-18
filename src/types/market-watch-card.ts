export type MarketWatchTab = "watchlist";
export type MarketSignalTone = "positive" | "warning" | "neutral";
// | "signals" | "news"
export type MarketWatchIcon =
  | "bitcoin"
  | "ethereum"
  | "solana"
  | "ripple"
  | "cardano";

export type MarketWatchItem = {
  id: string;
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  change?: number | null;
  high?: number | null;
  low?: number | null;
  volume?: number | null;
};

export type MarketWatchTabConfig = {
  id: MarketWatchTab;
  label: string;
};

export type MarketSignalItem = {
  id: string;
  label: string;
  signal: string;
  tone?: MarketSignalTone;
};

export type MarketNewsItem = {
  id: string;
  headline: string;
  minutesAgo: number;
};

export type MarketWatchCardProps = {
  items: MarketWatchItem[];
  signals?: MarketSignalItem[];
  news?: MarketNewsItem[];
  selectedItemId: string;
  isLoading?: boolean;
  onItemSelect?: (itemId: string) => void;
  onWatchlistToggle?: (itemId: string) => void;
  className?: string;
};

export type WatchlistRowProps = {
  item: MarketWatchItem;
  isSelected: boolean;
  onSelect?: () => void;
  onWatchlistToggle?: (itemId: string) => void;
};
