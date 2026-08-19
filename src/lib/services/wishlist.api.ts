import { ROUTES } from "@/constants/routes";
import { del, get, post } from "@/lib/utils/api";
import type { AddToWishlistPayload, WishlistResponse } from "@/types/wishlist";

export const wishlistApi = {
  getWishlist(accountNumber: string): Promise<WishlistResponse> {
    return get<WishlistResponse>(ROUTES.ACCOUNT.WISHLIST(accountNumber));
  },

  addToWishlist(accountNumber: string, payload: AddToWishlistPayload): Promise<WishlistResponse> {
    return post<WishlistResponse>(ROUTES.ACCOUNT.WISHLIST(accountNumber), payload);
  },

  removeFromWishlist(accountNumber: string, assetId: string): Promise<WishlistResponse> {
    return del<WishlistResponse>(ROUTES.ACCOUNT.WISHLIST_ITEM(accountNumber, assetId));
  },
};
