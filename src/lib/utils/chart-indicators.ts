import type { ChartCandle, ChartIndicatorPoint } from "@/types/eodhd";

export function calculateEma(values: number[], period: number) {
  const result: Array<number | null> = [];
  const multiplier = 2 / (period + 1);
  let ema: number | null = null;

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];

    if (ema === null) {
      if (index < period - 1) {
        result.push(null);
        continue;
      }

      const seed = values.slice(0, period).reduce((sum, current) => sum + current, 0) / period;
      ema = seed;
      result.push(ema);
      continue;
    }

    ema = value * multiplier + ema * (1 - multiplier);
    result.push(ema);
  }

  return result;
}

export function calculateTypicalPrice(candles: ChartCandle[]) {
  return candles.map((candle) => (candle.high + candle.low + candle.close) / 3);
}

export function calculateEmaUpperEnvelope(candles: ChartCandle[], period: number) {
  const emaHighs = calculateEma(
    candles.map((candle) => candle.high),
    period,
  );

  return emaHighs.map((ema, index) => {
    if (ema === null) {
      return null;
    }

    return Math.max(ema, candles[index]?.high ?? ema);
  });
}

export function calculateCandleTrackLine(candles: ChartCandle[]) {
  return calculateTypicalPrice(candles);
}

export function calculateSessionVwap(candles: ChartCandle[]) {
  let cumulativeTypicalPriceVolume = 0;
  let cumulativeVolume = 0;

  return candles.map((candle) => {
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    cumulativeTypicalPriceVolume += typicalPrice * candle.volume;
    cumulativeVolume += candle.volume;

    if (cumulativeVolume <= 0) {
      return null;
    }

    return cumulativeTypicalPriceVolume / cumulativeVolume;
  });
}

export function calculateRollingVwap(candles: ChartCandle[], period = 20) {
  const result: Array<number | null> = [];

  for (let index = 0; index < candles.length; index += 1) {
    if (index < period - 1) {
      result.push(null);
      continue;
    }

    const window = candles.slice(index - period + 1, index + 1);
    let cumulativeTypicalPriceVolume = 0;
    let cumulativeVolume = 0;

    for (const candle of window) {
      const typicalPrice = (candle.high + candle.low + candle.close) / 3;
      cumulativeTypicalPriceVolume += typicalPrice * candle.volume;
      cumulativeVolume += candle.volume;
    }

    result.push(cumulativeVolume > 0 ? cumulativeTypicalPriceVolume / cumulativeVolume : null);
  }

  return result;
}

export function aggregateCandles(candles: ChartCandle[], bucketSeconds: number) {
  if (bucketSeconds <= 0 || candles.length === 0) {
    return candles;
  }

  const buckets = new Map<number, ChartCandle[]>();

  for (const candle of candles) {
    const bucketTime = Math.floor(candle.time / bucketSeconds) * bucketSeconds;
    const bucket = buckets.get(bucketTime) ?? [];
    bucket.push(candle);
    buckets.set(bucketTime, bucket);
  }

  return Array.from(buckets.entries())
    .sort(([left], [right]) => left - right)
    .map(([time, bucket]) => ({
      time,
      open: bucket[0].open,
      high: Math.max(...bucket.map((item) => item.high)),
      low: Math.min(...bucket.map((item) => item.low)),
      close: bucket[bucket.length - 1].close,
      volume: bucket.reduce((sum, item) => sum + item.volume, 0),
    }));
}

export function buildAlignedCompareSeries(
  primaryCandles: ChartCandle[],
  compareCandles: ChartCandle[],
): ChartIndicatorPoint[] {
  if (primaryCandles.length === 0 || compareCandles.length === 0) {
    return [];
  }

  const compareByTime = new Map(compareCandles.map((candle) => [candle.time, candle]));
  const timeAligned = primaryCandles.flatMap((candle) => {
    const compareCandle = compareByTime.get(candle.time);

    if (!compareCandle) {
      return [];
    }

    return [
      {
        time: candle.time,
        value: compareCandle.close,
      },
    ];
  });

  const minimumAlignedPoints = Math.min(primaryCandles.length, compareCandles.length) * 0.5;

  if (timeAligned.length >= minimumAlignedPoints) {
    return timeAligned;
  }

  const sharedLength = Math.min(primaryCandles.length, compareCandles.length);

  return Array.from({ length: sharedLength }, (_, index) => ({
    time: primaryCandles[index].time,
    value: compareCandles[index].close,
  }));
}

export function buildRebasedCompareSeries(
  primaryCandles: ChartCandle[],
  compareCandles: ChartCandle[],
): ChartIndicatorPoint[] {
  const aligned = buildAlignedCompareSeries(primaryCandles, compareCandles);

  if (aligned.length === 0) {
    return [];
  }

  const primaryByTime = new Map(primaryCandles.map((candle) => [candle.time, candle]));
  const firstPoint = aligned[0];
  const primaryAnchor = primaryByTime.get(firstPoint.time)?.close;
  const compareAnchor = firstPoint.value;

  if (!primaryAnchor || !compareAnchor) {
    return [];
  }

  return aligned.map((point) => ({
    time: point.time,
    value: primaryAnchor * (point.value / compareAnchor),
  }));
}

export function buildIndicatorSeries(
  candles: ChartCandle[],
  values: Array<number | null>,
): ChartIndicatorPoint[] {
  return candles.flatMap((candle, index) => {
    const value = values[index];

    if (value === null || Number.isNaN(value)) {
      return [];
    }

    return [{ time: candle.time, value }];
  });
}

export function normalizeOscillatorValues(values: number[], maxScale = 12) {
  const maxValue = Math.max(...values, 1);
  const scale = maxScale / maxValue;

  return values.map((value) => value * scale);
}

export function normalizeIndicatorPanelValues(values: Array<number | null>, maxScale = 12) {
  const numeric = values.filter((value): value is number => value !== null && Number.isFinite(value));

  if (numeric.length === 0) {
    return values.map(() => 0);
  }

  const min = Math.min(...numeric);
  const max = Math.max(...numeric);
  const range = max - min || 1;

  return values.map((value) => {
    if (value === null || !Number.isFinite(value)) {
      return 0;
    }

    return ((value - min) / range) * maxScale;
  });
}
