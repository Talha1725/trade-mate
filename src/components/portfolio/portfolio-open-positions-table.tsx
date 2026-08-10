"use client";

import * as React from "react";
import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef, type SortingState } from "@tanstack/react-table";
import Image from "next/image";
import { IoIosTrendingDown, IoIosTrendingUp } from "react-icons/io";
import { Loader2Icon } from "lucide-react";
import { IoCloseCircle } from "react-icons/io5";
import { TradingTableCard } from "@/components/shared/trading-table-card";
import { SortableColumnHeader } from "@/components/sortable-column-header";
import { AssetIcon } from "@/components/shared/asset-icon";
import { formatTradingPrice } from "@/components/shared/trading-table-cells";
import { cn } from "@/lib/utils";
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

function formatSignedCurrency(value: number) {
  if (value === 0) {
    return "-$0.00";
  }

  const prefix = value > 0 ? "+$" : "-$";
  return `${prefix}${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatSignedPercent(value: number) {
  if (value === 0) {
    return "-0.00%";
  }

  const prefix = value > 0 ? "+" : "-";
  return `${prefix}${Math.abs(value).toFixed(2)}%`;
}

function formatOpenDate(value: string | null | undefined) {
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
      {formatSignedCurrency(value)}
    </span>
  );
}

function PnlPercentValue({ value }: { value: number }) {
  const isPositive = value > 0;

  return (
    <span className={cn("font-medium", isPositive ? "text-primary" : "text-destructive")}>
      {formatSignedPercent(value)}
    </span>
  );
}

const riskOrder: Record<PortfolioOpenPositionRisk, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

function CancelButton({ positionId, onCancel }: { positionId: string; onCancel?: (positionId: string) => void | Promise<void> }) {
  const [isPending, setIsPending] = React.useState(false);

  const handleClick = async () => {
    if (!onCancel) return;
    setIsPending(true);
    try {
      await onCancel(positionId);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] border border-destructive/10 bg-destructive/10 px-3.5 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPending ? (
        <Loader2Icon className="size-4 animate-spin text-destructive" />
      ) : (
        <IoCloseCircle className="size-4 text-destructive" />
      )}
      Close
    </button>
  );
}

export function PortfolioOpenPositionsTable({
  positions = [],
  onExport,
  onCloseAll,
  onCancel,
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
        header: ({ column }) => <SortableColumnHeader column={column} label="Open Date/Day" className="min-w-[230px] justify-start text-left" />,
        cell: ({ row }) => <span className="inline-block min-w-[230px] whitespace-nowrap text-left text-sm font-medium text-white/60">{formatOpenDate(row.original.openedAt)}</span>,
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
          <CancelButton positionId={row.original.id} onCancel={onCancel} />
        ),
      },
    ],
    [onCancel],
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
          <col className="w-[230px]" />
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
                    header.column.id === "actions" && "text-right",
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
                      cell.column.id === "actions" && "text-right",
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
