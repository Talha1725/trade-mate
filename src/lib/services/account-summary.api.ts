import { ROUTES } from "@/constants/routes";
import { get } from "@/lib/utils/api";
import type { AccountMetricsSummary } from "@/types";

export const accountSummaryApi = {
  getAccountSummary(authToken?: string, accountId?: string): Promise<AccountMetricsSummary> {
    return get(ROUTES.ACCOUNT.SUMMARY, {
      params: accountId ? { accountId } : undefined,
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
    });
  },
};

