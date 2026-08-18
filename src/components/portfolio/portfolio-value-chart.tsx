"use client";

import { useId, useMemo, useState } from "react";
import { PiDownloadFill } from "react-icons/pi";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { TRADING_TIMEFRAMES } from "@/constants/trading-timeframes";
import {
  getPortfolioValueYAxisTicks,
  mockPortfolioValueChartData,
} from "@/lib/mock-data/portfolio-value-chart";
import { formatPortfolioValueTimestamp } from "@/lib/utils/portfolio-chart";
import { cn } from "@/lib/utils";
import type { PortfolioValueChartProps } from "@/types/portfolio-value-chart";
import type { TradingTimeframe } from "@/types/trading-filter-bar";

const CHART_CONFIG = {
  value: {
    label: "Portfolio Value",
    color: "#0CE9A0",
  },
} satisfies ChartConfig;

function TimeframeButton({
  interval,
  isActive,
  onSelect,
}: {
  interval: TradingTimeframe;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "min-w-[40px] cursor-pointer rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
        isActive
          ? "border border-primary bg-linear-to-r from-dark-blue via-teal-blue to-dark-blue text-primary"
          : "text-white/60 hover:text-white/80",
      )}
    >
      {interval}
    </button>
  );
}

export function PortfolioValueChart({
  title = "Portfolio Value Over Time",
  dataByTimeframe = mockPortfolioValueChartData,
  defaultTimeframe = "1m",
  timeframes = TRADING_TIMEFRAMES,
  showExportButton = false,
  exportLabel = "Export Report",
  onExport,
  emptyStateMessage = "No portfolio value data available.",
  className,
}: PortfolioValueChartProps) {
  const gradientId = useId().replace(/:/g, "");
  const [timeframe, setTimeframe] = useState<TradingTimeframe>(defaultTimeframe);

  const chartData = useMemo(() => dataByTimeframe[timeframe] ?? [], [dataByTimeframe, timeframe]);
  const yAxis = useMemo(
    () => getPortfolioValueYAxisTicks(chartData.map((point) => point.value)),
    [chartData],
  );

  return (
    <article
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-[20px] border border-white/20 bg-white/5 p-4 md:p-6",
        className,
      )}
    >
      <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-white md:text-lg">{title}</h3>

        <div className="flex flex-wrap items-center gap-2 h-full">
          <div className="flex items-center gap-0.5">
            {timeframes.map((interval) => (
              <TimeframeButton
                key={interval}
                interval={interval}
                isActive={interval === timeframe}
                onSelect={() => setTimeframe(interval)}
              />
            ))}
          </div>

          {showExportButton ? (
            <button
              type="button"
              onClick={onExport}
              className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] border border-white/5 bg-white/5 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              <PiDownloadFill className="size-4" />
              {exportLabel}
            </button>
          ) : null}
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <ChartContainer
          config={CHART_CONFIG}
          initialDimension={{ width: 520, height: 240 }}
          className="relative aspect-auto h-full w-full [&_.recharts-cartesian-grid-horizontal_line]:stroke-white/10 [&_.recharts-cartesian-grid-vertical_line]:stroke-white/10"
        >
          {chartData.length > 0 ? (
            <AreaChart
              data={chartData}
              margin={{ top: 8, right: 12, left: 8, bottom: 16 }}
            >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0CE9A0" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#0CE9A0" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid vertical horizontal strokeOpacity={0.1} />

            <XAxis
              dataKey="timestamp"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(value) => formatPortfolioValueTimestamp(Number(value), timeframe)}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={12}
              tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }}
            />

            <YAxis
              domain={yAxis.domain}
              ticks={yAxis.ticks}
              width={56}
              tickLine={false}
              axisLine={false}
              tickMargin={6}
              tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }}
            />

            <Area
              type="monotone"
              dataKey="value"
              stroke="#0CE9A0"
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={{
                r: 3,
                fill: "#0CE9A0",
                stroke: "#0CE9A0",
                strokeWidth: 0,
              }}
              activeDot={{
                r: 4,
                fill: "#0CE9A0",
                stroke: "#108961",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="px-4 text-center text-sm text-white/60">{emptyStateMessage}</p>
          </div>
        )}
      </ChartContainer>
      </div>
    </article>
  );
}
