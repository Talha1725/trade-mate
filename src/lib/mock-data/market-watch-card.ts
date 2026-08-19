import type {
  MarketWatchIcon,
  MarketNewsItem,
  MarketSignalItem,
  MarketWatchItem,
  MarketWatchTabConfig,
} from "@/types/market-watch-card";
import { DEFAULT_WATCHLIST_ASSET_IDS } from "@/constants/watchlist";

export const MARKET_WATCH_TABS: MarketWatchTabConfig[] = [
  { id: "watchlist", label: "Watchlist" },
];

export const MARKET_WATCH_ICON_IMAGES: Record<MarketWatchIcon, string> = {
  bitcoin: "/images/coins/btc.svg",
  ethereum: "/images/coins/ethereum.svg",
  solana: "/images/coins/solana.svg",
  ripple: "/images/coins/ripple.svg",
  cardano: "/images/coins/cardano.svg",
};

export const mockWatchlistItems: MarketWatchItem[] = [
  {
    id: "btcusdt",
    symbol: "BTCUSDT",
    name: "BTC / USDT",
    price: 69102.75,
    changePercent: 0.86,
  },
  {
    id: "ethusdt",
    symbol: "ETHUSDT",
    name: "ETH / USDT",
    price: 3450.25,
    changePercent: 0.86,
  },
  {
    id: "solusdt",
    symbol: "SOLUSDT",
    name: "SOL / USDT",
    price: 142.8,
    changePercent: 0.86,
  },
  {
    id: "xrpusdt",
    symbol: "XRPUSDT",
    name: "XRP / USDT",
    price: 0.62,
    changePercent: 0.86,
  },
  {
    id: "adausdt",
    symbol: "ADAUSDT",
    name: "ADA / USDT",
    price: 0.45,
    changePercent: 0.86,
  },
];

export { DEFAULT_WATCHLIST_ASSET_IDS };

export const mockMarketSignals: MarketSignalItem[] = [
  {
    id: "btc-breakout-retest",
    label: "BTC breakout retest",
    signal: "Long Bias",
    tone: "positive",
  },
  {
    id: "eth-momentum-rising",
    label: "ETH momentum rising",
    signal: "Strong",
    tone: "positive",
  },
  {
    id: "sol-position-size",
    label: "SOL position size",
    signal: "Watch Risk",
    tone: "warning",
  },
];

export const mockMarketNews: MarketNewsItem[] = [
  {
    id: "btc-liquidity-us-open",
    headline: "Bitcoin liquidity improves after US open",
    minutesAgo: 2,
  },
  {
    id: "eth-etf-flows",
    headline: "ETH ETF flows remain positive",
    minutesAgo: 12,
  },
  {
    id: "macro-dollar-softens",
    headline: "Macro: Dollar index softens",
    minutesAgo: 28,
  },
];
