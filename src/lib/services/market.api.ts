import { ROUTES } from "@/constants/routes";
import { get } from "@/lib/utils/api";
import type { MarketSnapshotResponse } from "@/types/market-snapshot";

export const marketApi = {
  getSnapshot(symbol: string, interval: string = "1d"): Promise<MarketSnapshotResponse> {
    return get<MarketSnapshotResponse>(ROUTES.MARKET.SNAPSHOT, {
      params: { symbol, interval },
    });
  },
};
