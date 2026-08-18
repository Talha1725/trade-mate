"use client";

import { useState } from "react";
import { IoArrowDownSharp, IoArrowUpSharp } from "react-icons/io5";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";

import { ResponsiveTableScroll } from "@/components/shared/responsive-table-scroll";
import { TradingSymbolCell } from "@/components/shared/trading-symbol-cell";
import { formatTradingPrice } from "@/components/shared/trading-table-cells";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { mockRecentTrades } from "@/lib/mock-data/orders-recent-trades";
import { mockStrategyPerformanceRows } from "@/lib/mock-data/strategy-performance";
import { cn } from "@/lib/utils";
import type {
  RecentTradeRow,
  RecentTradesTableProps,
} from "@/types/orders-recent-trades";
import type { StrategyPerformanceRow } from "@/types/strategy-performance";
import { SortableColumnHeader } from "@/components/sortable-column-header";

function formatUsdPrice(value: number, symbol?: string) {
  return `$${formatTradingPrice(value, symbol)}`;
}

function formatSignedCurrency(value: number) {
  const prefix = value >= 0 ? "+" : "-";
  return `${prefix}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatProfitFactor(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0.00";
  }

  return value.toFixed(2);
}

function formatTradeSize(value: number) {
  return value.toFixed(4);
}

function LiveTapeBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-medium text-white">
      <span className="size-2 animate-pulse rounded-full bg-primary shadow-[0_0_12px_rgba(34,224,162,0.9)]" />
      {label}
    </span>
  );
}

function PriceCell({ trade }: { trade: RecentTradeRow }) {
  const isUp = trade.direction === "up";
  const Icon = isUp ? IoArrowUpSharp : IoArrowDownSharp;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-medium",
        isUp ? "text-primary" : "text-destructive",
      )}
    >
      <span className="min-w-[80px] text-sm font-medium">
        {formatUsdPrice(trade.price, trade.symbol)}
      </span>
      <Icon className="size-3.5" />
    </span>
  );
}

const strategyPerformanceColumns: ColumnDef<StrategyPerformanceRow>[] = [
  {
    accessorKey: "symbol",
    header: ({ column }) => (
      <SortableColumnHeader column={column} label="Symbol" className="justify-start" />
    ),
    cell: ({ row }) => <TradingSymbolCell symbol={row.original.symbol} />,
  },
  {
    accessorKey: "price",
    header: ({ column }) => (
      <SortableColumnHeader column={column} label="Price" className="justify-center" />
    ),
    cell: ({ row }) => {
      const pnlTone = row.original.pnlTone ?? "muted";
      return (
        <span
          className={cn(
            "text-sm whitespace-normal",
            pnlTone === "positive"
              ? "font-medium text-primary"
              : pnlTone === "negative"
                ? "font-medium text-destructive"
                : "text-white",
          )}
        >
          {formatUsdPrice(row.original.price, row.original.symbol)}
        </span>
      );
    },
  },
  {
    accessorKey: "pnl",
    header: ({ column }) => (
      <SortableColumnHeader column={column} label="P&L" className="justify-center" />
    ),
    cell: ({ row }) => {
      const pnlTone = row.original.pnlTone ?? "muted";
      return (
        <span
          className={cn(
            "text-sm whitespace-normal",
            pnlTone === "positive"
              ? "font-medium text-primary"
              : pnlTone === "negative"
                ? "font-medium text-destructive"
                : "text-white",
          )}
        >
          {formatSignedCurrency(row.original.pnl)}
        </span>
      );
    },
  },
  {
    accessorKey: "winRate",
    header: ({ column }) => (
      <SortableColumnHeader column={column} label="Win Rate" className="justify-center" />
    ),
    cell: ({ row }) => (
      <span className="text-sm whitespace-normal text-white">
        {`${row.original.winRate.toFixed(2)}%`}
      </span>
    ),
  },
  {
    accessorKey: "profitFactor",
    header: ({ column }) => (
      <SortableColumnHeader column={column} label="Profit Factor" className="justify-end" />
    ),
    cell: ({ row }) => (
      <span className="text-right text-sm font-medium whitespace-normal text-white/60">
        {formatProfitFactor(row.original.profitFactor)}
      </span>
    ),
  },
];

function StrategyPerformanceTableContent({
  strategies,
}: {
  strategies: StrategyPerformanceRow[];
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const table = useReactTable({
    data: strategies,
    columns: strategyPerformanceColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <Table className="w-full min-w-[760px] table-fixed">
      <TableHeader variant="gradient">
        <TableRow className="hover:bg-transparent">
          {table.getHeaderGroups()[0].headers.map((header) => (
            <TableHead
              key={header.id}
              className={cn(
                "h-11 px-2 text-xs font-medium whitespace-normal text-white/60 sm:px-2.5 sm:text-sm",
                header.column.id === "symbol"
                  ? "text-left"
                  : header.column.id === "pf"
                    ? "text-right"
                    : "text-center",
              )}
            >
              {header.isPlaceholder
                ? null
                : flexRender(header.column.columnDef.header, header.getContext())}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>

      <TableBody>
        {table.getRowModel().rows.length > 0 ? (
          table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              className="border-0 hover:bg-white/5 data-[state=selected]:bg-white/5"
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  className={cn(
                    "px-2 py-3 text-xs whitespace-normal sm:px-2.5 sm:text-sm",
                    cell.column.id === "symbol"
                      ? "text-left"
                      : cell.column.id === "pf"
                        ? "text-right"
                        : "text-center",
                  )}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : (
          <TableRow className="border-0 hover:bg-transparent">
            <TableCell colSpan={5} className="px-4 py-10 text-center text-sm text-white/50">
              Strategy performance is not available.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

function RecentTradesTableContent({
  trades,
}: {
  trades: RecentTradeRow[];
}) {
  return (
    <Table className="min-w-[640px]">
      <TableHeader variant="gradient">
        <TableRow className="hover:bg-transparent">
          <TableHead className="h-11 px-4 text-sm font-medium text-white/60">
            Symbol
          </TableHead>
          <TableHead className="h-11 px-4 text-sm font-medium text-white/60">
            Price
          </TableHead>
          <TableHead className="h-11 px-4 text-center text-sm font-medium text-white/60">
            Qty
          </TableHead>
          <TableHead className="h-11 px-4 text-right text-sm font-medium text-white/60">
            Time
          </TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {trades.length > 0 ? (
          trades.map((trade) => (
            <TableRow
              key={trade.id}
              className="border-0 hover:bg-white/5 data-[state=selected]:bg-white/5"
            >
              <TableCell className="px-4 py-3">
                <TradingSymbolCell symbol={trade.symbol} />
              </TableCell>
              <TableCell className="px-4 py-3">
                <PriceCell trade={trade} />
              </TableCell>
              <TableCell className="px-4 py-3 text-center text-sm text-white/60">
                {formatTradeSize(trade.sizeBtc)}
              </TableCell>
              <TableCell className="px-4 py-3 text-right text-sm text-white/60">
                {trade.time}
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow className="border-0 hover:bg-transparent">
            <TableCell colSpan={4} className="px-4 py-10 text-center text-sm text-white/50">
              Recent trades are not available.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

export function RecentTradesTable({
  variant = "recent-trades",
  title,
  liveTapeLabel = "Illustrative Tape",
  showHeaderBadge,
  trades = mockRecentTrades,
  strategies = mockStrategyPerformanceRows,
  className,
}: RecentTradesTableProps) {
  const isStrategyPerformance = variant === "strategy-performance";
  const resolvedTitle =
    title ?? (isStrategyPerformance ? "Strategy Performance" : "Recent Trades");
  const shouldShowHeaderBadge = showHeaderBadge ?? !isStrategyPerformance;
  const sectionClassName = cn(
    "min-w-0 overflow-hidden rounded-[20px] border border-white/20 bg-white/5 p-4 md:p-6",
    isStrategyPerformance && "flex h-full min-h-0 flex-col",
    className,
  );

  return (
    <section className={sectionClassName}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-white md:text-lg">
          {resolvedTitle}
        </h3>
        {shouldShowHeaderBadge ? <LiveTapeBadge label={liveTapeLabel} /> : null}
      </div>

      <ResponsiveTableScroll
        className={cn(
          isStrategyPerformance && "flex-1 min-h-0 overflow-auto",
          isStrategyPerformance &&
            "**:data-[slot=table-container]:overflow-x-auto",
        )}
      >
        {isStrategyPerformance ? (
          <StrategyPerformanceTableContent strategies={strategies} />
        ) : (
          <RecentTradesTableContent trades={trades} />
        )}
      </ResponsiveTableScroll>
    </section>
  );
}
