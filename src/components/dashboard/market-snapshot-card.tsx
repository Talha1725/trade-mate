"use client";

import { SparklineChart } from "@/components/dashboard/sparkline-chart";
import { formatTradingPrice } from "@/components/shared/trading-table-cells";
import { cn } from "@/lib/utils";
import type {
  MarketSnapshotBadge,
  MarketSnapshotCardProps,
  MarketSnapshotStat,
} from "@/types/market-snapshot";
import { Loader2 } from "lucide-react";
import Image from "next/image";

function formatPercent(value: number) {
  const prefix = value >= 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}%`;
}

function SnapshotBadge({ badge }: { badge: MarketSnapshotBadge }) {
  const Icon = badge.icon === "momentum" ? "/images/momentum.svg" : "/images/hearts.svg";

  return (
    <span className="inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/5 px-2.5 py-2 text-sm font-medium text-white">
      <Image src={Icon} alt={badge.label} className="" width={14} height={14} loading="eager" style={{
        width: "auto",
        height: "auto",
      }} />
      {badge.label}
    </span>
  );
}

function SnapshotStatRow({ stat }: { stat: MarketSnapshotStat }) {
  const valueClassName =
    stat.tone === "primary"
      ? "text-primary"
      : stat.tone === "success"
        ? "text-emerald-400"
        : stat.tone === "warning"
          ? "text-amber-400"
          : stat.tone === "destructive"
            ? "text-destructive"
            : "text-white";

  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-white/60 text-sm">{stat.label}</span>
      <span className={cn("font-semibold", valueClassName)}>
        {stat.value}
      </span>
    </div>
  );
}

export function MarketSnapshotCard({ data, symbol, assetClass, className }: MarketSnapshotCardProps) {
  if (!data) {
    return (
      <div
        className={cn(
          "card-green overflow-hidden rounded-[10px] border border-white/20 p-4 md:p-6",
          className,
        )}
      >
        <div className="flex min-h-[240px] items-center justify-center rounded-[8px] border border-dashed border-white/10 bg-white/5 px-6 text-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const snapshot = data;
  const isPositive = snapshot.changePercent >= 0;
  const sparklinePalette = isPositive ? "profit" : "loss";
  const sparklineValues = snapshot.sparkline.map((point) => point.value);
  const sparklineMin = Math.min(...sparklineValues);
  const sparklineMax = Math.max(...sparklineValues);
  const scaleFactor = assetClass === "FOREX" ? 0.00025 : 0.0005;
  const minimumVisibleRange = Math.max(Math.abs(snapshot.price) * scaleFactor, 0.00001);
  const visibleRange = Math.max(sparklineMax - sparklineMin, minimumVisibleRange);
  const sparklineCenter = (sparklineMin + sparklineMax) / 2;

  return (
    <div
      className={cn(
        "card-green overflow-hidden rounded-[10px] border border-white/20 p-4 md:p-6",
        className,
      )}
    >
      <div className="relative">
        <div className="pointer-events-none absolute right-0 bottom-0 h-[73px] w-[146px]">
          <SparklineChart
            data={snapshot.sparkline}
            palette={sparklinePalette}
            fromZero={false}
            minValue={sparklineCenter - visibleRange / 2}
            maxValue={sparklineCenter + visibleRange / 2}
          />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-2.5 text-primary">
            <span className="">
              <Image src="/images/globe.svg" alt="logo" className="" width={32} height={32} loading="eager"/>
            </span>
            <span className="text-sm font-regular">Market Snapshot</span>
          </div>

          <div className="mt-2.5 flex xl:flex-col 2xl:flex-row flex-wrap items-end xl:items-start 2xl:items-end gap-2">
            <span className="text-2xl font-medium tracking-tight text-white md:text-[32px]">
              {formatTradingPrice(snapshot.price, symbol ?? undefined, assetClass ?? null)}
            </span>
            <span
              className={cn(
                "pb-1 text-sm font-normal",
                isPositive ? "text-primary" : "text-destructive",
              )}
            >
              {formatPercent(snapshot.changePercent)}
            </span>
          </div>

          {snapshot.isLive ? (
            <div className="mt-1 flex items-center gap-2 text-sm md:text-base font-medium text-primary">
              <span className="size-2.5 animate-pulse rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />
              Live Market
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {snapshot.badges.map((badge) => (
          <SnapshotBadge key={badge.id} badge={badge} />
        ))}
      </div>

      <div className="mt-3.5 space-y-1 ">
        {snapshot.stats.map((stat) => (
          <SnapshotStatRow key={stat.id} stat={stat} />
        ))}
      </div>
    </div>
  );
}
