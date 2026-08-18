"use client";

import { Star, Loader2 } from "lucide-react";

import { AssetIcon } from "@/components/shared/asset-icon";
import { SymbolSelector } from "@/components/symbol-selector";
import { formatTradingPrice } from "@/components/shared/trading-table-cells";
import { cn } from "@/lib/utils";
import {
  formatWatchlistChange,
  formatWatchlistValue,
} from "@/lib/utils/watchlist-formatters";
import { formatPercent, formatVolume } from "@/lib/utils/market-formatters";
import type {
  MarketWatchCardProps,
  MarketWatchItem,
  WatchlistRowProps,
} from "@/types/market-watch-card";

function WatchlistRow({
  item,
  isSelected,
  onSelect,
  onWatchlistToggle,
}: WatchlistRowProps) {
  const isPositive = item.changePercent >= 0;

  return (
    <div
      className={cn(
        "grid w-full grid-cols-[1.6fr_1fr_1fr_1fr_1fr_1fr_0.9fr_24px] items-center gap-3 rounded-[10px] border px-3 py-2 transition-colors",
        isSelected
          ? "border-primary/70"
          : "border-transparent hover:bg-white/5",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 cursor-pointer items-center gap-2.5 text-left"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <AssetIcon symbol={item.symbol} label={item.name} size={32} />
          <span className="min-w-0">
            <span className="block truncate tracking-tight text-sm font-medium text-white md:text-base">
              {item.symbol}
            </span>
            <span className="block truncate text-xs text-white/60 md:text-sm">{item.name}</span>
          </span>
        </span>

      </button>

      <span className="text-left text-sm font-medium text-white">
        {formatTradingPrice(item.price, item.symbol)}
      </span>
      <span className={cn("text-left text-sm font-medium", isPositive ? "text-primary" : "text-destructive")}>
        {formatWatchlistChange(item)}
      </span>
      <span className={cn("text-left text-sm font-medium", isPositive ? "text-primary" : "text-destructive")}>
        {formatPercent(item.changePercent)}
      </span>
      <span className="text-left text-sm text-white/80">{formatWatchlistValue(item.high, item.symbol)}</span>
      <span className="text-left text-sm text-white/80">{formatWatchlistValue(item.low, item.symbol)}</span>
      <span className="text-left text-sm text-white/80">{formatVolume(item.volume)}</span>

      <button
        type="button"
        aria-label={`Remove ${item.name} from watchlist`}
        className="shrink-0 cursor-pointer rounded-md p-1 text-primary transition-colors hover:bg-white/10"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onWatchlistToggle?.(item.id);
        }}
      >
        <Star className="size-4 fill-primary text-primary" />
      </button>
    </div>
  );
}



export function MarketWatchCard({
  items,
  selectedItemId,
  isLoading = false,
  onItemSelect,
  onWatchlistToggle,
  className,
}: MarketWatchCardProps) {
  const activeTab = "watchlist";

  return (
    <div
      className={cn(
        "flex flex-col rounded-[10px] border border-white/15 bg-[#0a0a0a] p-4 md:p-5",
        className,
      )}
    >
      <div className="no-scrollbar min-h-0 flex-1 overflow-auto">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr_1fr_1fr_0.9fr_24px] items-center gap-3 px-3 py-2 text-sm font-medium text-white/50">
            <div className="relative">
              <span className="border-b border-primary px-1 pb-1 text-left font-semibold text-primary">Watchlist</span>
            </div>
            <span className="text-left">Last Price</span>
            <span className="text-left">Change</span>
            <span className="text-left">% Change</span>
            <span className="text-left">High</span>
            <span className="text-left">Low</span>
            <span className="text-left">Volume</span>
            <span />
          </div>

          <div>
        {activeTab === "watchlist" ? (
          <div className="flex flex-col gap-2">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 rounded-[10px] border border-dashed border-white/15 px-4 py-6 text-sm text-white/50">
                <Loader2 className="size-4 animate-spin" />
                Loading watchlist...
              </div>
            ) : items.length > 0 ? (
              items.map((item) => (
                <WatchlistRow
                  key={item.id}
                  item={item}
                  isSelected={item.id === selectedItemId}
                  onSelect={() => onItemSelect?.(item.id)}
                  onWatchlistToggle={onWatchlistToggle}
                />
              ))
            ) : (
              <p className="rounded-[10px] border border-dashed border-white/15 px-4 py-6 text-center text-sm text-white/50">
                Star assets in the market dropdown to add them here.
              </p>
            )}
          </div>
        ) : null}

        {/* {activeTab === "signals" ? (
          <SignalsList signals={signals} />
        ) : null}

        {activeTab === "news" ? (
          <NewsList news={news} />
        ) : null} */}
          </div>
        </div>
      </div>
      <SymbolSelector
        triggerLabel="+ Add Symbol"
        className="mt-2 min-h-9 w-full shrink-0 justify-center rounded-[8px] border-white/10 bg-transparent text-sm font-normal text-white/80 hover:border-primary/50 hover:bg-transparent hover:text-primary"
      />
    </div>
  );
}
