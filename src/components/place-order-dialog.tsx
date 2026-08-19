"use client";

import * as React from "react";
import { X } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { terminalApi } from "@/lib/services/terminal.api";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useSelectedAccountStore } from "@/lib/stores/account-store";
import { useSyncedTradingAssets } from "@/hooks/use-synced-trading-assets";
import { SIDEBAR_ICONS } from "@/lib/mock-data/sidebar-icons";
import { getAssetLeverageLabel } from "@/lib/utils/asset-leverage";
import { usePriceStream } from "@/hooks/use-price-stream";
import { useSelectedSymbol, useSetSelectedSymbol } from "@/hooks/use-selected-symbol";
import { formatMarketPrice } from "@/lib/utils/market-price";
import { useLiveAccountSnapshotStore } from "@/lib/stores/live-account-snapshot-store";
import { buildAccountMetricsSummaryFromAccount } from "@/lib/utils/live-account-summary";
import {
  calculateMarginUsd,
  calculateNotionalUsd,
  getSupplementalQuoteSymbol,
} from "@/lib/utils/instrument-spec";
import type { PriceSocketQuote } from "@/types/price";
import type { TradeModification } from "@/types/place-order-dialog";
import { SymbolSelector } from "@/components/symbol-selector";

function parseOptionalPrice(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function validateTpSl(input: {
  side: "Buy" | "Sell";
  symbol: string;
  referencePrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
}) {
  const { side, symbol, referencePrice, stopLoss, takeProfit } = input;

  if (referencePrice == null) {
    return "Live price is not available yet. Please try again in a moment.";
  }

  const formattedReference = formatMarketPrice(referencePrice, symbol);

  if (side === "Buy") {
    if (stopLoss != null && stopLoss >= referencePrice) {
      return `Stop loss must be below the buy price (${formattedReference}).`;
    }

    if (takeProfit != null && takeProfit <= referencePrice) {
      return `Take profit must be above the buy price (${formattedReference}).`;
    }
  } else {
    if (stopLoss != null && stopLoss <= referencePrice) {
      return `Stop loss must be above the sell price (${formattedReference}).`;
    }

    if (takeProfit != null && takeProfit >= referencePrice) {
      return `Take profit must be below the sell price (${formattedReference}).`;
    }
  }

  return null;
}

export function PlaceOrderDialog({
  children,
  modification,
  open: controlledOpen,
  onOpenChange,
}: {
  children?: React.ReactNode;
  modification?: TradeModification;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen ?? internalOpen;
  const [side, setSide] = React.useState<"Buy" | "Sell">("Buy");
  const selectedSymbol = useSelectedSymbol() ?? "EURUSD";
  const symbol = modification?.symbol ?? selectedSymbol;
  const setSymbol = useSetSelectedSymbol();
  const [loadSize, setLoadSize] = React.useState("0.01");
  const [stopLoss, setStopLoss] = React.useState("");
  const [takeProfit, setTakeProfit] = React.useState("");
  const [buyingPower, setBuyingPower] = React.useState<number | null>(null);
  const [isAccountContextLoading, setIsAccountContextLoading] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const token = useAuthStore((state) => state.session?.token ?? null);
  const selectedAccountId = useSelectedAccountStore((state) => state.selectedAccountId);
  const { data: tradingAssets = [] } = useSyncedTradingAssets();
  const [liveQuotes, setLiveQuotes] = React.useState<Record<string, PriceSocketQuote>>({});
  const selectedAsset = React.useMemo(
    () => tradingAssets.find((asset) => asset.symbol === symbol) ?? null,
    [symbol, tradingAssets],
  );
  const leverageLabel = React.useMemo(
    () => getAssetLeverageLabel(selectedAsset),
    [selectedAsset],
  );
  const supplementalQuoteSymbol = React.useMemo(
    () => getSupplementalQuoteSymbol(symbol, tradingAssets),
    [symbol, tradingAssets],
  );
  const quotePrices = React.useMemo(
    () =>
      Object.fromEntries(
        Object.values(liveQuotes).map((quote) => [quote.symbol.toUpperCase(), quote.price]),
      ) as Record<string, number>,
    [liveQuotes],
  );

  usePriceStream({
    enabled: open && !!symbol,
    symbols: Array.from(
      new Set([symbol, supplementalQuoteSymbol].filter((item): item is string => Boolean(item))),
    ),
    accountIds: [],
    onQuotes: (incoming) => {
      setLiveQuotes((current) => {
        const next = { ...current };

        for (const item of incoming) {
          next[item.symbol.toUpperCase()] = item;
        }

        return next;
      });
    },
  });

  React.useEffect(() => {
    if (!open || !modification) return;

    let isActive = true;
    void terminalApi.getMarketQuotes([symbol], token ?? undefined).then((response) => {
      if (!isActive || response.quotes.length === 0) return;

      setLiveQuotes((current) => ({
        ...current,
        ...Object.fromEntries(response.quotes.map((quote) => [quote.symbol.toUpperCase(), quote])),
      }));
    }).catch(() => {
      // The row's current mark price remains visible if the quote endpoint is unavailable.
    });

    return () => {
      isActive = false;
    };
  }, [modification, open, symbol, token]);

  const selectedQuote = liveQuotes[symbol.toUpperCase()] ?? null;
  const bidPrice = selectedQuote?.bid ?? selectedQuote?.price ?? null;
  const askPrice = selectedQuote?.ask ?? selectedQuote?.price ?? null;
  const displayBidPrice = bidPrice ?? modification?.markPrice ?? null;
  const displayAskPrice = askPrice ?? modification?.markPrice ?? null;
  const fillPrice = side === "Buy" ? displayAskPrice : displayBidPrice;
  const lotsNum = Number(loadSize);
  const estimatedCost =
    fillPrice != null && Number.isFinite(lotsNum)
      ? calculateNotionalUsd(symbol, lotsNum, fillPrice, quotePrices, tradingAssets)
      : null;
  const marginRequired =
    fillPrice != null && Number.isFinite(lotsNum)
      ? calculateMarginUsd(symbol, lotsNum, fillPrice, quotePrices, tradingAssets)
      : null;

  const loadAccountContext = React.useCallback(
    async (options?: { silent?: boolean }) => {
      if (!token) {
        return null;
      }

      setIsAccountContextLoading(true);

      try {
        const snapshot = await terminalApi.getOpenPositions(token, selectedAccountId ?? undefined);

        const availableBalance =
          Number(snapshot.account.equity ?? 0) - Number(snapshot.account.marginUsed ?? 0);
        setBuyingPower(Math.max(0, availableBalance));

        return {
          accountId: snapshot.account.id,
          balance: availableBalance.toFixed(2),
        };
      } catch (error) {
        if (!options?.silent) {
          console.error("Unable to load account context.", error);
        }

        return null;
      } finally {
        setIsAccountContextLoading(false);
      }
    },
    [selectedAccountId, token],
  );

  React.useEffect(() => {
    if (tradingAssets.length === 0) {
      return;
    }

    if (!selectedAsset) {
      setSymbol(tradingAssets[0].symbol);
    }
  }, [selectedAsset, setSymbol, tradingAssets]);

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      onOpenChange?.(nextOpen);
      if (controlledOpen === undefined) setInternalOpen(nextOpen);

      if (nextOpen) {
        if (modification) {
          setSide(modification.side);
          setLoadSize(String(modification.lots));
          setStopLoss(modification.stopLoss == null ? "" : String(modification.stopLoss));
          setTakeProfit(modification.takeProfit == null ? "" : String(modification.takeProfit));
        }
        void loadAccountContext({ silent: true });
      }
    },
    [controlledOpen, loadAccountContext, modification, onOpenChange],
  );

  React.useEffect(() => {
    if (open && modification) {
      setSide(modification.side);
      setLoadSize(String(modification.lots));
      setStopLoss(modification.stopLoss == null ? "" : String(modification.stopLoss));
      setTakeProfit(modification.takeProfit == null ? "" : String(modification.takeProfit));
      void loadAccountContext({ silent: true });
    }
  }, [loadAccountContext, modification?.positionId, open]);

  const submitOrder = async () => {
    if (!token) {
      toast.error("Please sign in before placing a trade.");
      return;
    }

    const lots = Number(loadSize);

    if (!Number.isFinite(lots) || lots <= 0) {
      toast.error("Enter a valid load size greater than 0.");
      return;
    }

    const parsedStopLoss = parseOptionalPrice(stopLoss);
    const parsedTakeProfit = parseOptionalPrice(takeProfit);

    if (
      (parsedStopLoss != null && (!Number.isFinite(parsedStopLoss) || parsedStopLoss <= 0)) ||
      (parsedTakeProfit != null && (!Number.isFinite(parsedTakeProfit) || parsedTakeProfit <= 0))
    ) {
      toast.error("Stop loss and take profit must be valid positive prices.");
      return;
    }

    if (modification) {
      const referencePrice = modification.markPrice ?? (side === "Buy" ? askPrice : bidPrice);
      const tpSlError = validateTpSl({
        side,
        symbol,
        referencePrice,
        stopLoss: parsedStopLoss,
        takeProfit: parsedTakeProfit,
      });

      if (tpSlError) {
        toast.error(tpSlError);
        return;
      }

      setIsSubmitting(true);
      try {
        await modification.onSubmit({
          positionId: modification.positionId,
          stopLoss: parsedStopLoss,
          takeProfit: parsedTakeProfit,
        });
        handleOpenChange(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to update trade.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    const fillPrice = side === "Buy" ? askPrice : bidPrice;
    const tpSlError = validateTpSl({
      side,
      symbol,
      referencePrice: fillPrice,
      stopLoss: parsedStopLoss,
      takeProfit: parsedTakeProfit,
    });

    if (tpSlError) {
      toast.error(tpSlError);
      return;
    }

    setIsSubmitting(true);

    try {
      const accountContext = (await loadAccountContext()) ?? null;

      if (!accountContext) {
        throw new Error("Unable to load account details.");
      }

      const result = await terminalApi.placeOrder(
        {
          accountId: accountContext.accountId,
          symbol,
          direction: side === "Buy" ? "BUY" : "SELL",
          lots,
          stopLoss: parsedStopLoss,
          takeProfit: parsedTakeProfit,
        },
        token,
      );

      const currentSummary = useLiveAccountSnapshotStore.getState().summariesByAccountId[result.account.id] ?? null;
      useLiveAccountSnapshotStore.getState().setAccountSummary(
        buildAccountMetricsSummaryFromAccount(result.account, currentSummary),
      );

      toast.success(`${side} ${symbol} trade opened.`);
      setStopLoss("");
      setTakeProfit("");
      window.dispatchEvent(new Event("trade-mate:positions-changed"));
      handleOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to place trade.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog modal={!modification} open={open} onOpenChange={handleOpenChange}>
      {children ? <DialogTrigger render={React.isValidElement(children) ? children : <button>{children}</button>} /> : null}
      <DialogContent
        className="w-full max-w-[450px] sm:max-w-[450px] max-h-[90vh] overflow-y-auto custom-scrollbar bg-[#0d0d0d] border border-white/20 p-5 pt-14 gap-0 shadow-2xl rounded-[16px] text-white"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">{modification ? "Modify Trade" : "Place Order"}</DialogTitle>
        <DialogClose
          render={
            <button className="absolute top-6 right-6 size-6 rounded-full bg-white hover:opacity-90 transition-opacity text-black flex items-center justify-center cursor-pointer">
              <X className="size-3.5" />
              <span className="sr-only">Close</span>
            </button>
          }
        />
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-white mb-1">{modification ? "Modify Trade" : "Place Order"}</h2>
            <p className="text-xs text-white/50 leading-relaxed pr-4">
              {modification
                ? "Review the trade details and update its stop loss or take profit."
                : "Set up your trade with sizing, leverage and risk checks before execution."}
            </p>
          </div>
          <button className="p-2 rounded-lg border border-[#108961] card-green shrink-0 hover:opacity-90 transition-opacity">
            <Image 
              src={SIDEBAR_ICONS.winrate} 
              alt="win rate" 
              width={16} 
              height={16} 
              className="brightness-200"
            />
          </button>
        </div>

        {/* Info Cards */}
        <div className="mb-4">
          <div className="rounded-xl border border-white/20 gradient-btn-tradebox p-3">
            <div className="text-xs text-white/50 mb-1">Buying Power</div>
            <div className="text-sm font-semibold text-white">
              {buyingPower == null
                ? isAccountContextLoading
                  ? "Loading..."
                  : "—"
                : `$${buyingPower.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`}
            </div>
          </div>
        </div>

        {/* Live Bid / Ask */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div
            className={cn(
              "rounded-xl border p-3",
              side === "Sell" ? "border-[#ff5b5b]/60 card-red" : "border-white/20 gradient-btn-tradebox",
            )}
          >
            <div className="text-xs text-white/50 mb-1">Sell / Bid</div>
            <div className="text-sm font-semibold text-[#ff7a7a]">
              {displayBidPrice != null ? formatMarketPrice(displayBidPrice, symbol) : "—"}
            </div>
          </div>
          <div
            className={cn(
              "rounded-xl border p-3",
              side === "Buy" ? "border-[#0CE9A0]/60 card-green" : "border-white/20 gradient-btn-tradebox",
            )}
          >
            <div className="text-xs text-white/50 mb-1">Buy / Ask</div>
            <div className="text-sm font-semibold text-[#0CE9A0]">
              {displayAskPrice != null ? formatMarketPrice(displayAskPrice, symbol) : "—"}
            </div>
          </div>
        </div>

        {/* Buy/Sell Toggle */}
        <div className="flex rounded-xl border border-white/20 gradient-btn-trade p-1 mb-5">
          <button
            onClick={() => setSide("Buy")}
            disabled={Boolean(modification)}
            className={cn(
              "flex-1 rounded-lg py-2 cursor-pointer text-sm font-medium transition-colors",
              side === "Buy" ? "btn-green text-white" : "text-white/50 hover:text-white"
            )}
          >
            Buy
          </button>
          <button
            onClick={() => setSide("Sell")}
            disabled={Boolean(modification)}
            className={cn(
              "flex-1 rounded-lg py-2 text-sm cursor-pointer font-medium transition-colors",
              side === "Sell" ? "btn-red text-white" : "text-white/50 hover:text-white"
            )}
          >
            Sell
          </button>
        </div>

        <div className="space-y-4">
          {/* Symbol Row */}
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">Symbol</label>
            {modification ? (
              <div className="flex h-9 w-full items-center rounded-lg border border-white/10 bg-[#141414] px-3 text-sm font-medium text-white/70">
                {symbol}
              </div>
            ) : (
              <SymbolSelector className="w-full" contentClassName=" w-[330px] sm:w-[405px]" />
            )}
          </div>

          {/* Other 4 fields in 2x2 grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Quantity */}
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Lot Size</label>
              <div className="rounded-lg border border-white/20 gradient-btn-trade px-3 py-2">
                <input
                  type="text"
                  value={loadSize}
                  onChange={(event) => setLoadSize(event.target.value)}
                  disabled={Boolean(modification)}
                  className="w-full bg-transparent text-sm text-white outline-none"
                />
              </div>
            </div>

            {/* Leverage */}
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Leverage</label>
              <div
                title={leverageLabel}
                className="flex h-9 w-full items-center rounded-lg border border-[#222] bg-[#141414] px-3 text-sm font-medium text-white/80"
              >
                <span className="truncate">{leverageLabel}</span>
              </div>
            </div>

            {/* Stop Loss */}
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Stop Loss</label>
              <div className="rounded-lg border border-white/20 gradient-btn-trade px-3 py-2">
                <input
                  type="text"
                  value={stopLoss}
                  onChange={(event) => setStopLoss(event.target.value)}
                  className="w-full bg-transparent text-sm text-white outline-none"
                />
              </div>
            </div>

            {/* Take Profit */}
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Take Profit</label>
              <div className="rounded-lg border border-white/20  bg-[#141414] px-3 py-2">
                <input
                  type="text"
                  value={takeProfit}
                  onChange={(event) => setTakeProfit(event.target.value)}
                  className="w-full bg-transparent text-sm text-white outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Risk Summary Card */}
        <div className="mt-5 rounded-xl border border-white/20 card-green p-4">
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-white/50">Estimated Cost</span>
              <span className="font-semibold text-white">
                {estimatedCost != null
                  ? `$${estimatedCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-white/50">Margin Required</span>
              <span className="font-semibold text-white">
                {marginRequired != null
                  ? `$${marginRequired.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-white/50">Risk / Reward</span>
              <span className="font-medium text-[#0CE9A0]">1:1.10</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-white/50">Risk Check</span>
              <span className="font-medium text-[#0CE9A0]">Passed</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex gap-3">
          <button 
            type="button"
            onClick={submitOrder}
            disabled={isSubmitting}
            className={cn(
              "flex-1 rounded-xl py-3 text-sm cursor-pointer font-semibold text-white disabled:opacity-60",
              side === "Buy" ? "btn-green" : "btn-red"
            )}
          >
            {isSubmitting
              ? modification ? "Saving..." : "Placing..."
              : modification ? "Save Changes" : `${side} ${symbol}`}
          </button>
          {/* <button
            type="button"
            onClick={() => toast.success("Risk check passed.")}
            className="flex-1 rounded-xl py-3 cursor-pointer text-sm font-semibold text-white/80 border border-white/10 bg-linear-to-b from-white/10 to-white/5 hover:opacity-90 transition-opacity shadow-inner shadow-white/5"
          >
            Run Risk Check
          </button> */}
        </div>
      </DialogContent>
    </Dialog>
  );
}
