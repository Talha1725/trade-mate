"use client";

import { cn } from "@/lib/utils";

export const TRADING_TABLE_ROW_CLASS =
  "border-white/10 hover:bg-white/5 data-[state=selected]:bg-white/5 has-aria-expanded:!bg-muted/10";

const FOREX_PREFIXES = ["AUD", "CAD", "CHF", "EUR", "GBP", "JPY", "NZD", "USD"];

function isForexSymbol(symbol: string) {
  const normalized = symbol.trim().toUpperCase();

  if (normalized.length !== 6) {
    return false;
  }

  const base = normalized.slice(0, 3);
  const quote = normalized.slice(3);

  return FOREX_PREFIXES.includes(base) && FOREX_PREFIXES.includes(quote);
}

function getTradingPriceDecimals(value: number, symbol?: string, assetClass?: string | null) {
  if (assetClass === "FOREX" || (symbol ? isForexSymbol(symbol) : false)) {
    return 5;
  }

  const normalized = symbol?.trim().toUpperCase() ?? "";
  const isCrypto = assetClass === "CRYPTO" || normalized.endsWith("USDT") || normalized.endsWith("USD");
  if (isCrypto) {
    const absoluteValue = Math.abs(value);
    if (absoluteValue >= 100) return 2;
    if (absoluteValue >= 1) return 4;
    if (absoluteValue >= 0.01) return 6;
    return 8;
  }

  return value < 1 ? 4 : 2;
}

export function formatTradingPrice(value: number, symbol?: string, assetClass?: string | null) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: getTradingPriceDecimals(value, symbol, assetClass),
    maximumFractionDigits: getTradingPriceDecimals(value, symbol, assetClass),
  });
}

export function formatTradingQty(value: number) {
  if (Number.isInteger(value) || value >= 100) {
    return value.toLocaleString("en-US");
  }

  return value.toLocaleString("en-US", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
}

export function formatSignedCurrency(value: number) {
  if (value === 0) {
    return "$0.00";
  }

  const prefix = value > 0 ? "+$" : "-$";
  return `${prefix}${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

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
