import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { wishlistApi } from "@/lib/services/wishlist.api";
import { mapAssetRecordsToTradingFilterAssets } from "@/lib/utils/map-trading-assets";
import { mapWishlistAssetsToWatchItems } from "@/lib/utils/map-wishlist-items";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { AssetRecord } from "@/types/asset";
import type { TradingFilterBarAsset } from "@/types/trading-filter-bar";
import type { WishlistResponse } from "@/types/wishlist";

function getWishlistQueryKey(accountNumber: string) {
  return ["accounts", accountNumber, "wishlist"] as const;
}

function toWishlistAssetRecord(
  asset: TradingFilterBarAsset,
  sortOrder: number,
): AssetRecord {
  const timestamp = new Date().toISOString();

    return {
      id: asset.id,
      label: asset.label,
      symbol: asset.symbol,
      category: asset.category,
      contractSize: asset.contractSize,
      quoteCurrency: asset.quoteCurrency,
      leverage: asset.leverage,
      isActive: true,
      sortOrder,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
}

export function useAccountWishlist(
  accountNumber: string | null,
  availableAssets: TradingFilterBarAsset[] = [],
) {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.session?.token ?? null);

  const wishlistQuery = useQuery({
    queryKey: accountNumber ? getWishlistQueryKey(accountNumber) : ["accounts", "wishlist", "disabled"],
    enabled: !!token && !!accountNumber,
    queryFn: () => wishlistApi.getWishlist(accountNumber!),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const wishlistAssets = React.useMemo(
    () => mapAssetRecordsToTradingFilterAssets(wishlistQuery.data?.assets ?? []),
    [wishlistQuery.data?.assets],
  );

  const wishlistAssetIds = React.useMemo(
    () => wishlistAssets.map((asset) => asset.id),
    [wishlistAssets],
  );

  const watchlistItems = React.useMemo(
    () => mapWishlistAssetsToWatchItems(wishlistQuery.data?.assets ?? []),
    [wishlistQuery.data?.assets],
  );

  const setWishlistCache = React.useCallback(
    (data: WishlistResponse) => {
      if (!accountNumber) {
        return;
      }

      queryClient.setQueryData(getWishlistQueryKey(accountNumber), data);
    },
    [accountNumber, queryClient],
  );

  const invalidateWishlist = React.useCallback(async () => {
    if (!accountNumber) {
      return;
    }

    await queryClient.invalidateQueries({
      queryKey: getWishlistQueryKey(accountNumber),
    });
  }, [accountNumber, queryClient]);

  const addMutation = useMutation({
    mutationFn: (assetId: string) =>
      wishlistApi.addToWishlist(accountNumber!, { assetId }),
    onMutate: async (assetId) => {
      if (!accountNumber) {
        return;
      }

      const queryKey = getWishlistQueryKey(accountNumber);
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<WishlistResponse>(queryKey);
      const asset = availableAssets.find((item) => item.id === assetId);

      if (!previous || !asset || previous.assets.some((item) => item.id === assetId)) {
        return { previous };
      }

      const nextData: WishlistResponse = {
        assets: [
          ...previous.assets,
          toWishlistAssetRecord(asset, previous.assets.length),
        ],
      };

      queryClient.setQueryData(queryKey, nextData);

      return { previous };
    },
    onSuccess: (data) => {
      setWishlistCache(data);
    },
    onError: (_error, _assetId, context) => {
      if (!accountNumber || !context?.previous) {
        return;
      }

      queryClient.setQueryData(getWishlistQueryKey(accountNumber), context.previous);
    },
    onSettled: () => {
      void invalidateWishlist();
    },
  });

  const removeMutation = useMutation({
    mutationFn: (assetId: string) =>
      wishlistApi.removeFromWishlist(accountNumber!, assetId),
    onMutate: async (assetId) => {
      if (!accountNumber) {
        return;
      }

      const queryKey = getWishlistQueryKey(accountNumber);
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<WishlistResponse>(queryKey);

      if (!previous) {
        return { previous };
      }

      queryClient.setQueryData(queryKey, {
        assets: previous.assets.filter((asset) => asset.id !== assetId),
      });

      return { previous };
    },
    onSuccess: (data) => {
      setWishlistCache(data);
    },
    onError: (_error, _assetId, context) => {
      if (!accountNumber || !context?.previous) {
        return;
      }

      queryClient.setQueryData(getWishlistQueryKey(accountNumber), context.previous);
    },
    onSettled: () => {
      void invalidateWishlist();
    },
  });

  const toggleWishlistAsset = React.useCallback(
    (assetId: string) => {
      if (!accountNumber) {
        return;
      }

      const current = queryClient.getQueryData<WishlistResponse>(
        getWishlistQueryKey(accountNumber),
      );
      const isInWishlist = current?.assets.some((asset) => asset.id === assetId) ?? false;

      if (isInWishlist) {
        removeMutation.mutate(assetId);
        return;
      }

      addMutation.mutate(assetId);
    },
    [accountNumber, addMutation, queryClient, removeMutation],
  );

  return {
    watchlistItems,
    wishlistAssetIds,
    wishlistAssets,
    toggleWishlistAsset,
    isLoading: wishlistQuery.isLoading,
    isFetching: wishlistQuery.isFetching,
    isMutating: addMutation.isPending || removeMutation.isPending,
  };
}
