import { ROUTES } from "@/constants/routes";
import { get } from "@/lib/utils/api";
import type { AnalyticsOverviewResponse } from "@/types/analytics";

export const analyticsApi = {
  getOverview(accountId: string, authToken?: string): Promise<AnalyticsOverviewResponse> {
    return get<AnalyticsOverviewResponse>(ROUTES.ANALYTICS.OVERVIEW, {
      params: { accountId },
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
    });
  },
};
