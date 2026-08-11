"use client";

import * as React from "react";
import { EllipsisVerticalIcon, Loader2Icon, PencilIcon, XCircleIcon } from "lucide-react";

import { PlaceOrderDialog } from "@/components/place-order-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function TableRowActionsMenu({
  symbol,
  side,
  positionId,
  lots,
  markPrice,
  stopLoss,
  takeProfit,
  onModifyProtection,
  onCancel,
}: {
  symbol: string;
  side: "buy" | "sell" | "long" | "short";
  positionId: string;
  lots: number;
  markPrice: number | null | undefined;
  stopLoss: number | null;
  takeProfit: number | null;
  onModifyProtection?: (input: { positionId: string; stopLoss: number | null; takeProfit: number | null }) => Promise<{ status: "PENDING" | "SENT" | "FAILED" | "SKIPPED" }>;
  onCancel?: () => void | Promise<void>;
}) {
  const [editOpen, setEditOpen] = React.useState(false);
  const [isClosing, setIsClosing] = React.useState(false);

  const handleClose = async () => {
    if (!onCancel) return;
    setIsClosing(true);
    try {
      await onCancel();
    } finally {
      setIsClosing(false);
    }
  };

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          aria-label="Open row actions"
          className="inline-flex size-8 relative cursor-pointer items-center justify-center rounded-lg border border-white/10 text-white/70 outline-none transition-colors hover:bg-white/10 hover:text-white"
        >
          <EllipsisVerticalIcon className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-32">
          {onModifyProtection ? (
            <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => setEditOpen(true)}>
              <PencilIcon className="size-4" />
              Edit
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            variant="destructive"
            className="cursor-pointer gap-2"
            disabled={isClosing}
            onClick={handleClose}
          >
            {isClosing ? <Loader2Icon className="size-4 animate-spin" /> : <XCircleIcon className="size-4" />}
            Close
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {onModifyProtection ? (
        <PlaceOrderDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          modification={{
            positionId,
            symbol,
            side: side === "buy" || side === "long" ? "Buy" : "Sell",
            lots,
            markPrice: markPrice ?? null,
            stopLoss,
            takeProfit,
            onSubmit: onModifyProtection,
          }}
        />
      ) : null}
    </>
  );
}
