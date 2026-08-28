import { ROUTES } from "@/constants/routes";
import { get } from "@/lib/utils/api";
import type { AccountLedgerResponse, UserPortfolioResponse } from "@/types/dashboard";

export const dashboardApi = {
  getPortfolioSnapshot(authToken?: string, accountId?: string): Promise<UserPortfolioResponse> {
    return get(ROUTES.POSITION.LIST, {
      params: accountId ? { accountId } : undefined,
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
    });
  },

  getAccountLedger(accountId: string, authToken?: string): Promise<AccountLedgerResponse> {
    return get(ROUTES.TRADE.ACCOUNT(accountId), {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
    });
  },
};
