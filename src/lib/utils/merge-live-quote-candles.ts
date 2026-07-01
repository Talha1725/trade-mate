import type { ChartCandle, EodhdAssetQuote } from "@/types/eodhd";
import type { TradingTimeframe } from "@/types/trading-filter-bar";

function getBucketSeconds(timeframe: TradingTimeframe) {
  switch (timeframe) {
    case "1m":
      return 60;
    case "5m":
      return 5 * 60;
    case "15m":
      return 15 * 60;
    case "1H":
      return 60 * 60;
    case "4H":
      return 4 * 60 * 60;
    case "D":
      return 24 * 60 * 60;
    case "W":
      return 7 * 24 * 60 * 60;
    default:
      return 4 * 60 * 60;
  }
}

function buildLiveCandle(
  bucketTime: number,
  quote: Pick<EodhdAssetQuote, "price" | "open" | "high" | "low" | "volume">,
): ChartCandle {
  return {
    time: bucketTime,
    open: quote.open,
    high: Math.max(quote.high, quote.price),
    low: Math.min(quote.low, quote.price),
    close: quote.price,
    volume: quote.volume,
  };
}

export function mergeLiveQuoteIntoCandles(
  candles: ChartCandle[],
  quote: Pick<EodhdAssetQuote, "price" | "open" | "high" | "low" | "volume">,
  timeframe: TradingTimeframe,
): ChartCandle[] {
  const bucketSeconds = getBucketSeconds(timeframe);
  const now = Math.floor(Date.now() / 1000);
  const bucketTime = Math.floor(now / bucketSeconds) * bucketSeconds;
  const liveCandle = buildLiveCandle(bucketTime, quote);

  if (candles.length === 0) {
    return [liveCandle];
  }

  const alignedCandles = candles.filter((candle) => candle.time <= bucketTime);

  if (alignedCandles.length === 0) {
    return [liveCandle];
  }

  const last = alignedCandles[alignedCandles.length - 1];

  if (last.time === bucketTime) {
    return [
      ...alignedCandles.slice(0, -1),
      {
        time: bucketTime,
        open: last.open,
        high: Math.max(last.high, liveCandle.high),
        low: Math.min(last.low, liveCandle.low),
        close: quote.price,
        volume: Math.max(last.volume, quote.volume),
      },
    ];
  }

  return [...alignedCandles, liveCandle];
}
