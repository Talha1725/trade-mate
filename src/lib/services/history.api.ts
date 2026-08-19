import { ROUTES } from "@/constants/routes";
import { get } from "@/lib/utils/api";
import type { AccountLedgerResponse } from "@/types/dashboard";

export const historyApi = {
  getAccountLedger(
    accountId: string,
    authToken?: string,
    query?: { page?: number; limit?: number },
  ): Promise<AccountLedgerResponse> {
    return get(ROUTES.TRADE.ACCOUNT(accountId), {
      params: { status: "CLOSED", page: query?.page, limit: query?.limit },
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
    });
  },
};
