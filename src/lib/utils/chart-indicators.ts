import type { ChartCandle, ChartIndicatorPoint } from "@/types/eodhd";

export type VwapSource = "open" | "high" | "low" | "close" | "hl2" | "hlc3" | "ohlc4";
export type VwapAnchorPeriod = "session" | "week" | "month" | "quarter" | "year" | "decade" | "century";
export type VwapBandMode = "standard-deviation" | "percentage";

export type VwapBandSettings = {
  visible: boolean;
  multiplier: number;
};

export type VwapCalculationSettings = {
  source: VwapSource;
  anchorPeriod: VwapAnchorPeriod;
  bandMode: VwapBandMode;
  bands: [VwapBandSettings, VwapBandSettings, VwapBandSettings];
};

export type VwapPoint = {
  time: number;
  value: number;
  source: number;
  cumulativeVolume: number;
  cumulativePriceVolume: number;
  standardDeviation: number | null;
  anchorId: string;
  upperBands: Array<number | null>;
  lowerBands: Array<number | null>;
};

export const DEFAULT_VWAP_CALCULATION: VwapCalculationSettings = {
  source: "hlc3",
  anchorPeriod: "session",
  bandMode: "standard-deviation",
  bands: [
    { visible: true, multiplier: 1 },
    { visible: false, multiplier: 2 },
    { visible: false, multiplier: 3 },
  ],
};

export function getVwapSourcePrice(candle: ChartCandle, source: VwapSource) {
  switch (source) {
    case "open": return candle.open;
    case "high": return candle.high;
    case "low": return candle.low;
    case "close": return candle.close;
    case "hl2": return (candle.high + candle.low) / 2;
    case "ohlc4": return (candle.open + candle.high + candle.low + candle.close) / 4;
    case "hlc3": return (candle.high + candle.low + candle.close) / 3;
  }
}

