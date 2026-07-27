import type { TradingTimeframe } from "@/types/trading-filter-bar";
import type { TradingViewAdvancedChartConfig } from "@/types/trading-view";
import { resolveForexPairIcon } from "@/lib/utils/forex-flag";
import { normalizeTradingSymbol } from "@/lib/utils/market-symbol-icon";
import { resolveCryptoIconCode } from "@/lib/utils/resolve-crypto-icon";

export type { TradingViewAdvancedChartConfig };

const ADVANCED_CHART_EMBED_HOST = "https://www.tradingview-widget.com";

const TRADING_VIEW_SYMBOL_MAP: Record<string, string> = {
  BTCUSDT: "BINANCE:BTCUSDT",
  ETHUSDT: "BINANCE:ETHUSDT",
  SOLUSDT: "BINANCE:SOLUSDT",
  BNBUSDT: "BINANCE:BNBUSDT",
  XRPUSDT: "BINANCE:XRPUSDT",
  ADAUSDT: "BINANCE:ADAUSDT",
  DOGEUSDT: "BINANCE:DOGEUSDT",
  AVAXUSDT: "BINANCE:AVAXUSDT",
  LINKUSDT: "BINANCE:LINKUSDT",
  TONUSDT: "BINANCE:TONUSDT",
  TRXUSDT: "BINANCE:TRXUSDT",
  DOTUSDT: "BINANCE:DOTUSDT",
  LTCUSDT: "BINANCE:LTCUSDT",
  SUIUSDT: "BINANCE:SUIUSDT",
  TONUSD: "BINANCE:TONUSDT",
  EURUSD: "OANDA:EURUSD",
  GBPUSD: "OANDA:GBPUSD",
  USDJPY: "OANDA:USDJPY",
  USDCHF: "OANDA:USDCHF",
  AUDUSD: "OANDA:AUDUSD",
  USDCAD: "OANDA:USDCAD",
  NZDUSD: "OANDA:NZDUSD",
  XAUUSD: "OANDA:XAUUSD",
  XBRUSD: "TVC:UKOIL",
  SPX500: "TVC:SPX",
  EURJPY: "OANDA:EURJPY",
  GBPJPY: "OANDA:GBPJPY",
  BTCUSD: "BINANCE:BTCUSDT",
  ETHUSD: "BINANCE:ETHUSDT",
  SOLUSD: "BINANCE:SOLUSDT",
  XRPUSD: "BINANCE:XRPUSDT",
  ADAUSD: "BINANCE:ADAUSDT",
};

function resolveCryptoTradingViewSymbol(normalized: string) {
  if (normalized.endsWith("USDT")) {
    return `BINANCE:${normalized}`;
  }

  if (normalized.endsWith("USD") && normalized.length > 3) {
    return `BINANCE:${normalized.slice(0, -3)}USDT`;
  }

  return `BINANCE:${normalized}`;
}

export function resolveTradingViewSymbol(symbol: string) {
  const normalized = normalizeTradingSymbol(symbol);

  if (!normalized) {
    return "BINANCE:BTCUSDT";
  }

  if (normalized.includes(":")) {
    return normalized.toUpperCase();
  }

  const mappedSymbol = TRADING_VIEW_SYMBOL_MAP[normalized];

  if (mappedSymbol) {
    return mappedSymbol;
  }

  if (resolveCryptoIconCode(normalized)) {
    return resolveCryptoTradingViewSymbol(normalized);
  }

  if (resolveForexPairIcon(normalized)) {
    return `OANDA:${normalized}`;
  }

  if (normalized.endsWith("USDT")) {
    return `BINANCE:${normalized}`;
  }

  return `OANDA:${normalized}`;
}

export function mapTimeframeToTradingViewInterval(timeframe: TradingTimeframe) {
  const intervalMap: Record<TradingTimeframe, string> = {
    "1m": "1",
    "5m": "5",
    "15m": "15",
    "1H": "60",
    "4H": "240",
    D: "D",
    W: "W",
  };

  return intervalMap[timeframe];
}

export function mapTimeframeToMarketInterval(timeframe: TradingTimeframe) {
  const intervalMap: Record<TradingTimeframe, string> = {
    "1m": "1m",
    "5m": "5m",
    "15m": "15m",
    "1H": "1h",
    "4H": "4h",
    D: "1d",
    W: "1w",
  };

  return intervalMap[timeframe];
}

function getPageUri() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.location.href.replace(/^https?:\/\//, "");
}

export function buildAdvancedChartEmbedUrl({
  symbol,
  interval,
  compareSymbol = null,
}: TradingViewAdvancedChartConfig) {
  const url = new URL(`${ADVANCED_CHART_EMBED_HOST}/embed-widget/advanced-chart/`);
  url.searchParams.set("locale", "en");
  url.searchParams.set("symbol", symbol);

  const hashConfig: Record<string, unknown> = {
    autosize: true,
    symbol,
    interval,
    timezone: "Etc/UTC",
    theme: "dark",
    style: "1",
    locale: "en",
    enable_publishing: false,
    allow_symbol_change: false,
    hide_side_toolbar: false,
    hide_top_toolbar: false,
    save_image: false,
    backgroundColor: "#000000",
    color: "#FFFFFF",
    gridColor: "rgba(255, 255, 255, 0.06)",
    "page-uri": getPageUri(),
  };

  if (compareSymbol) {
    hashConfig.compareSymbols = [
      {
        symbol: compareSymbol,
        position: "SameScale",
      },
    ];
  }

  url.hash = encodeURIComponent(JSON.stringify(hashConfig));
  return url.toString();
}
