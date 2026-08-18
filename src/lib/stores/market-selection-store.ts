"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { MarketSelectionStore } from "@/types/market-selection-store";
import type { TradingTimeframe } from "@/types/trading-filter-bar";
import { TRADING_TIMEFRAMES } from "@/constants/trading-timeframes";

const DEFAULT_TIMEFRAME: TradingTimeframe = "4H";

function normalizeTimeframe(timeframe: TradingTimeframe) {
  return TRADING_TIMEFRAMES.includes(timeframe) ? timeframe : DEFAULT_TIMEFRAME;
}

function normalizeSelectedMarketId(
  marketId: string,
  validAssetIds: Set<string>,
  fallbackId: string,
) {
  return validAssetIds.has(marketId) ? marketId : fallbackId;
}

function normalizeCompareAssetId(
  compareAssetId: string | null,
  validAssetIds: Set<string>,
  selectedMarketId: string,
) {
  if (!compareAssetId || !validAssetIds.has(compareAssetId)) {
    return null;
  }

  if (compareAssetId === selectedMarketId) {
    return null;
  }

  return compareAssetId;
}

function getPreferredAssetId(assets: { id: string; symbol: string; category: string }[]) {
  const preferredAsset =
    assets.find((asset) => asset.symbol.toUpperCase() === "EURUSD") ??
    assets.find((asset) => asset.category === "FOREX") ??
    assets[0];

  return preferredAsset?.id ?? "";
}

export const useMarketSelectionStore = create<MarketSelectionStore>()(
  persist(
    (set, get) => ({
      selectedMarketId: "",
      compareAssetId: null,
      timeframe: DEFAULT_TIMEFRAME,
      knownAssetIds: [],
      hasHydrated: false,
      setSelectedMarketId: (marketId) => {
        const validAssetIds = new Set(get().knownAssetIds);

        if (validAssetIds.size > 0 && !validAssetIds.has(marketId)) {
          return;
        }

        const nextState: Partial<Pick<MarketSelectionStore, "selectedMarketId" | "compareAssetId">> = {
          selectedMarketId: marketId,
        };

        if (get().compareAssetId === marketId) {
          nextState.compareAssetId = null;
        }

        set(nextState);
      },
      setCompareAssetId: (assetId) => {
        const { knownAssetIds, selectedMarketId } = get();

        if (assetId !== null) {
          if (knownAssetIds.length > 0 && !knownAssetIds.includes(assetId)) {
            return;
          }

          if (assetId === selectedMarketId) {
            return;
          }
        }

        set({ compareAssetId: assetId });
      },
      setTimeframe: (timeframe) => {
        set({ timeframe: normalizeTimeframe(timeframe) });
      },
      syncAssets: (assets) => {
        const validAssetIds = new Set(assets.map((asset) => asset.id));
        const fallbackId = getPreferredAssetId(assets);
        const state = get();

        if (validAssetIds.size === 0) {
          set({ knownAssetIds: [] });
          return;
        }

        const selectedMarketId = normalizeSelectedMarketId(
          state.selectedMarketId,
          validAssetIds,
          fallbackId,
        );

        set({
          knownAssetIds: Array.from(validAssetIds),
          selectedMarketId,
          compareAssetId: normalizeCompareAssetId(
            state.compareAssetId,
            validAssetIds,
            selectedMarketId,
          ),
        });
      },
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      // Reset the persisted chart selection once so existing users start on
      // the new 4H default instead of an older persisted 1m selection.
      name: "trade-mate-market-selection-v2",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedMarketId: state.selectedMarketId,
        compareAssetId: state.compareAssetId,
        timeframe: state.timeframe,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.timeframe = normalizeTimeframe(state.timeframe ?? DEFAULT_TIMEFRAME);
        }

        state?.setHasHydrated(true);
      },
    },
  ),
);
