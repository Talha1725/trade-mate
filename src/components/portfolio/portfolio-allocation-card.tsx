"use client";

import Image from "next/image";
import { Cell, Pie, PieChart } from "recharts";

import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import {
  mockPortfolioAllocationItems,
  PORTFOLIO_ALLOCATION_BACKGROUND_IMAGE,
} from "@/lib/mock-data/portfolio-allocation";
import { cn } from "@/lib/utils";
import type {
  PortfolioAllocationCardProps,
  PortfolioAllocationItem,
} from "@/types/portfolio-allocation";

function formatAllocationValue(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

function AllocationLegendDot({ color }: { color: string }) {
  return (
    <span className="relative flex size-4 shrink-0 items-center justify-center">
      <span
        className="absolute size-5 rounded-full opacity-25 animate-pulse"
        style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
      />
      <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
    </span>
  );
}

function AllocationLegendRow({ item }: { item: PortfolioAllocationItem }) {
  return (
    <>
      <div className="flex items-center gap-x-2 min-w-0">
        <AllocationLegendDot color={item.color} />
        <span className="font-medium text-start truncate" title={item.label}>{item.label}</span>
      </div>

      <div className="text-white/80 text-right pl-2">{item.percent}%</div>
      <div className="text-right text-white tabular-nums pl-3">
        {formatAllocationValue(item.value)}
      </div>
    </>
  );
}

function buildChartConfig(items: PortfolioAllocationItem[]) {
  return items.reduce<ChartConfig>((config, item) => {
    config[item.id] = {
      label: item.label,
      color: item.color,
    };
    return config;
  }, {});
}

export function PortfolioAllocationCard({
  title = "Allocation",
  items = mockPortfolioAllocationItems,
  backgroundImageSrc = PORTFOLIO_ALLOCATION_BACKGROUND_IMAGE,
  className,
}: PortfolioAllocationCardProps) {
  const chartConfig = buildChartConfig(items);

  return (
    <article
      className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-[20px] border border-white/20 bg-white/5 p-4 md:p-6",
        className,
      )}
    >
      <Image
        src={backgroundImageSrc}
        alt=""
        width={320}
        height={220}
        unoptimized
        className="pointer-events-none absolute bottom-0 right-0 h-auto w-full object-contain opacity-80"
      />

      <h3 className="relative z-10 text-base font-semibold text-white md:text-lg">{title}</h3>

      <div className="relative z-10 mt-4 flex flex-1 flex-col gap-5 min-[1700px]:flex-row lg:items-center">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square h-[233px] min-h-[233px] w-[233px] min-w-[233px] shrink-0 rotate-160 lg:mx-0"
          initialDimension={{ width: 233, height: 233 }}
        >
          <PieChart width={233} height={233}>
            <Pie
              data={items}
              dataKey="value"
              nameKey="label"
              innerRadius={50}
              outerRadius={90}
              paddingAngle={0}
              strokeWidth={0}
              cornerRadius={0}
              isAnimationActive={false}
            >
              {items.map((item) => (
                <Cell key={item.id} fill={item.color} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>

        <div className="flex-1 rounded-[10px] border border-white/20 bg-black/10 p-5 backdrop-blur-[2px]">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-y-4.5 text-sm">
            {items.map((item) => (
              <AllocationLegendRow key={item.id} item={item} />
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
