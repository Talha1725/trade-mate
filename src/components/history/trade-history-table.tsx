"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import { ClockIcon } from "lucide-react";
import { PiDownloadFill } from "react-icons/pi";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";

import { TradingSymbolCell } from "@/components/shared/trading-symbol-cell";
import { ResponsiveTableScroll } from "@/components/shared/responsive-table-scroll";
import {
  formatTradingPrice,
  formatTradingQty,
  TRADING_TABLE_ROW_CLASS,
  TradingOrderStatusBadge,
  TradingPnlValue,
  TradingSideBadge,
} from "@/components/shared/trading-table-cells";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SortableColumnHeader } from "@/components/sortable-column-header";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { downloadTextFile } from "@/lib/utils/download";
import { mockTrades } from "@/lib/mock-data/trades";
import { SIDEBAR_ICONS } from "@/lib/mock-data/sidebar-icons";
import { cn } from "@/lib/utils";
import type { TradeHistoryTableProps } from "@/types/trade-history";
import type { Trade } from "@/types/trade";

function formatHistoryDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

function formatTradeDateTimes(trade: Trade) {
  return {
    opened: formatHistoryDateTime(trade.openedAt ?? trade.time),
    closed: formatHistoryDateTime(trade.closedAt),
  };
}

function HeaderStatPill({
  icon,
  label,
}: {
  icon: ReactNode;
  label: string;
}) {
  return (
    <div className="inline-flex items-center gap-2.5 rounded-full border border-white/5 bg-linear-to-b from-white/7 to-white/3  px-4 py-2 text-sm font-medium text-white/60">
      {icon}
      <span className="text-white">{label}</span>
    </div>
  );
}

function TradeHistoryRowCells({ trade }: { trade: Trade }) {
  const isClosed = !trade.status || trade.status === "Closed";
  const dates = formatTradeDateTimes(trade);

  return (
    <TableRow className={TRADING_TABLE_ROW_CLASS}>
      <TableCell className="px-4 py-2 text-sm text-white/60">
        <span className="whitespace-nowrap">{dates.opened}</span>
      </TableCell>
      <TableCell className="px-4 py-2 text-sm text-white/60">
        <span className="whitespace-nowrap">{dates.closed}</span>
      </TableCell>
      <TableCell className="px-4 py-2">
        <TradingSymbolCell symbol={trade.symbol} />
      </TableCell>
      <TableCell className="px-4 py-2">
        <TradingSideBadge side={trade.type} />
      </TableCell>
      <TableCell className="px-4 py-2 text-sm font-medium text-white/60">
        {trade.executionType ?? "Market"}
      </TableCell>
      <TableCell className="px-4 py-2 text-sm font-medium text-white/60">
        {formatTradingQty(trade.vol)}
      </TableCell>
      <TableCell className="px-4 py-2 text-sm font-medium text-white/60">
        {formatTradingPrice(trade.openP, trade.symbol)}
      </TableCell>
      <TableCell className="px-4 py-2 text-sm font-medium text-white/60">
        {formatTradingPrice(trade.closeP, trade.symbol)}
      </TableCell>
      <TableCell className="px-4 py-2 text-sm font-medium text-white/60">
        {trade.takeProfit == null ? "-" : formatTradingPrice(trade.takeProfit, trade.symbol)}
      </TableCell>
      <TableCell className="px-4 py-2 text-sm font-medium text-white/60">
        {trade.stopLoss == null ? "-" : formatTradingPrice(trade.stopLoss, trade.symbol)}
      </TableCell>
      <TableCell className="px-4 py-2 text-sm font-medium text-white/60">
        {trade.exitStatus ? trade.exitStatus.charAt(0) + trade.exitStatus.slice(1).toLowerCase() : "-"}
      </TableCell>
      <TableCell className="px-4 py-2">
        <TradingPnlValue value={trade.profit} />
      </TableCell>
      <TableCell className="px-4 py-2">
        <TradingOrderStatusBadge
          label={isClosed ? "Closed" : "Open"}
          tone={isClosed ? "primary" : "orange"}
        />
      </TableCell>
    </TableRow>
  );
}

