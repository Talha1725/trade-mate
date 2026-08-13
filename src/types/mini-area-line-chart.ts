export type MiniAreaLineChartPalette = "profit" | "loss";

export type MiniAreaLineChartProps = {
  values: number[];
  className?: string;
  strokeId?: string;
  fromZero?: boolean;
  minValue?: number;
  maxValue?: number;
  palette?: MiniAreaLineChartPalette;
  showEndDot?: boolean;
};
