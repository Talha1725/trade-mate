"use client";

import { cn } from "@/lib/utils";
import { formatSignedCurrency } from "@/lib/utils/number-formatters";

export const TRADING_TABLE_ROW_CLASS =
  "border-white/10 hover:bg-white/5 data-[state=selected]:bg-white/5 has-aria-expanded:!bg-muted/10";


type TradingSide = "Buy" | "Sell" | "buy" | "sell";

export function TradingSideBadge({ side }: { side: TradingSide }) {
  const isBuy = side === "Buy" || side === "buy";
  const label = isBuy ? "Buy" : "Sell";

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium border",
        isBuy ? "bg-primary/5 text-primary border-primary/3" : "bg-destructive/5 text-destructive border-destructive/3",
      )}
    >
      {label}
    </span>
  );
}

export function TradingOrderStatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "primary" | "orange";
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium border",
        tone === "primary" && "bg-primary/5 border-primary/3 text-primary",
        tone === "orange" && "bg-orange/5 border-orange/3 text-orange",
      )}
    >
      {label}
    </span>
  );
}

export function TradingPnlValue({ value }: { value: number }) {
  const isPositive = value > 0;

  return (
    <span
      className={cn(
        "font-medium",
        isPositive ? "text-primary" : value < 0 ? "text-destructive" : "text-white/60",
      )}
    >
      {formatSignedCurrency(value)}
    </span>
  );
}
