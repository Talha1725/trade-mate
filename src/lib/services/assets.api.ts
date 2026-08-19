import { ROUTES } from "@/constants/routes";
import { get } from "@/lib/utils/api";
import type { AssetsListResponse } from "@/types/asset";

export const assetsApi = {
  getAssets(): Promise<AssetsListResponse> {
    return get<AssetsListResponse>(ROUTES.ASSETS.LIST);
  },
};
