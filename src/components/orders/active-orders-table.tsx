"use client";

import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";

import { TradingSymbolCell } from "@/components/shared/trading-symbol-cell";
import {
  formatTradingPrice,
  formatTradingQty,
  TRADING_TABLE_ROW_CLASS,
  TradingOrderStatusBadge,
  TradingPnlValue,
  TradingSideBadge,
} from "@/components/shared/trading-table-cells";
import { TradingTableCard } from "@/components/shared/trading-table-card";
import { TableRowActionsMenu } from "@/components/shared/table-row-actions-menu";
import { SortableColumnHeader } from "@/components/sortable-column-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { mockActiveOrders } from "@/lib/mock-data/active-orders";
import type {
  ActiveOrderRow,
  ActiveOrdersTableProps,
  ActiveOrderStatus,
  ActiveOrderType,
} from "@/types/active-orders";

function formatOrderType(type: ActiveOrderType) {
  return type.charAt(0).toUpperCase() + type.slice(1);
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

function OrderStatusBadge({ status }: { status: ActiveOrderStatus }) {
  return (
    <TradingOrderStatusBadge
      label={status === "filled" ? "Filled" : "Partial"}
      tone={status === "filled" ? "primary" : "orange"}
    />
  );
}

export function ActiveOrdersTable({
  title = "Active Orders",
  orders = mockActiveOrders,
  onExport,
  onCloseAll,
  onCancel,
  onModifyProtection,
  isCloseAllLoading,
  className,
}: ActiveOrdersTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo<ColumnDef<ActiveOrderRow>[]>(
    () => [
      {
        accessorKey: "displayId",
        header: ({ column }) => <SortableColumnHeader column={column} label="ID" />,
        cell: ({ row }) => <span className="text-sm text-white/60">{row.original.displayId}</span>,
      },
      {
        accessorKey: "symbol",
        header: ({ column }) => <SortableColumnHeader column={column} label="Symbol" />,
        cell: ({ row }) => <TradingSymbolCell symbol={row.original.symbol} />,
      },
      {
        accessorKey: "openedAt",
        header: ({ column }) => <SortableColumnHeader column={column} label="Open Date/Day" className="min-w-[230px] justify-start text-left" />,
        cell: ({ row }) => <span className="inline-block min-w-[230px] text-left text-sm font-medium text-white/60">{formatOpenDate(row.original.openedAt)}</span>,
      },
      {
        accessorKey: "side",
        header: ({ column }) => <SortableColumnHeader column={column} label="Side" />,
        cell: ({ row }) => <TradingSideBadge side={row.original.side} />,
      },
      {
        accessorKey: "type",
        header: ({ column }) => <SortableColumnHeader column={column} label="Type" />,
        cell: ({ row }) => (
          <span className="text-sm font-medium text-white/60">{formatOrderType(row.original.type)}</span>
        ),
      },
      {
        accessorKey: "qty",
        header: ({ column }) => <SortableColumnHeader column={column} label="Qty" />,
        cell: ({ row }) => (
          <span className="text-sm font-medium text-white/60">{formatTradingQty(row.original.qty)}</span>
        ),
      },
      {
        accessorKey: "price",
        header: ({ column }) => <SortableColumnHeader column={column} label="Entry" />,
        cell: ({ row }) => (
          <span className="text-sm font-medium text-white/60">
            {formatTradingPrice(row.original.price, row.original.symbol)}
          </span>
        ),
      },
      {
        accessorKey: "markPrice",
        header: ({ column }) => <SortableColumnHeader column={column} label="Mark Price" />,
        cell: ({ row }) => (
          <span className="text-sm font-medium text-white/60">
            {row.original.markPrice == null ? "-" : formatTradingPrice(row.original.markPrice, row.original.symbol)}
          </span>
        ),
      },
      {
        accessorKey: "takeProfit",
        header: ({ column }) => <SortableColumnHeader column={column} label="TP" />,
        cell: ({ row }) => (
          <span className="text-sm font-medium text-white/60">
            {row.original.takeProfit == null ? "-" : formatTradingPrice(row.original.takeProfit, row.original.symbol)}
          </span>
        ),
      },
      {
        accessorKey: "stopLoss",
        header: ({ column }) => <SortableColumnHeader column={column} label="SL" />,
        cell: ({ row }) => (
          <span className="text-sm font-medium text-white/60">
            {row.original.stopLoss == null ? "-" : formatTradingPrice(row.original.stopLoss, row.original.symbol)}
          </span>
        ),
      },
      {
        accessorKey: "pnl",
        header: ({ column }) => <SortableColumnHeader column={column} label="P&L" />,
        cell: ({ row }) => row.original.pnl == null ? "-" : <TradingPnlValue value={row.original.pnl} />,
      },
      {
        accessorKey: "status",
        header: ({ column }) => <SortableColumnHeader column={column} label="Status" />,
        cell: ({ row }) => <OrderStatusBadge status={row.original.status} />,
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <TableRowActionsMenu
            symbol={row.original.symbol}
            side={row.original.side}
            positionId={row.original.id}
            lots={row.original.qty}
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
    data: orders,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <TradingTableCard
      title={title}
      onExport={onExport}
      onCloseAll={onCloseAll}
      isCloseAllLoading={isCloseAllLoading}
      className={className}
      >
      <Table className="min-w-[1700px] table-fixed">
        <colgroup>
          <col className="w-[100px]" />
          <col className="w-[130px]" />
          <col className="w-[230px]" />
          <col className="w-[100px]" />
          <col className="w-[100px]" />
          <col className="w-[90px]" />
          <col className="w-[130px]" />
          <col className="w-[130px]" />
          <col className="w-[120px]" />
          <col className="w-[120px]" />
          <col className="w-[110px]" />
          <col className="w-[110px]" />
          <col className="w-[130px]" />
        </colgroup>
        <TableHeader variant="gradient">
          <TableRow className="hover:bg-transparent">
            {table.getHeaderGroups()[0].headers.map((header) => (
              <TableHead
                key={header.id}
                  className={header.column.id === "actions" ? "h-11 w-[50px] min-w-[50px] whitespace-nowrap px-4 text-right text-sm font-medium text-white/60" : "h-11 whitespace-nowrap px-4 text-sm font-medium text-white/60"}
              >
                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id} className={TRADING_TABLE_ROW_CLASS}>
              {row.getVisibleCells().map((cell) => (
                <TableCell
                  key={cell.id}
                    className={cell.column.id === "actions" ? "w-[50px] min-w-[50px] whitespace-nowrap px-4 py-[5px] text-right" : "whitespace-nowrap px-4 py-[5px]"}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TradingTableCard>
  );
}
