import { ROUTES } from "@/constants/routes";
import { get, patch } from "@/lib/utils/api";
import type { OrderOverviewResponse } from "@/types/orders";
import type { TradeProtectionModification, TradeProtectionModificationResponse } from "@/types/orders-api";

export const ordersApi = {
  getOverview(
    authToken?: string,
    params?: {
      accountId?: string;
      symbol: string;
      interval?: string;
      historyLimit?: number;
    },
  ): Promise<OrderOverviewResponse> {
    return get<OrderOverviewResponse>(ROUTES.ORDERS.OVERVIEW, {
      params,
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
    });
  },

  modifyProtection(
    payload: TradeProtectionModification,
    authToken?: string,
  ): Promise<TradeProtectionModificationResponse> {
    return patch<TradeProtectionModificationResponse>(ROUTES.TRADE.MODIFY, payload, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
    });
  },
};
