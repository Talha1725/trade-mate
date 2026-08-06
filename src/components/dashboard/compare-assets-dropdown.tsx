"use client";

import * as React from "react";
import { ArrowLeftRightIcon } from "lucide-react";
import { FaTrash } from "react-icons/fa6";

import { AssetIcon } from "@/components/shared/asset-icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/dashboard/ui/dropDown";
import { cn } from "@/lib/utils";
import type {
  CompareAssetItem,
  CompareAssetsDropdownProps,
} from "@/types/trading-compare-assets";
import type { TradingFilterBarAsset } from "@/types/trading-filter-bar";

function mapAssetToCompareItem(asset: TradingFilterBarAsset): CompareAssetItem {
  return {
    id: asset.id,
    symbol: asset.symbol,
    name: asset.label,
  };
}

function CompareAssetIcon({ symbol, name }: { symbol: string; name: string }) {
  return (
    <span className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full">
      <AssetIcon symbol={symbol} label={name} size={32} />
    </span>
  );
}

function CompareAssetRow({
  item,
  isActive,
  onSelect,
}: {
  item: CompareAssetItem;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        onSelect();
      }}
      className={cn(
        "flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-colors",
        isActive
          ? "btn-green"
          : "border border-transparent hover:bg-white/5",
      )}
    >
      <span className="flex min-w-0 items-center gap-3">
        <CompareAssetIcon symbol={item.symbol} name={item.name} />
        <span className="min-w-0">
          <p className="truncate text-sm font-medium text-white md:text-base">{item.symbol}</p>
          <p className="truncate text-xs text-white/60 md:text-sm">{item.name}</p>
        </span>
      </span>

      <span
        className={cn(
          "shrink-0 text-sm font-medium",
          isActive ? "text-primary" : "text-white/50",
        )}
      >
        {isActive ? "Active" : "Add"}
      </span>
    </button>
  );
}

function RemoveComparisonRow({ onRemove }: { onRemove: () => void }) {
  return (
    <div
      onClick={(event) => {
        event.preventDefault();
        onRemove();
      }}
      className="flex w-full cursor-pointer items-center justify-between gap-3 py-2.5 text-left transition-colors hover:opacity-90"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-white md:text-base">Remove Comparison</p>
        <p className="text-xs text-white/60 md:text-sm">Clear secondary line</p>
      </div>
      <button
        type="button"
        className="flex shrink-0 cursor-pointer items-center justify-center rounded-full p-1.5 text-white/80 transition-colors hover:bg-white/10"
      >
        <FaTrash color="white" className="size-4" />
      </button>
    </div>
  );
}

export function CompareAssetsDropdown({
  primaryAssetId,
  assets,
  compareAssetId = null,
  onCompareChange,
  className,
}: CompareAssetsDropdownProps) {
  const compareOptions = React.useMemo(
    () =>
      assets
        .filter((asset) => asset.id !== primaryAssetId)
        .map(mapAssetToCompareItem),
    [assets, primaryAssetId],
  );

  const handleSelect = (assetId: string) => {
    if (compareAssetId === assetId) {
      onCompareChange?.(null);
      return;
    }

    onCompareChange?.(assetId);
  };

  const handleRemove = () => {
    onCompareChange?.(null);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/20 bg-linear-to-r from-white/5 to-white/7 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10",
          compareAssetId && "border-primary/40 text-primary",
          className,
        )}
      >
        <ArrowLeftRightIcon className="size-3.5" />
        Compare
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className="flex w-[333px] max-w-[333px] flex-col overflow-hidden rounded-xl border border-white/20 bg-black/50 p-0 text-white backdrop-blur-sm"
        finalFocus={false}
      >
        <div className="shrink-0 px-4 py-4 md:px-6">
          <h4 className="text-base font-medium text-white/80 md:text-lg">Compare Asset</h4>
        </div>

        <div className="max-h-[280px] min-h-0 overflow-y-auto px-4 md:px-6">
          <div className="space-y-2 pb-2">
            {compareOptions.length > 0 ? (
              compareOptions.map((item) => (
                <CompareAssetRow
                  key={item.id}
                  item={item}
                  isActive={compareAssetId === item.id}
                  onSelect={() => handleSelect(item.id)}
                />
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-white/15 px-3 py-5 text-center text-sm text-white/50">
                No assets available to compare.
              </p>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-white/10 px-4 py-3 md:px-6">
          <RemoveComparisonRow onRemove={handleRemove} />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
