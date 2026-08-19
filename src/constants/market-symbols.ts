import type { MarketWatchIcon } from "@/types/market-watch-card";
import type { CryptoIconCode } from "@/types/asset-icon";

export const EXACT_SYMBOL_ICON_MAP: Record<string, MarketWatchIcon> = {
  BTCUSD: "bitcoin", ETHUSD: "ethereum", SOLUSD: "solana", XRPUSD: "ripple", ADAUSD: "cardano",
};

export const SYMBOL_PREFIX_ICON_MAP: Array<[string, MarketWatchIcon]> = [
  ["BTC", "bitcoin"], ["ETH", "ethereum"], ["SOL", "solana"], ["XRP", "ripple"], ["ADA", "cardano"],
];

export const CRYPTO_SYMBOL_BASES = [
  "BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE", "AVAX", "LINK", "TON", "TRX", "DOT", "LTC", "SUI",
] as const;

export const CRYPTO_SYMBOL_PREFIX_MAP: Array<[string, CryptoIconCode]> = [
  ["BTC", "btc"], ["ETH", "eth"], ["SOL", "sol"], ["BNB", "bnb"], ["DOGE", "doge"], ["AVAX", "avax"],
  ["LINK", "link"], ["XRP", "xrp"], ["ADA", "ada"], ["TON", "ton"], ["TRX", "trx"], ["DOT", "dot"],
  ["LTC", "ltc"], ["SUI", "sui"],
];
