import type { ChartCandle, EodhdAssetQuote } from "@/types/eodhd";
import type { MarketSnapshotData } from "@/types/market-snapshot";
import type { MarketWatchItem } from "@/types/market-watch-card";
import type { TradingFilterBarOhlcv, TradingFilterBarQuote } from "@/types/trading-filter-bar";

export function mapEodhdQuoteToFilterQuote(quote: EodhdAssetQuote): TradingFilterBarQuote {
  return {
    price: quote.price,
    change: quote.change,
    changePercent: quote.changePercent,
  };
}

export function mapEodhdQuoteToFilterOhlcv(quote: EodhdAssetQuote): TradingFilterBarOhlcv {
  return {
    open: quote.open,
    high: quote.high,
    low: quote.low,
    volume: quote.volume,
  };
}

export function enrichWatchlistItemsWithQuotes(
  items: MarketWatchItem[],
  quotes: Record<string, EodhdAssetQuote>,
): MarketWatchItem[] {
  return items.map((item) => {
    const quote = quotes[item.symbol.toUpperCase()];

    if (!quote) {
      return item;
    }

    return {
      ...item,
      price: quote.price,
      changePercent: quote.changePercent,
    };
  });
}

function formatVolumeLabel(volume: number, symbol: string) {
  const base = symbol.replace(/USDT?$/i, "").toUpperCase() || symbol;

  if (volume >= 1_000_000) {
    return `${(volume / 1_000_000).toFixed(2)}M ${base}`;
  }

  if (volume >= 1_000) {
    return `${(volume / 1_000).toFixed(2)}K ${base}`;
  }

  return `${volume.toLocaleString("en-US")} ${base}`;
}

function formatRange(low: number, high: number) {
  const formatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${formatter.format(low)} — ${formatter.format(high)}`;
}

export function buildMarketSnapshotFromQuote(
  quote: EodhdAssetQuote,
  sparklineCandles: ChartCandle[] = [],
): MarketSnapshotData {
  return {
    price: quote.price,
    changePercent: quote.changePercent,
    isLive: quote.dataSource === "realtime",
    badges: [
      { id: "momentum", label: "Momentum Strong", icon: "momentum" },
      { id: "risk", label: "Risk Healthy", icon: "risk" },
    ],
    stats: [
      {
        id: "day-range",
        label: "Day Range",
        value: formatRange(quote.low, quote.high),
      },
      {
        id: "volume",
        label: "Volume 24h",
        value: formatVolumeLabel(quote.volume, quote.symbol),
        tone: "primary",
      },
    ],
    sparkline:
      sparklineCandles.length > 0
        ? sparklineCandles.slice(-10).map((candle) => ({ value: candle.close }))
        : [{ value: quote.price }],
  };
}
