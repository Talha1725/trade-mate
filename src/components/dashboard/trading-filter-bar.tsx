"use client";
import { CompareAssetsDropdown } from "@/components/dashboard/compare-assets-dropdown";
import { formatTradingPrice } from "@/components/shared/trading-table-cells";
import { useAccountWishlist } from "@/hooks/use-account-wishlist";
import { useResolvedAccountNumber } from "@/hooks/use-resolved-account-number";
import { TRADING_TIMEFRAMES } from "@/constants/trading-timeframes";
import { formatPercent, formatSignedChange, formatVolume } from "@/lib/utils/market-formatters";
import { cn } from "@/lib/utils";
import type {
  TradingFilterBarProps,
} from "@/types/trading-filter-bar";

function OhlcvStat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  return (
    <span className="flex items-center gap-1 whitespace-nowrap">
      <span className="text-white/60 text-sm font-medium">{label}</span>
      <span
        className={cn(
          "text-sm font-medium",
          tone === "positive" && "text-primary",
          tone === "negative" && "text-destructive",
          tone === "neutral" && "text-white",
        )}
      >
        {value}
      </span>
    </span>
  );
}

export function TradingFilterBar({
  assets,
  selectedAssetId,
  onAssetChange,
  accountNumber: accountNumberProp,
  quote,
  ohlcv,
  timeframe,
  onTimeframeChange,
  compareAssetId = null,
  onCompareChange,
  onActionClick,
  className,
}: TradingFilterBarProps) {
  const resolvedAccountNumber = useResolvedAccountNumber(accountNumberProp);
  const {
    wishlistAssetIds,
    toggleWishlistAsset,
    isMutating: isWishlistMutating,
  } = useAccountWishlist(resolvedAccountNumber, assets);
  const isWishlistDisabled = !resolvedAccountNumber || isWishlistMutating;

  const selectedAsset =
    assets.find((asset) => asset.id === selectedAssetId) ?? assets[0];
  const isPositive = quote.change >= 0;
  const selectedAssetClass = selectedAsset?.category ?? null;
  const selectedAssetSymbol = selectedAsset?.symbol;

  return (
    <div
      className={cn(
        "grid flex-wrap grid-cols-1 gap-x-10 gap-y-3 xl:grid-cols-2 xl:flex-nowrap min-[1500px]:flex justify-between items-center min-[1500px] gap-3 rounded-xl border border-white/20 bg-white/5 px-3 py-1.5",
        className,
      )}
    >


      <div className="flex min-w-[200px] shrink-0 items-center gap-3 min-[1500px]:w-[240px] min-[1500px]:min-w-[240px]">
        <span className="text-base font-medium tabular-nums text-white md:text-lg">
          {formatTradingPrice(quote.price, selectedAssetSymbol, selectedAssetClass)}
        </span>
        <p
          className={cn(
            "text-xs font-normal tabular-nums md:text-sm mt-0.5",
            isPositive ? "text-primary" : "text-destructive",
          )}
        >
          {formatSignedChange(quote.change, selectedAssetSymbol)} <span className="ml-1">({formatPercent(quote.changePercent)})</span> 
        </p>
      </div>

      <div className="flex items-center gap-0.5">
        {TRADING_TIMEFRAMES.map((interval) => {
          const isActive = interval === timeframe;

          return (
            <button
              key={interval}
              type="button"
              onClick={() => onTimeframeChange?.(interval)}
              className={cn(
                "px-2.5 py-2 min-w-[40px] text-sm font-medium rounded-lg transition-colors cursor-pointer",
                isActive
                  ? "border border-primary bg-linear-to-r from-dark-blue via-teal-blue to-dark-blue text-primary"
                  : "text-white/60 hover:text-white/80",
              )}
            >
              {interval}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 ">
        {/* <IndicatorsDropdown /> */}
        <CompareAssetsDropdown
          primaryAssetId={selectedAssetId}
          assets={assets}
          compareAssetId={compareAssetId}
          onCompareChange={onCompareChange}
        />

        {/* {FILTER_BAR_ACTIONS.map((action) => {
          const Icon = ACTION_ICON_MAP[action.id];

          return (
            <button
              key={action.id}
              type="button"
              onClick={() => onActionClick?.(action.id)}
              className="flex items-center gap-1.5 py-2 px-3.5 cursor-pointer rounded-lg text-sm font-medium text-white transition-colors bg-linear-to-r from-white/5 to-white/7 hover:bg-white/10 border border-white/20"
            >
              <Icon className="size-3.5 text-white" />
              {action.label}
            </button>
          );
        })} */}
      </div>

      <div className="flex flex-wrap items-center min-[1500px]:justify-end gap-2.5 text-xs tabular-nums min-[1500px]:w-auto min-[1500px]:min-w-[235px]">
        <OhlcvStat label="O" value={formatTradingPrice(ohlcv.open, selectedAssetSymbol, selectedAssetClass)} />
        <OhlcvStat label="H" value={formatTradingPrice(ohlcv.high, selectedAssetSymbol, selectedAssetClass)} tone="positive" />
        <OhlcvStat label="L" value={formatTradingPrice(ohlcv.low, selectedAssetSymbol, selectedAssetClass)} tone="negative" />
        <OhlcvStat label="V" value={formatVolume(ohlcv.volume)} />
      </div>
    </div>
  );
}
