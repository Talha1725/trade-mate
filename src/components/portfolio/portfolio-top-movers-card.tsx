"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import { MARKET_WATCH_ICON_IMAGES } from "@/lib/mock-data/market-watch-card";
import {
  mockPortfolioTopMovers,
  PORTFOLIO_TOP_MOVERS_BACKGROUND_IMAGE,
} from "@/lib/mock-data/portfolio-top-movers";
import { cn } from "@/lib/utils";
import { formatSignedCurrency, formatSignedPercent } from "@/lib/utils/number-formatters";
import type {
  PortfolioTopMoverItem,
  PortfolioTopMoversCardProps,
  SortMode,
} from "@/types/portfolio-top-movers";
import type { MarketWatchIcon } from "@/types/market-watch-card";

function MoverIcon({ icon, symbol }: { icon: MarketWatchIcon; symbol: string }) {
  return (
    <span className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full">
      <Image
        src={MARKET_WATCH_ICON_IMAGES[icon]}
        alt={symbol}
        width={32}
        height={32}
        unoptimized
        className="object-contain"
      />
    </span>
  );
}

function MoverRow({ item }: { item: PortfolioTopMoverItem }) {
  const isPositive = item.changeAmount >= 0;

  return (
    <div className="grid grid-cols-3 items-center gap-3">
      <div className="flex items-center gap-2">
        <MoverIcon icon={item.icon} symbol={item.symbol} />
        <span className="text-sm font-medium text-white">{item.symbol}</span>
      </div>
      <span
        className={cn(
          "text-sm font-normal",
          isPositive ? "text-primary" : "text-destructive",
        )}
      >
        {formatSignedCurrency(item.changeAmount, "plus")}
      </span>
      <span
        className={cn(
          "md:min-w-[64px] text-sm font-normal",
          isPositive ? "text-primary" : "text-destructive",
        )}
      >
        {formatSignedPercent(item.changePercent, "plus")}
      </span>
    </div>
  );
}

export function PortfolioTopMoversCard({
  title = "Top Movers",
  items = mockPortfolioTopMovers,
  backgroundImageSrc = PORTFOLIO_TOP_MOVERS_BACKGROUND_IMAGE,
  className,
}: PortfolioTopMoversCardProps) {
  const [sortMode, setSortMode] = useState<SortMode>("percent");

  const sortedItems = useMemo(() => {
    return [...items].sort((left, right) => {
      if (sortMode === "amount") {
        return right.changeAmount - left.changeAmount;
      }

      return right.changePercent - left.changePercent;
    });
  }, [items, sortMode]);

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-[20px] border border-white/20 bg-white/5 p-4 md:p-6",
        className,
      )}
    >
      <Image
        src={backgroundImageSrc}
        alt=""
        width={219}
        height={192}
        unoptimized
        className="pointer-events-none absolute right-0 bottom-0 h-auto max-w-[219px] object-contain opacity-80"
      />

      <div className="relative z-10 mb-5 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-white md:text-lg">{title}</h3>
        <button
          type="button"
          onClick={() =>
            setSortMode((current) => (current === "percent" ? "amount" : "percent"))
          }
          className="cursor-pointer rounded-md border border-white/20 bg-white/5 px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
        >
          Sort
        </button>
      </div>

      <div className="relative z-10 space-y-4">
        {sortedItems.map((item) => (
          <MoverRow key={item.id} item={item} />
        ))}
      </div>
    </article>
  );
}
