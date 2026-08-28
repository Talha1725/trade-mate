"use client";

import * as React from "react";
import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef, type SortingState } from "@tanstack/react-table";
import Image from "next/image";
import { IoIosTrendingDown, IoIosTrendingUp } from "react-icons/io";
import { TradingTableCard } from "@/components/shared/trading-table-card";
import { TableRowActionsMenu } from "@/components/shared/table-row-actions-menu";
import { SortableColumnHeader } from "@/components/sortable-column-header";
import { AssetIcon } from "@/components/shared/asset-icon";
import { formatTradingPrice } from "@/lib/utils/price-formatters";
import { cn } from "@/lib/utils";
import { formatNewYorkDateTime } from "@/lib/utils/date-time";
import { formatSignedCurrency, formatSignedPercent } from "@/lib/utils/number-formatters";
import type {
  PortfolioOpenPositionRisk,
  PortfolioOpenPositionRow,
  PortfolioOpenPositionsTableProps,
} from "@/types/portfolio-open-positions";
import type { MarketWatchIcon } from "@/types/market-watch-card";
import type { OpenPositionSide } from "@/types/open-positions-strip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function formatSize(value: number, unit: string) {
  const decimals = unit === "XRP" ? 4 : 4;
  return value.toFixed(decimals);
}

function formatOpenDate(value: string | null | undefined) {
  return formatNewYorkDateTime(value);
}

function SymbolCell({ icon, symbol }: { icon: MarketWatchIcon; symbol: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <AssetIcon symbol={symbol} size={24} className="shrink-0 object-contain" />
      <span className="font-medium text-white">{symbol}</span>
    </div>
  );
}

function SideBadge({ side }: { side: OpenPositionSide }) {
  const isLong = side === "long";
  const Icon = isLong ? IoIosTrendingUp : IoIosTrendingDown;

  return (
    <span className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 py-1 pr-2.5 pl-1 text-sm font-normal text-white">
      <span
        className={cn(
          "flex size-6 items-center justify-center rounded-full",
          isLong
            ? "bg-linear-to-b from-[#00EB6E] to-[#00853E]"
            : "bg-linear-to-b from-[#EF4444] to-[#980000]",
        )}
      >
        <Icon className="size-3 text-white" />
      </span>
      {isLong ? "Long" : "Short"}
    </span>
  );
}

function RiskBadge({ risk }: { risk: PortfolioOpenPositionRisk }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
        risk === "low" && "border-primary/20 bg-primary/5 text-primary",
        risk === "medium" && "border-orange/20 bg-orange/5 text-orange",
        risk === "high" && "border-destructive/20 bg-destructive/5 text-destructive",
      )}
    >
      {risk === "low" ? "Low" : risk === "medium" ? "Medium" : "High"}
    </span>
  );
}

function PnlValue({ value, className }: { value: number; className?: string }) {
  const isPositive = value > 0;

  return (
    <span className={cn("font-medium", isPositive ? "text-primary" : "text-destructive", className)}>
      {formatSignedCurrency(value, "minus")}
    </span>
  );
}

function PnlPercentValue({ value }: { value: number }) {
  const isPositive = value > 0;

  return (
    <span className={cn("font-medium", isPositive ? "text-primary" : "text-destructive")}>
      {formatSignedPercent(value, "minus")}
    </span>
  );
}

const riskOrder: Record<PortfolioOpenPositionRisk, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