const tradeHistoryColumns: ColumnDef<Trade>[] = [
  {
    accessorKey: "time",
    header: ({ column }) => <SortableColumnHeader column={column} label="Open Date/Day" />,
    cell: ({ row }) => {
      const dates = formatTradeDateTimes(row.original);
      return <span className="whitespace-nowrap">{dates.opened}</span>;
    },
  },
  {
    id: "closedAt",
    accessorFn: (trade) => trade.closedAt ?? "",
    header: ({ column }) => <SortableColumnHeader column={column} label="Close Date/Day" />,
    cell: ({ row }) => <span className="whitespace-nowrap">{formatTradeDateTimes(row.original).closed}</span>,
  },
  {
    accessorKey: "symbol",
    header: ({ column }) => <SortableColumnHeader column={column} label="Symbol" />,
    cell: ({ row }) => <TradingSymbolCell symbol={row.original.symbol} />,
  },
  {
    accessorKey: "type",
    header: ({ column }) => <SortableColumnHeader column={column} label="Side" />,
    cell: ({ row }) => <TradingSideBadge side={row.original.type} />,
  },
  {
    accessorKey: "executionType",
    header: ({ column }) => <SortableColumnHeader column={column} label="Type" />,
    cell: ({ row }) => <span>{row.original.executionType ?? "Market"}</span>,
  },
  {
    accessorKey: "vol",
    header: ({ column }) => <SortableColumnHeader column={column} label="Qty" />,
    cell: ({ row }) => <span>{formatTradingQty(row.original.vol)}</span>,
  },
  {
    accessorKey: "openP",
    header: ({ column }) => <SortableColumnHeader column={column} label="Entry" />,
    cell: ({ row }) => <span>{formatTradingPrice(row.original.openP, row.original.symbol)}</span>,
  },
  {
    accessorKey: "closeP",
    header: ({ column }) => <SortableColumnHeader column={column} label="Exit" />,
    cell: ({ row }) => <span>{formatTradingPrice(row.original.closeP, row.original.symbol)}</span>,
  },
  {
    accessorKey: "takeProfit",
    header: ({ column }) => <SortableColumnHeader column={column} label="TP" />,
    cell: ({ row }) => row.original.takeProfit == null ? "-" : formatTradingPrice(row.original.takeProfit, row.original.symbol),
  },
  {
    accessorKey: "stopLoss",
    header: ({ column }) => <SortableColumnHeader column={column} label="SL" />,
    cell: ({ row }) => row.original.stopLoss == null ? "-" : formatTradingPrice(row.original.stopLoss, row.original.symbol),
  },
  {
    accessorKey: "exitStatus",
    header: ({ column }) => <SortableColumnHeader column={column} label="Exit Status" />,
    cell: ({ row }) => row.original.exitStatus ? row.original.exitStatus.charAt(0) + row.original.exitStatus.slice(1).toLowerCase() : "-",
  },
  {
    accessorKey: "profit",
    header: ({ column }) => <SortableColumnHeader column={column} label="P&L" />,
    cell: ({ row }) => <TradingPnlValue value={row.original.profit} />,
  },
  {
    accessorKey: "status",
    header: () => <span>Status</span>,
    cell: ({ row }) => {
      const isClosed = !row.original.status || row.original.status === "Closed";
      return (
        <TradingOrderStatusBadge
          label={isClosed ? "Closed" : "Open"}
          tone={isClosed ? "primary" : "orange"}
        />
      );
    },
  },
];

