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

const WEEK_SECONDS = 7 * 24 * 60 * 60;
const MONDAY_UTC_ANCHOR_SECONDS = Date.UTC(1970, 0, 5) / 1000;

export function getBucketTime(timestampSeconds: number, timeframe: TradingTimeframe) {
  const bucketSeconds = getBucketSeconds(timeframe);

  if (timeframe === "W") {
    return Math.floor((timestampSeconds - MONDAY_UTC_ANCHOR_SECONDS) / WEEK_SECONDS) * WEEK_SECONDS + MONDAY_UTC_ANCHOR_SECONDS;
  }

  return Math.floor(timestampSeconds / bucketSeconds) * bucketSeconds;
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
  const providerTime = quote.timestamp ? Date.parse(quote.timestamp) : Date.now();
  if (!Number.isFinite(providerTime)) {
    return candles;
  }

  const timestampSeconds = Math.floor(providerTime / 1000);
  const bucketTime = getBucketTime(timestampSeconds, timeframe);
  const lastCandle = candles[candles.length - 1];
  const nowBucketTime = getBucketTime(Math.floor(Date.now() / 1000), timeframe);

  if (lastCandle && bucketTime < lastCandle.time) {
    return candles;
  }

  if (lastCandle && bucketTime > lastCandle.time + bucketSeconds) {
    return candles;
  }

  if (bucketTime > nowBucketTime + bucketSeconds) {
    return candles;
  }

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
