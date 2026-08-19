import type { MagnetMode } from "@/types/lightweight-trading-chart";
import type { MagnetCandle, MagnetSeries, MagnetSnapField, MagnetSnapResult, MagnetTimeScale } from "@/types/magnet-snap";

export function getEffectiveMagnetMode(configuredMode: MagnetMode, modifierActive: boolean): MagnetMode {
  if (!modifierActive) return configuredMode;
  return configuredMode === "off" ? "weak" : "off";
}

export function validateMagnetSettings(value: unknown): { mode: MagnetMode; weakThresholdPx: number; lastEnabledMode: "weak" | "strong" } {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const mode = input.mode === "weak" || input.mode === "strong" ? input.mode : "off";
  const lastEnabledMode = input.lastEnabledMode === "strong" ? "strong" : "weak";
  const weakThresholdPx = typeof input.weakThresholdPx === "number" && Number.isFinite(input.weakThresholdPx)
    ? Math.max(1, Math.min(100, input.weakThresholdPx))
    : 12;
  return { mode, weakThresholdPx, lastEnabledMode };
}

function nearestIndexByTime(candles: MagnetCandle[], time: number) {
  let low = 0;
  let high = candles.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (candles[middle].time === time) return middle;
    if (candles[middle].time < time) low = middle + 1;
    else high = middle - 1;
  }
  if (low >= candles.length) return candles.length - 1;
  if (high < 0) return 0;
  return Math.abs(candles[low].time - time) < Math.abs(candles[high].time - time) ? low : high;
}

export function findNearestCandle(
  pointerX: number,
  timeScale: MagnetTimeScale,
  candles: MagnetCandle[],
) {
  if (candles.length === 0) return null;
  const logical = timeScale.coordinateToLogical?.(pointerX);
  if (typeof logical === "number" && Number.isFinite(logical)) {
    const index = Math.max(0, Math.min(candles.length - 1, Math.round(logical)));
    return { candle: candles[index], logicalIndex: index };
  }
  const rawTime = timeScale.coordinateToTime(pointerX);
  if (typeof rawTime !== "number" || !Number.isFinite(rawTime)) return null;
  const index = nearestIndexByTime(candles, rawTime);
  return { candle: candles[index], logicalIndex: index };
}

export function resolveMagnetSnap({
  pointerX,
  pointerY,
  mode,
  temporaryToggleActive = false,
  thresholdPx,
  timeScale,
  series,
  candles,
}: {
  pointerX: number;
  pointerY: number;
  mode: MagnetMode;
  temporaryToggleActive?: boolean;
  thresholdPx: number;
  timeScale: MagnetTimeScale;
  series: MagnetSeries;
  candles: MagnetCandle[];
}): MagnetSnapResult {
  const pointerPrice = series.coordinateToPrice(pointerY);
  const rawTime = timeScale.coordinateToTime(pointerX);
  const resolvedTime = typeof rawTime === "number" && Number.isFinite(rawTime) ? rawTime : candles[0]?.time ?? 0;
  const fallback = { snapped: false, time: resolvedTime, price: pointerPrice ?? 0, logicalIndex: undefined, field: null, distancePx: null, candle: null } satisfies MagnetSnapResult;
  const effectiveMode = getEffectiveMagnetMode(mode, temporaryToggleActive);
  if (effectiveMode === "off" || pointerPrice === null || !Number.isFinite(pointerPrice)) return fallback;
  const nearest = findNearestCandle(pointerX, timeScale, candles);
  if (!nearest) return fallback;

  const priority: MagnetSnapField[] = ["high", "low", "close", "open"];
  const candidates = priority.map((field) => {
    const price = nearest.candle[field];
    const y = Number.isFinite(price) ? series.priceToCoordinate(price) : null;
    return y === null || !Number.isFinite(y) ? null : { field, price, y, distancePx: Math.abs(pointerY - y) };
  }).filter((candidate): candidate is { field: MagnetSnapField; price: number; y: number; distancePx: number } => candidate !== null);
  const closest = candidates.reduce<typeof candidates[number] | null>((best, candidate) => !best || candidate.distancePx < best.distancePx ? candidate : best, null);
  if (!closest || (effectiveMode === "weak" && closest.distancePx > thresholdPx)) return fallback;
  return {
    snapped: true,
    time: nearest.candle.time,
    price: closest.price,
    logicalIndex: nearest.logicalIndex,
    field: closest.field,
    distancePx: closest.distancePx,
    candle: nearest.candle,
  };
}