export function TradeHistoryTable({
  trades = mockTrades,
  isLoading = false,
  pagination,
  className,
}: TradeHistoryTableProps) {
  const stats = useMemo(() => {
    const total = pagination?.totalItems ?? trades.length;
    const winning = trades.filter((trade) => trade.profit > 0).length;
    const winRate = total > 0 ? Math.round((winning / total) * 100) : 0;

    return { total, winRate };
  }, [pagination?.totalItems, trades]);

  const [sorting, setSorting] = useState<SortingState>([]);
  const table = useReactTable({
    data: trades,
    columns: tradeHistoryColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const handleExport = useCallback(() => {
    if (trades.length === 0) {
      return;
    }

    const headers = [
      "Open Date/Time",
      "Close Date/Time",
      "Symbol",
      "Side",
      "Type",
      "Qty",
      "Entry",
      "Exit",
      "TP",
      "SL",
      "Exit Status",
      "P&L",
      "Status",
    ];
    const rows = trades.map((trade) => {
      const dates = formatTradeDateTimes(trade);
      return [
        dates.opened,
        dates.closed,
        trade.symbol,
        trade.type,
        trade.executionType ?? "Market",
        trade.vol,
        trade.openP,
        trade.closeP,
        trade.takeProfit ?? "",
        trade.stopLoss ?? "",
        trade.exitStatus ?? "",
        trade.profit.toFixed(2),
        trade.status ?? "Closed",
      ];
    });
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    downloadTextFile("trade-history.csv", csv, "text/csv");
  }, [trades]);

  return (
    <section
      className={cn(
        "min-w-0 overflow-hidden rounded-[20px] border border-white/20 bg-white/5 p-4 md:p-6",
        className,
      )}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-white md:text-lg">Trade History</h3>

        <div className="flex flex-wrap items-center gap-3">
          <HeaderStatPill
            icon={<ClockIcon className="size-4 text-white" />}
            label={`${stats.total} trades`}
          />
          <HeaderStatPill
            icon={
              <Image
                src={SIDEBAR_ICONS.cupStar}
                alt="win rate"
                width={16}
                height={16}
                className="text-white"
              />
            }
            label={`${stats.winRate}% win rate`}
          />
          {/* <button
            type="button"
            onClick={handleExport}
            className="inline-flex cursor-pointer items-center gap-2.5 rounded-[10px] border border-white/5 bg-linear-to-b from-white/7 to-white/3 px-4 py-2 text-sm font-medium text-white/60 transition-colors hover:bg-white/10"
          >
            <PiDownloadFill className="size-4 text-white" />
            <span className="text-white">Export</span>
          </button> */}
        </div>
      </div>

      {isLoading && trades.length === 0 ? (
        <div className="flex min-h-[240px] items-center justify-center rounded-lg border border-dashed border-white/10">
          <div className="flex flex-col items-center gap-3 text-sm text-white/50">
            <Spinner className="size-5" />
            <span>Loading trade history...</span>
          </div>
        </div>
      ) : trades.length === 0 ? (
        <div className="flex min-h-[240px] items-center justify-center rounded-lg border border-dashed border-white/10">
          <p className="text-sm text-white/40">No trades found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <ResponsiveTableScroll>
            <Table className="min-w-[1500px] table-fixed whitespace-nowrap">
              <colgroup>
                <col className="w-[180px]" />
                <col className="w-[180px]" />
                <col className="w-[140px]" />
                <col className="w-[100px]" />
                <col className="w-[100px]" />
                <col className="w-[90px]" />
                <col className="w-[120px]" />
                <col className="w-[120px]" />
                <col className="w-[120px]" />
                <col className="w-[120px]" />
                <col className="w-[130px]" />
                <col className="w-[110px]" />
                <col className="w-[100px]" />
              </colgroup>
              <TableHeader variant="gradient">
                <TableRow className="hover:bg-transparent">
                  {table.getHeaderGroups()[0]?.headers.map((header) => (
                    <TableHead key={header.id} className="h-11 px-4 text-sm font-medium text-white/60">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TradeHistoryRowCells key={row.original.id} trade={row.original} />
                ))}
              </TableBody>
            </Table>
          </ResponsiveTableScroll>

          {pagination ? (
            <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3 text-sm text-white/50">
                <p>
                  Showing {pagination.totalItems === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1}
                  -{pagination.totalItems === 0 ? 0 : Math.min(pagination.totalItems, pagination.page * pagination.pageSize)} of {pagination.totalItems}
                </p>

                {pagination.onPageSizeChange ? (
                  <div className="flex items-center gap-2">
                    <span>Rows per page</span>
                      <Select
                        value={String(pagination.pageSize)}
                        onValueChange={(value) => pagination.onPageSizeChange?.(Number(value))}
                      >
                      <SelectTrigger className="h-8 w-[88px] border-white/12 bg-[#111114] text-white shadow-none hover:bg-white/8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-white/12 bg-[#111114] text-white shadow-xl shadow-black/40">
                        {(pagination.pageSizeOptions ?? [10, 25, 50]).map((option) => (
                          <SelectItem key={option} value={String(option)} className="focus:bg-white/8">
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/12 bg-white/5 text-white/70 shadow-none hover:bg-white/10 hover:text-white disabled:bg-white/5 disabled:text-white/30"
                  onClick={() => pagination.onPageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  Previous
                </Button>
                <p className="text-sm text-white/50">
                  Page {pagination.page} of {pagination.pageCount || 1}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/12 bg-white/5 text-white/70 shadow-none hover:bg-white/10 hover:text-white disabled:bg-white/5 disabled:text-white/30"
                  onClick={() => pagination.onPageChange(pagination.page + 1)}
                  disabled={pagination.page >= (pagination.pageCount || 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
