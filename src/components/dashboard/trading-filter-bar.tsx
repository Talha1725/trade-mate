"use client";

import { CirclePlayIcon, Star } from "lucide-react";

import { CompareAssetsDropdown } from "@/components/dashboard/compare-assets-dropdown";
import { IndicatorsDropdown } from "@/components/dashboard/indicators-dropdown";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/dashboard/ui/select";
import { AssetIcon } from "@/components/shared/asset-icon";
import { formatTradingPrice } from "@/components/shared/trading-table-cells";
import { useAccountWishlist } from "@/hooks/use-account-wishlist";
import { useResolvedAccountNumber } from "@/hooks/use-resolved-account-number";
import { TRADING_TIMEFRAMES } from "@/constants/trading-timeframes";
import { getMarketPricePrecision } from "@/lib/utils/market-price";
import { cn } from "@/lib/utils";
import type {
  TradingFilterBarAction,
  TradingFilterBarAsset,
  TradingFilterBarProps,
} from "@/types/trading-filter-bar";

const FILTER_BAR_ACTIONS = [
  { id: "replay", label: "Replay" },
] as const satisfies ReadonlyArray<TradingFilterBarAction>;

const ACTION_ICON_MAP = {
  replay: CirclePlayIcon,
} as const;

function formatSignedChange(value: number, symbol?: string) {
  const precision = getMarketPricePrecision(symbol ?? "");
  const prefix = value >= 0 ? "+" : "";
  return `${prefix}${value.toLocaleString("en-US", {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  })}`;
}

function formatPercent(value: number) {
  const prefix = value >= 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}%`;
}

function formatVolume(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(2)}K`;
  }

  return value.toLocaleString("en-US");
}

function AssetOptionLabel({ asset }: { asset: TradingFilterBarAsset }) {
  return (
    <span className="flex items-center gap-2">
      <AssetIcon symbol={asset.symbol} label={asset.label} size={20} />
      <span>{asset.label}</span>
    </span>
  );
}

function AssetDropdownOption({
  asset,
  isInWatchlist,
  isDisabled,
  onWatchlistToggle,
}: {
  asset: TradingFilterBarAsset;
  isInWatchlist: boolean;
  isDisabled?: boolean;
  onWatchlistToggle?: (assetId: string) => void;
}) {
  return (
    <span className="flex w-full min-w-0 items-center gap-2">
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <AssetIcon symbol={asset.symbol} label={asset.label} size={20} />
        <span className="truncate">{asset.label}</span>
      </span>
      <button
        type="button"
        disabled={isDisabled}
        aria-label={isInWatchlist ? `Remove ${asset.label} from watchlist` : `Add ${asset.label} to watchlist`}
        className={cn(
          "pointer-events-auto shrink-0 rounded-md p-1 transition-colors",
          isDisabled
            ? "cursor-not-allowed text-white/30"
            : "cursor-pointer text-white/60 hover:bg-white/10 hover:text-primary",
        )}
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onWatchlistToggle?.(asset.id);
        }}
      >
        <Star
          className={cn(
            "size-4",
            isInWatchlist ? "fill-primary text-primary" : "text-white/60",
          )}
        />
      </button>
    </span>
  );
}

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
    <span className="flex min-w-0 items-center justify-center gap-1 whitespace-nowrap">
      <span className="text-white/60 text-sm font-medium">{label}</span>
      <span
        className={cn(
          "inline-block text-right text-sm font-medium tabular-nums",
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

      <div className="flex flex-wrap min-w-[360px] grid-cols-4 items-center gap-2.5 text-xs tabular-nums">
        <OhlcvStat label="O" value={formatTradingPrice(ohlcv.open, selectedAssetSymbol, selectedAssetClass)} />
        <OhlcvStat label="H" value={formatTradingPrice(ohlcv.high, selectedAssetSymbol, selectedAssetClass)} tone="positive" />
        <OhlcvStat label="L" value={formatTradingPrice(ohlcv.low, selectedAssetSymbol, selectedAssetClass)} tone="negative" />
        <OhlcvStat label="V" value={formatVolume(ohlcv.volume)} />
      </div>
    </div>
  );
}
