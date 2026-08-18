"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Star } from "lucide-react";

import { AssetIcon } from "@/components/shared/asset-icon";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAssets } from "@/hooks/use-assets";
import { useSelectedSymbol, useSetSelectedSymbol } from "@/hooks/use-selected-symbol";
import { useSyncedTradingAssets } from "@/hooks/use-synced-trading-assets";
import { useAccountWishlist } from "@/hooks/use-account-wishlist";
import { useResolvedAccountNumber } from "@/hooks/use-resolved-account-number";
import { cn } from "@/lib/utils";
import type { AssetCategory } from "@/types/asset";
import type { TradingFilterBarAsset } from "@/types/trading-filter-bar";
import { SYMBOL_CATEGORY_LABELS, SYMBOL_CATEGORY_ORDER } from "@/constants/symbol-selector";
import type { SymbolSelectorProps } from "@/types/symbol-selector";

/**
 * Searchable, category-grouped symbol selector backed by the shared
 * market-selection store — one selection across the whole app. Styled to match
 * the asset selector in the chart filter bar.
 */
export function SymbolSelector({
  className,
  contentClassName,
  triggerLabel,
}: SymbolSelectorProps) {
  // Keep the store's known assets in sync wherever this selector is mounted.
  useSyncedTradingAssets();
  const { data: assets = [] } = useAssets();
  const selectedSymbol = useSelectedSymbol();
  const setSelectedSymbol = useSetSelectedSymbol();
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const scrollPositionsRef = React.useRef<Array<{ element: HTMLElement; top: number; left: number }>>([]);

  const captureScrollPositions = React.useCallback(() => {
    const positions: Array<{ element: HTMLElement; top: number; left: number }> = [];
    const documentScroller = document.scrollingElement;

    if (documentScroller) {
      positions.push({
        element: documentScroller as HTMLElement,
        top: documentScroller.scrollTop,
        left: documentScroller.scrollLeft,
      });
    }

    let element = triggerRef.current?.parentElement ?? null;

    while (element) {
      if (element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth) {
        positions.push({ element, top: element.scrollTop, left: element.scrollLeft });
      }
      element = element.parentElement;
    }

    scrollPositionsRef.current = positions;
  }, []);

  const restoreScrollPositions = React.useCallback(() => {
    const restore = () => {
      for (const position of scrollPositionsRef.current) {
        position.element.scrollTop = position.top;
        position.element.scrollLeft = position.left;
      }
    };

    restore();
    window.requestAnimationFrame(restore);
    window.setTimeout(restore, 0);
  }, []);

  // Wishlist integration
  const resolvedAccountNumber = useResolvedAccountNumber(undefined);
  const { wishlistAssetIds, toggleWishlistAsset } = useAccountWishlist(resolvedAccountNumber, assets);

  const selectedAsset = assets.find((asset) => asset.symbol === selectedSymbol);

  const groups = React.useMemo(() => {
    const byCategory = new Map<AssetCategory, TradingFilterBarAsset[]>();

    for (const asset of assets) {
      const list = byCategory.get(asset.category) ?? [];
      list.push(asset);
      byCategory.set(asset.category, list);
    }

    return SYMBOL_CATEGORY_ORDER.filter((category) => byCategory.has(category)).map((category) => ({
      category,
      items: byCategory.get(category)!,
    }));
  }, [assets]);

  if (assets.length === 0) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        onMouseDown={(event) => {
          captureScrollPositions();
          // Prevent the browser from scrolling the page to the trigger when
          // the popover restores focus after opening.
          event.preventDefault();
        }}
        onClick={restoreScrollPositions}
        className={cn(
          "flex h-9 cursor-pointer items-center justify-between gap-2 rounded-lg border border-white/20 bg-neutral-900 bg-linear-to-b from-[#6E6E6E1A] to-[#13131505] px-3 text-sm font-medium text-white shadow-none hover:border-primary hover:bg-white/15 hover:text-white",
          className,
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          {!triggerLabel && selectedAsset ? (
            <AssetIcon symbol={selectedAsset.symbol} label={selectedAsset.label} size={20} />
          ) : null}
          <span className="truncate">
            {triggerLabel ?? selectedAsset?.label ?? selectedSymbol ?? "Select symbol"}
          </span>
        </span>
        {!triggerLabel ? <ChevronsUpDown className="size-4 shrink-0 opacity-60" /> : null}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn(
          "w-[260px] rounded-lg border border-white/20 bg-[#0d0d0d] p-0 text-white",
          contentClassName,
        )}
      >
        <Command className="bg-transparent">
          <div className="sticky top-0 z-10 bg-[#0d0d0d] border-b border-white/10 pb-2.5 pt-1 px-1">
            <CommandInput placeholder="Search symbol..." className="text-white" />
          </div>
          <CommandList className="max-h-[250px]">
            <CommandEmpty>No symbol found.</CommandEmpty>
            {groups.map(({ category, items }) => (
              <CommandGroup key={category} heading={SYMBOL_CATEGORY_LABELS[category]}>
                {items.map((asset) => (
                  <CommandItem
                    key={asset.id}
                    value={`${asset.label} ${asset.symbol}`}
                    onSelect={() => {
                      setSelectedSymbol(asset.symbol);
                      setOpen(false);
                    }}
                    className="cursor-pointer text-white data-[selected=true]:bg-white/10 data-[selected=true]:text-white"
                  >
                    <AssetIcon symbol={asset.symbol} label={asset.label} size={20} />
                    <span className="min-w-0 flex-1 truncate">{asset.label}</span>
                    <span className="shrink-0 text-xs text-white/50">{asset.symbol}</span>
                    
                    <button
                      type="button"
                      aria-label={wishlistAssetIds.includes(asset.id) ? `Remove ${asset.label} from watchlist` : `Add ${asset.label} to watchlist`}
                      className={cn(
                        "pointer-events-auto shrink-0 rounded-md p-1 transition-colors ml-2 cursor-pointer text-white/60 hover:bg-white/10 hover:text-primary",
                      )}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        toggleWishlistAsset?.(asset.id);
                      }}
                    >
                      <Star
                        className={cn(
                          "size-4",
                          wishlistAssetIds.includes(asset.id) ? "fill-primary text-primary" : "text-white/60",
                        )}
                      />
                    </button>

                    <Check
                      className={cn(
                        "ml-1 size-4 text-primary",
                        asset.symbol === selectedSymbol ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