export function PortfolioOpenPositionsTable({
  positions = [],
  onExport,
  onCloseAll,
  onCancel,
  onModifyProtection,
  isCloseAllLoading,
  className,
}: PortfolioOpenPositionsTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const columns = React.useMemo<ColumnDef<PortfolioOpenPositionRow>[]>(
    () => [
      {
        accessorKey: "symbol",
        header: ({ column }) => <SortableColumnHeader column={column} label="Symbol" />,
        cell: ({ row }) => (
          <SymbolCell icon={row.original.icon} symbol={row.original.symbol} />
        ),
      },
      {
        accessorKey: "openedAt",
        header: ({ column }) => <SortableColumnHeader column={column} label="Open Date/Day" className="min-w-[260px] justify-start text-left" />,
        cell: ({ row }) => <span className="inline-block min-w-[260px] whitespace-nowrap text-left text-sm font-medium text-white/60">{formatOpenDate(row.original.openedAt)}</span>,
      },
      {
        accessorKey: "side",
        header: ({ column }) => <SortableColumnHeader column={column} label="Side" />,
        cell: ({ row }) => <SideBadge side={row.original.side} />,
      },
      {
        accessorKey: "size",
        header: ({ column }) => <SortableColumnHeader column={column} label="Size" />,
        cell: ({ row }) => (
          <span className="font-medium text-white/60">
            {formatSize(row.original.size, row.original.sizeUnit)}
          </span>
        ),
      },
      {
        accessorKey: "avgEntry",
        header: ({ column }) => <SortableColumnHeader column={column} label="Entry" />,
          cell: ({ row }) => (
          <span className="font-medium text-white/60">
            {formatTradingPrice(row.original.avgEntry, row.original.symbol)}
          </span>
        ),
      },
      {
        accessorKey: "markPrice",
        header: ({ column }) => <SortableColumnHeader column={column} label="Mark Price" />,
          cell: ({ row }) => (
          <span className="font-medium text-white/60">
            {formatTradingPrice(row.original.markPrice, row.original.symbol)}
          </span>
        ),
      },
      {
        accessorKey: "takeProfit",
        header: ({ column }) => <SortableColumnHeader column={column} label="TP" />,
        cell: ({ row }) => (
          <span className="font-medium text-white/60">
            {row.original.takeProfit == null ? "-" : formatTradingPrice(row.original.takeProfit, row.original.symbol)}
          </span>
        ),
      },
      {
        accessorKey: "stopLoss",
        header: ({ column }) => <SortableColumnHeader column={column} label="SL" />,
        cell: ({ row }) => (
          <span className="font-medium text-white/60">
            {row.original.stopLoss == null ? "-" : formatTradingPrice(row.original.stopLoss, row.original.symbol)}
          </span>
        ),
      },
      // {
      //   accessorKey: "leverage",
      //   header: ({ column }) => <SortableColumnHeader column={column} label="Lev." />,
      //   cell: ({ row }) => (
      //     <span className="font-medium text-white/60">1:{row.original.leverage}</span>
      //   ),
      // },
      {
        accessorKey: "pnl",
        header: ({ column }) => <SortableColumnHeader column={column} label="P&L" />,
        cell: ({ row }) => <PnlValue value={row.original.pnl} />,
      },
      {
        accessorKey: "pnlPercent",
        header: ({ column }) => <SortableColumnHeader column={column} label="P&L %" />,
        cell: ({ row }) => <PnlPercentValue value={row.original.pnlPercent} />,
      },
      {
        accessorKey: "risk",
        header: ({ column }) => <SortableColumnHeader column={column} label="Risk" />,
        sortingFn: (rowA, rowB, columnId) => {
          const left = riskOrder[rowA.getValue(columnId) as PortfolioOpenPositionRisk];
          const right = riskOrder[rowB.getValue(columnId) as PortfolioOpenPositionRisk];
          return left - right;
        },
        cell: ({ row }) => <RiskBadge risk={row.original.risk} />,
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <TableRowActionsMenu
            symbol={row.original.symbol}
            side={row.original.side}
            positionId={row.original.id}
            lots={row.original.size}
            markPrice={row.original.markPrice}
            stopLoss={row.original.stopLoss}
            takeProfit={row.original.takeProfit}
            onModifyProtection={onModifyProtection}
            onCancel={() => onCancel?.(row.original.id)}
          />
        ),
      },
    ],
    [onCancel, onModifyProtection],
  );

  const table = useReactTable({
    data: positions,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <TradingTableCard
      title="Open Positions"
      onExport={onExport}
      onCloseAll={onCloseAll}
      isCloseAllLoading={isCloseAllLoading}
      className={className}
    >
      <Table className="min-w-[1500px] table-fixed">
        <colgroup>
          <col className="w-[130px]" />
          <col className="w-[200px]" />
          <col className="w-[110px]" />
          <col className="w-[100px]" />
          <col className="w-[130px]" />
          <col className="w-[130px]" />
          <col className="w-[120px]" />
          <col className="w-[120px]" />
          <col className="w-[110px]" />
          <col className="w-[110px]" />
          <col className="w-[110px]" />
          <col className="w-[130px]" />
        </colgroup>
        <TableHeader variant="gradient">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={cn(
                    "h-11 px-4 text-sm font-medium text-white/60",
                    header.column.id === "actions" && "w-[50px] min-w-[50px] text-right",
                  )}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className="border-white/10 hover:bg-white/5 data-[state=selected]:bg-white/5"
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      "px-4 py-1.5",
                      cell.column.id === "actions" && "w-[50px] min-w-[50px] whitespace-nowrap text-right",
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-white/60">
                No open positions.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TradingTableCard>
  );
}
