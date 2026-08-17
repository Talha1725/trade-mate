import type { ChartCandle, ChartLiveQuote } from "@/types/eodhd";
import type { TradingTimeframe } from "@/types/trading-filter-bar";

export function getBucketSeconds(timeframe: TradingTimeframe) {
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
  quote: ChartLiveQuote,
  previous?: ChartCandle,
): ChartCandle {
  const open = quote.open ?? previous?.open ?? quote.price;
  const high = quote.high ?? previous?.high ?? quote.price;
  const low = quote.low ?? previous?.low ?? quote.price;
  const volume = quote.volume ?? previous?.volume ?? 0;

  return {
    time: bucketTime,
    open,
    high: Math.max(high, quote.price),
    low: Math.min(low, quote.price),
    close: quote.price,
    volume,
  };
}

export function mergeLiveQuoteIntoCandles(
  candles: ChartCandle[],
  quote: ChartLiveQuote,
  timeframe: TradingTimeframe,
): ChartCandle[] {
  const bucketSeconds = getBucketSeconds(timeframe);
  const now = Math.floor(Date.now() / 1000);
  const bucketTime = Math.floor(now / bucketSeconds) * bucketSeconds;
  const lastCandle = candles[candles.length - 1];
  const liveCandle = buildLiveCandle(bucketTime, quote, lastCandle);

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
        volume: Math.max(last.volume, liveCandle.volume),
      },
    ];
  }

  return [...alignedCandles, liveCandle];
}
