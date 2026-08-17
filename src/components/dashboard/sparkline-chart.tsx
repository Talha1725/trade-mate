"use client";

import { MiniAreaLineChart } from "@/components/dashboard/mini-area-line-chart";
import { cn } from "@/lib/utils";
import type { SparklineChartProps } from "@/types/sparkline-chart";

export function SparklineChart({
  data,
  className,
  showEndDot = true,
  palette,
  fromZero = false,
  minValue,
  maxValue,
}: SparklineChartProps) {
  const values = data.map((point) => point.value);

  return (
    <div className={cn("relative h-full w-full", className)}>
      <MiniAreaLineChart
        values={values}
        showEndDot={showEndDot}
        palette={palette}
        fromZero={fromZero}
        minValue={minValue}
        maxValue={maxValue}
        className="h-full w-full"
      />
    </div>
  );
}
