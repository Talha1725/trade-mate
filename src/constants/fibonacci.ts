import type { FibonacciLevel } from "@/types/lightweight-trading-chart";

export const FIBONACCI_DEFAULT_LEVELS = [
  [0, "#787B86"],
  [0.236, "#F23645"],
  [0.382, "#FF9800"],
  [0.5, "#4CAF50"],
  [0.618, "#089981"],
  [0.786, "#2962FF"],
  [1, "#787B86"],
] as const;

export const DEFAULT_FIBONACCI_LEVELS: FibonacciLevel[] = FIBONACCI_DEFAULT_LEVELS.map(([ratio, color]) => ({
  id: `level-${String(ratio).replace(".", "")}`,
  ratio,
  visible: true,
  color,
  opacity: 1,
}));

export const FIBONACCI_EXTRA_RATIOS = [-0.618, -0.272, 1.272, 1.414, 1.618, 2, 2.618, 3.618, 4.236];
