import type {
  FibonacciDrawing,
  FibonacciLabelSettings,
  FibonacciLevel,
} from "@/types/lightweight-trading-chart";

export const DEFAULT_FIBONACCI_LEVELS: FibonacciLevel[] = [
  [0, "#787B86"],
  [0.236, "#F23645"],
  [0.382, "#FF9800"],
  [0.5, "#4CAF50"],
  [0.618, "#089981"],
  [0.786, "#2962FF"],
  [1, "#787B86"],
].map(([ratio, color]) => ({
  id: `level-${String(ratio).replace(".", "")}`,
  ratio: ratio as number,
  visible: true,
  color: color as string,
  opacity: 1,
}));

export const FIBONACCI_EXTRA_RATIOS = [-0.618, -0.272, 1.272, 1.414, 1.618, 2, 2.618, 3.618, 4.236];

export function getEffectiveFibPrices(point1Price: number, point2Price: number, reverse: boolean) {
  return reverse
    ? { startPrice: point2Price, endPrice: point1Price }
    : { startPrice: point1Price, endPrice: point2Price };
}

export function calculateLinearFibPrice(startPrice: number, endPrice: number, ratio: number) {
  return startPrice + (endPrice - startPrice) * ratio;
}

export function calculateLogFibPrice(startPrice: number, endPrice: number, ratio: number) {
  if (startPrice <= 0 || endPrice <= 0) return null;
  const value = Math.exp(Math.log(startPrice) + (Math.log(endPrice) - Math.log(startPrice)) * ratio);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function calculateFibPrice(
  point1Price: number,
  point2Price: number,
  ratio: number,
  reverse: boolean,
  useLogScaleCalculation: boolean,
) {
  const { startPrice, endPrice } = getEffectiveFibPrices(point1Price, point2Price, reverse);
  if (useLogScaleCalculation) {
    const logPrice = calculateLogFibPrice(startPrice, endPrice, ratio);
    if (logPrice !== null) return logPrice;
  }
  return calculateLinearFibPrice(startPrice, endPrice, ratio);
}

export function formatFibRatio(ratio: number, display: FibonacciLabelSettings["ratioDisplay"]) {
  if (!Number.isFinite(ratio)) return "";
  return display === "percentage"
    ? `${Number((ratio * 100).toFixed(3)).toString()}%`
    : Number(ratio.toFixed(6)).toString();
}

export function formatFibonacciLevelLabel({
  ratio,
  price,
  settings,
  customText,
}: {
  ratio: number;
  price: number;
  settings: FibonacciLabelSettings;
  customText?: string;
}) {
  const parts: string[] = [];
  if (settings.showRatio) parts.push(formatFibRatio(ratio, settings.ratioDisplay));
  if (settings.showPrice && Number.isFinite(price)) parts.push(`(${price.toLocaleString("en-US", { maximumFractionDigits: 8 })})`);
  if (settings.showCustomText && customText?.trim()) parts.push(`· ${customText.trim()}`);
  return parts.join(" ");
}

export function validateFibRatio(value: number) {
  return Number.isFinite(value) && value >= -100 && value <= 100;
}

export function cloneFibonacciDrawing(drawing: FibonacciDrawing, offset: number): FibonacciDrawing {
  const now = Date.now();
  return {
    ...drawing,
    id: `fibonacci-${now}-${Math.random().toString(36).slice(2, 8)}`,
    points: drawing.points.map((point) => ({ ...point, time: point.time + offset })) as FibonacciDrawing["points"],
    levels: drawing.levels.map((level) => ({ ...level, id: `${level.id}-${now}-${Math.random().toString(36).slice(2, 6)}` })),
    updatedAt: now,
  };
}