export function getVwapAnchorId(timestamp: number, anchor: VwapAnchorPeriod) {
  const date = new Date(timestamp * 1000);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();

  switch (anchor) {
    case "session":
      return `${year}-${String(month + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
    case "week": {
      const day = date.getUTCDay() || 7;
      const monday = new Date(Date.UTC(year, month, date.getUTCDate() - day + 1));
      return `${monday.getUTCFullYear()}-W${String(Math.ceil((((monday.getTime() - Date.UTC(monday.getUTCFullYear(), 0, 1)) / 86400000) + 1) / 7)).padStart(2, "0")}`;
    }
    case "month": return `${year}-${String(month + 1).padStart(2, "0")}`;
    case "quarter": return `${year}-Q${Math.floor(month / 3) + 1}`;
    case "year": return String(year);
    case "decade": return `${Math.floor(year / 10) * 10}s`;
    case "century": return `${Math.floor(year / 100) * 100}s`;
  }
}

export function calculateVwap(
  candles: ChartCandle[],
  settings: VwapCalculationSettings = DEFAULT_VWAP_CALCULATION,
): VwapPoint[] {
  const ordered = candles
    .filter((candle) => Number.isFinite(candle.time) && Number.isFinite(candle.open) && Number.isFinite(candle.high) && Number.isFinite(candle.low) && Number.isFinite(candle.close) && Number.isFinite(candle.volume) && candle.volume >= 0)
    .slice()
    .sort((left, right) => left.time - right.time)
    .filter((candle, index, all) => index === 0 || candle.time !== all[index - 1].time);

  const points: VwapPoint[] = [];
  let anchorId: string | null = null;
  let cumulativeVolume = 0;
  let cumulativePriceVolume = 0;
  let cumulativeSquaredPriceVolume = 0;
  let cumulativeSource = 0;
  let cumulativeSquaredSource = 0;
  let sourceCount = 0;

  for (const candle of ordered) {
    const nextAnchorId = getVwapAnchorId(candle.time, settings.anchorPeriod);
    if (nextAnchorId !== anchorId) {
      anchorId = nextAnchorId;
      cumulativeVolume = 0;
      cumulativePriceVolume = 0;
      cumulativeSquaredPriceVolume = 0;
      cumulativeSource = 0;
      cumulativeSquaredSource = 0;
      sourceCount = 0;
    }

    const source = getVwapSourcePrice(candle, settings.source);
    if (!Number.isFinite(source)) continue;

    cumulativeSource += source;
    cumulativeSquaredSource += source * source;
    sourceCount += 1;

    if (candle.volume > 0) {
      cumulativeVolume += candle.volume;
      cumulativePriceVolume += source * candle.volume;
      cumulativeSquaredPriceVolume += source * source * candle.volume;
    }

    if (cumulativeVolume <= 0) {
      // Forex feeds can omit volume. Keep the overlay and its bands visible by
      // using the unweighted source-price dispersion until volume is available.
      const value = sourceCount > 0 ? cumulativeSource / sourceCount : source;
      const variance = sourceCount > 0
        ? Math.max(cumulativeSquaredSource / sourceCount - value * value, 0)
        : 0;
      const standardDeviation = Math.sqrt(variance);
      const upperBands = settings.bands.map((band) => {
        if (!band.visible) return null;
        const distance = settings.bandMode === "percentage"
          ? value * (Math.max(0, Math.min(1000, band.multiplier)) / 100)
          : standardDeviation * Math.max(0, Math.min(1000, band.multiplier));
        return value + distance;
      });
      const lowerBands = settings.bands.map((band) => {
        if (!band.visible) return null;
        const distance = settings.bandMode === "percentage"
          ? value * (Math.max(0, Math.min(1000, band.multiplier)) / 100)
          : standardDeviation * Math.max(0, Math.min(1000, band.multiplier));
        return value - distance;
      });
      points.push({
        time: candle.time,
        value,
        source,
        cumulativeVolume: 0,
        cumulativePriceVolume: 0,
        standardDeviation,
        anchorId,
        upperBands,
        lowerBands,
      });
      continue;
    }

    const value = cumulativePriceVolume / cumulativeVolume;
    const variance = Math.max(cumulativeSquaredPriceVolume / cumulativeVolume - value * value, 0);
    const standardDeviation = Math.sqrt(variance);
    const upperBands = settings.bands.map((band) => {
      if (!band.visible) return null;
      const distance = settings.bandMode === "percentage"
        ? value * (Math.max(0, Math.min(1000, band.multiplier)) / 100)
        : standardDeviation * Math.max(0, Math.min(1000, band.multiplier));
      return value + distance;
    });
    const lowerBands = settings.bands.map((band) => {
      if (!band.visible) return null;
      const distance = settings.bandMode === "percentage"
        ? value * (Math.max(0, Math.min(1000, band.multiplier)) / 100)
        : standardDeviation * Math.max(0, Math.min(1000, band.multiplier));
      return value - distance;
    });

    points.push({
      time: candle.time,
      value,
      source,
      cumulativeVolume,
      cumulativePriceVolume,
      standardDeviation,
      anchorId,
      upperBands,
      lowerBands,
    });
  }

  return points;
}

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
  let sessionKey: string | null = null;

  return candles.map((candle) => {
    const nextSessionKey = new Date(candle.time * 1000).toISOString().slice(0, 10);
    if (sessionKey !== nextSessionKey) {
      sessionKey = nextSessionKey;
      cumulativeTypicalPriceVolume = 0;
      cumulativeVolume = 0;
    }

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
    // Start with the candles available so the indicator is visible even
    // when the chart has fewer bars than the selected period.
    const window = candles.slice(Math.max(0, index - period + 1), index + 1);
    let cumulativeTypicalPriceVolume = 0;
    let cumulativeVolume = 0;
    let typicalPriceTotal = 0;

    for (const candle of window) {
      const typicalPrice = (candle.high + candle.low + candle.close) / 3;
      typicalPriceTotal += typicalPrice;
      cumulativeTypicalPriceVolume += typicalPrice * candle.volume;
      cumulativeVolume += candle.volume;
    }

    // Some feeds (especially forex/EOD candles) provide zero tick volume.
    // Use the rolling typical-price mean in that case instead of returning
    // an empty series.
    result.push(
      cumulativeVolume > 0
        ? cumulativeTypicalPriceVolume / cumulativeVolume
        : window.length > 0
          ? typicalPriceTotal / window.length
          : null,
    );
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
