import type { MiniAreaLineChartPalette } from "@/types/mini-area-line-chart";

export type SparklineDatum = {
  value: number;
};

export type SparklineChartProps = {
  data: SparklineDatum[];
  className?: string;
  showEndDot?: boolean;
  palette?: MiniAreaLineChartPalette;
  fromZero?: boolean;
  minValue?: number;
  maxValue?: number;
};
