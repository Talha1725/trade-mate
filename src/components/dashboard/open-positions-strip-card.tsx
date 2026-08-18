"use client";

import * as React from "react";
import { ChevronDown, Settings2 } from "lucide-react";
import { AssetIcon } from "@/components/shared/asset-icon";
import { PlaceOrderDialog } from "@/components/place-order-dialog";
import { cn } from "@/lib/utils";
import type {
  OpenPositionStripItem,
  OpenPositionsStripCardProps,
  PositionCardProps,
} from "@/types/open-positions-strip";
import Link from "next/link";

function formatPnl(value: number) {
  const prefix = value >= 0 ? "+" : "-";
  return `${prefix}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPercent(value: number) {
  const prefix = value >= 0 ? "+" : "-";
  return `${prefix}${Math.abs(value).toFixed(2)}%`;
}

function formatPips(item: OpenPositionStripItem) {
  if (item.entryPrice == null || item.markPrice == null) return "—";

  // A pip is 0.0001 for standard FX pairs and 0.01 for JPY pairs.
  // Other instruments do not have a reliable FX-pip representation.
  const symbol = item.symbol.replace("/", "").toUpperCase();
  const isForex = /^[A-Z]{6}$/.test(symbol);
  if (!isForex) return "—";

  const pipSize = symbol.endsWith("JPY") ? 0.01 : 0.0001;
  const pips = Math.abs(item.markPrice - item.entryPrice) / pipSize;
  return `${pips.toFixed(1)} pips`;
}

function PositionCard({ item, onClosePosition, onModifyProtection }: PositionCardProps) {
  const isPositive = item.pnl >= 0;
  const isLong = item.side === "long";
  const [isClosing, setIsClosing] = React.useState(false);
  const [isModifyOpen, setIsModifyOpen] = React.useState(false);
  const formatPrice = (value: number | null | undefined) => value == null ? "—" : value.toFixed(item.symbol.includes("JPY") ? 3 : 5);

  const handleClose = async () => {
    if (!onClosePosition) return;
    setIsClosing(true);
    try {
      await onClosePosition(item.id);
    } finally {
      setIsClosing(false);
    }
  };

  return (
    <article className="relative overflow-hidden rounded-[12px] border border-white/10 bg-black/35 p-3.5 md:p-4">
      <div className="grid grid-cols-3 gap-2 md:gap-5 2xl:gap-10 text-xs">
        <div className="flex min-w-0 items-center gap-2.5">
          <AssetIcon symbol={item.symbol} size={28} className="shrink-0 object-contain" />
          <div className="min-w-0">
            <div className="truncate text-xs md:text-base font-semibold text-white">{item.symbol}</div>
            <div className={cn("text-[10px] md:text-xs font-medium", isLong ? "text-primary" : "text-destructive")}>
              {isLong ? "Buy" : "Sell"} {(item.lots ?? 0).toFixed(2)} Lots
            </div>
          </div>
        </div>
        <div className="min-w-0 text-left">
          <div className="text-sm md:text-lg font-medium text-white">{formatPrice(item.markPrice)}</div>
          <div className={cn("text-[10px] md:text-xs font-medium", isPositive ? "text-primary" : "text-destructive")}>{formatPercent(item.pnlPercent)}</div>
        </div>
        <div className="min-w-0 text-right">
          <div className={cn("text-sm md:text-lg font-medium", isPositive ? "text-primary" : "text-destructive")}>{formatPnl(item.pnl)}</div>
          <div className="text-[10px] md:text-xs text-white/60">{formatPips(item)}</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-5 xl:gap-10 text-xs">
        <div><div className="text-white/50">Open Price</div><div className="mt-1 text-sm md:text-base text-white">{formatPrice(item.entryPrice)}</div></div>
        <div><div className="text-white/50">SL</div><div className="mt-1 text-sm md:text-base text-white">{formatPrice(item.stopLoss)}</div></div>
        <div><div className="text-white/50">TP</div><div className="mt-1 text-sm md:text-base text-white">{formatPrice(item.takeProfit)}</div></div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" disabled={!onClosePosition || isClosing} onClick={() => void handleClose()} className="rounded-md border border-red-500/20 bg-red-500/15 px-2 py-2 text-xs font-medium text-red-300 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-50">{isClosing ? "Closing..." : "Close Trade"}</button>
        <button type="button" disabled={!onModifyProtection} onClick={() => setIsModifyOpen(true)} className="rounded-md border border-white/10 bg-white/5 px-2 py-2 text-xs font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50">Modify Trade</button>
        {/* <button type="button" aria-label={`More actions for ${item.symbol}`} className="flex items-center justify-center gap-1 rounded-md border border-white/10 bg-white/5 text-white/80 hover:bg-white/10"><Settings2 className="size-3.5" /><ChevronDown className="size-3" /></button> */}
      </div>

      {onModifyProtection ? (
        <PlaceOrderDialog
          open={isModifyOpen}
          onOpenChange={setIsModifyOpen}
          modification={{ positionId: item.id, symbol: item.symbol, side: isLong ? "Buy" : "Sell", lots: item.lots ?? 0, markPrice: item.markPrice ?? null, stopLoss: item.stopLoss ?? null, takeProfit: item.takeProfit ?? null, onSubmit: onModifyProtection }}
        />
      ) : null}
    </article>
  );
}

export function OpenPositionsStripCard({
  title = "Open Positions",
  items,
  className,
  onClosePosition,
  onModifyProtection,
}: OpenPositionsStripCardProps) {
  return (
    <section className={cn("min-h-0 overflow-y-auto rounded-[10px] border border-white/20 bg-white/5 p-4 md:p-5", className)}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base md:text-lg font-semibold text-white">
          {title} ({items.length})
        </h3>
        <Link href="/porfolio" type="button" className="border border-white/10 rounded-lg bg-white/5 px-3.5 py-1.5 hover:bg-white/10 transition-colors text-sm font-medium text-white cursor-pointer">
          View All
        </Link>
      </div>

      {items.length > 0 ? (
        <div className="grid gap-3">
          {items.map((item) => (
            <PositionCard key={item.id} item={item} onClosePosition={onClosePosition} onModifyProtection={onModifyProtection} />
          ))}
        </div>
      ) : (
        <div className="flex min-h-[150px] items-center justify-center rounded-[16px] border border-dashed border-white/10 bg-white/5 px-6 text-center">
          <p className="text-sm text-white/50">No open positions available.</p>
        </div>
      )}
    </section>
  );
}
