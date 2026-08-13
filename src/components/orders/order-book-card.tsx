"use client";

import { useMemo, useState } from "react";
import { IoArrowDownSharp, IoArrowUpSharp } from "react-icons/io5";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatTradingPrice } from "@/components/shared/trading-table-cells";
import type {
  OrderBookCardProps,
  OrderBookRow,
  OrderBookSortOption,
} from "@/types/order-book";

const ASK_DEPTH_GRADIENT =
  "linear-gradient(90deg, rgba(239, 68, 68, 0) 0%, rgba(239, 68, 68, 0.4) 61.19%)";
const BID_DEPTH_GRADIENT =
  "linear-gradient(90deg, rgba(34, 224, 162, 0.4) 0%, rgba(34, 224, 162, 0.5) 49.88%, rgba(34, 224, 162, 0) 85%)";
const BID_DEPTH_GRADIENT_REVERSE =
  "linear-gradient(90deg, rgba(34, 224, 162, 0) 15%, rgba(34, 224, 162, 0.5) 50.12%, rgba(34, 224, 162, 0.4) 100%)";

function formatUsdPrice(value: number, symbol?: string, assetClass?: string | null) {
  return `$${formatTradingPrice(value, symbol, assetClass)}`;
}

function formatBtcAmount(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDollarAmount(value: number) {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatSpreadPercent(value: number) {
  return `${value.toFixed(4)}%`;
}

function sortOrderBookRows(
  rows: OrderBookRow[],
  sortBy: OrderBookSortOption,
  side: "ask" | "bid",
): OrderBookRow[] {
  if (sortBy === "default") {
    return rows;
  }

  const sorted = [...rows];

  if (sortBy === "price") {
    sorted.sort((left, right) => (side === "ask" ? left.price - right.price : right.price - left.price));
    return sorted;
  }

  sorted.sort((left, right) => right.size - left.size);
  return sorted;
}

function withCumulativeTotals(rows: OrderBookRow[]) {
  let cumulative = 0;
  const cumulativeTotals = rows.map((row) => {
    cumulative += row.size;
    return cumulative;
  });
  const maxTotal = cumulativeTotals[cumulativeTotals.length - 1] ?? 0;

  return rows.map((row, index) => {
    const total = cumulativeTotals[index] ?? 0;
    return {
      ...row,
      total,
      barPercent: maxTotal > 0 ? (total / maxTotal) * 100 : 0,
    };
  });
}

function AskDepthCell({
  size,
  depthPercent,
}: {
  size: number;
  depthPercent: number;
}) {
  return (
    <TableCell className="relative px-3 py-2.5">
      <div
        className="absolute inset-y-1 right-1/2 translate-x-1/2 rounded-none transition-[width,background-color,opacity] duration-200 ease-out will-change-[width]"
        style={{
          width: `${depthPercent}%`,
          background: ASK_DEPTH_GRADIENT,
        }}
      />
      <span className="relative z-10 block text-center text-sm text-white">
        {formatDollarAmount(size)}
      </span>
    </TableCell>
  );
}

function BidDepthCell({
  size,
  depthPercent,
  reverseGradient,
}: {
  size: number;
  depthPercent: number;
  reverseGradient?: boolean;
}) {
  return (
    <TableCell className="relative px-3 py-2.5">
      <div
        className="absolute inset-y-1 left-0 rounded-none transition-[width,background-color,opacity] duration-200 ease-out will-change-[width]"
        style={{
          width: `${depthPercent}%`,
          background: reverseGradient ? BID_DEPTH_GRADIENT_REVERSE : BID_DEPTH_GRADIENT,
        }}
      />
      <span className="relative z-10 block text-center text-sm text-white">
        {formatDollarAmount(size)}
      </span>
    </TableCell>
  );
}

function OrderBookTableHeader({ sizeLabel }: { sizeLabel: string }) {
  return (
    <TableHeader variant="gradient">
      <TableRow className="hover:bg-transparent">
        <TableHead className="h-11 px-3 text-sm font-medium text-white/60">
          Price (USD)
        </TableHead>
        <TableHead className="h-11 px-3 text-center text-sm font-medium text-white/60">
          Size ($)
        </TableHead>
        <TableHead className="h-11 px-3 text-right text-sm font-medium text-white/60">
          Total ({sizeLabel})
        </TableHead>
      </TableRow>
    </TableHeader>
  );
}

export function OrderBookCard({
  title = "Order Book",
  assetLabel = null,
  snapshot,
  sizeLabel = "BTC",
  assetClass = null,
  symbol = null,
  className,
}: OrderBookCardProps) {
  const [sortBy, setSortBy] = useState<OrderBookSortOption>("default");
  const resolvedTitle = assetLabel ? `${title} - ${assetLabel}` : title;
  const asks = useMemo(
    () => withCumulativeTotals(sortOrderBookRows(snapshot?.asks ?? [], sortBy, "ask")),
    [snapshot?.asks, sortBy],
  );
  const bids = useMemo(
    () => withCumulativeTotals(sortOrderBookRows(snapshot?.bids ?? [], sortBy, "bid")),
    [snapshot?.bids, sortBy],
  );
  const isMidPriceUp = snapshot?.midDirection === "up";
  if (!snapshot) {
    return (
      <section
        className={cn(
          "overflow-hidden rounded-[20px] border border-white/20 bg-white/5 p-4 md:p-6",
          className,
        )}
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-white md:text-lg">{resolvedTitle}</h3>
        </div>
        <div className="flex min-h-[260px] items-center justify-center rounded-[18px] border border-dashed border-white/15 bg-white/5 px-4 text-center text-sm text-white/45">
          Simulated market depth based on EODHD price data will appear here.
        </div>
      </section>
    );
  }

  return (
    <section
      className={cn(
        "overflow-hidden rounded-[20px] border border-white/20 bg-white/5 p-4 md:p-6",
        className,
      )}
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-white md:text-lg">{resolvedTitle}</h3>

        <Select
          value={sortBy}
          onValueChange={(value) => setSortBy(value as OrderBookSortOption)}
        >
          <SelectTrigger className="h-auto min-w-[88px] cursor-pointer gap-2 rounded-lg border-white/20 bg-[#0C0C0C] px-3 py-2 text-sm text-white shadow-none hover:bg-white/10 focus-visible:border-primary focus-visible:ring-primary/20">
            <span>Sort</span>
          </SelectTrigger>
          <SelectContent className="min-w-[120px] border-white/20 bg-[#0C0C0C] text-white">
            <SelectItem
              value="default"
              className="rounded-lg text-white focus:bg-white/10 focus:text-white data-highlighted:bg-white/10 data-highlighted:text-white data-selected:border data-selected:border-primary data-selected:bg-primary/10"
            >
              Default
            </SelectItem>
            <SelectItem
              value="price"
              className="rounded-lg text-white focus:bg-white/10 focus:text-white data-highlighted:bg-white/10 data-highlighted:text-white data-selected:border data-selected:border-primary data-selected:bg-primary/10"
            >
              Price
            </SelectItem>
            <SelectItem
              value="size"
              className="rounded-lg text-white focus:bg-white/10 focus:text-white data-highlighted:bg-white/10 data-highlighted:text-white data-selected:border data-selected:border-primary data-selected:bg-primary/10"
            >
              Size
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:gap-5">
        <Table>
          <OrderBookTableHeader sizeLabel={sizeLabel} />
          <TableBody>
            {asks.map((row) => {
              const notionalSize = row.size * row.price;
              return (
                <TableRow
                  key={row.id}
                  className="border-0 hover:bg-white/5 data-[state=selected]:bg-white/5"
                >
                  <TableCell className="px-3 py-2.5 text-sm font-medium text-[#EF4444]">
                    {formatUsdPrice(row.price, symbol ?? undefined, assetClass)}
                  </TableCell>
                  <AskDepthCell size={notionalSize} depthPercent={row.barPercent} />
                  <TableCell className="px-3 py-2.5 text-right text-sm text-white/60">
                    {formatBtcAmount(row.total)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <Table>
          <OrderBookTableHeader sizeLabel={sizeLabel} />
          <TableBody>
            {bids.map((row, index) => {
              const isLastRow = index === bids.length - 1;
              const notionalSize = row.size * row.price;

              return (
                <TableRow
                  key={row.id}
                  className="border-0 hover:bg-white/5 data-[state=selected]:bg-white/5"
                >
                <TableCell className="px-3 py-2.5 w-[140px]! text-sm font-medium text-primary">
                    {formatUsdPrice(row.price, symbol ?? undefined, assetClass)}
                  </TableCell>
                  <BidDepthCell
                    size={notionalSize}
                    depthPercent={row.barPercent}
                    reverseGradient={isLastRow}
                  />
                  <TableCell className="px-3 py-2.5 w-[140px]! text-right text-sm text-white/60">
                    {formatBtcAmount(row.total)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="mt-5 flex flex-col items-center gap-1 text-center">
        <div
          className={cn(
            "inline-flex items-center gap-2 text-2xl font-semibold md:text-[32px]",
            isMidPriceUp ? "text-primary" : "text-[#EF4444]",
          )}
        >
          <span>{formatUsdPrice(snapshot.midPrice, symbol ?? undefined, assetClass)}</span>
          {isMidPriceUp ? <IoArrowUpSharp className="size-6" /> : <IoArrowDownSharp className="size-6" />}
        </div>
        <p className="text-sm text-white/60">
          Spread {formatTradingPrice(snapshot.spread, symbol ?? undefined, assetClass)} (
          {formatSpreadPercent(snapshot.spreadPercent)})
        </p>
      </div>
    </section>
  );
}
