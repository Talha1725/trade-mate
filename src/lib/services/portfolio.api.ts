import { ROUTES } from "@/constants/routes";
import { get } from "@/lib/utils/api";
import type { PortfolioOverviewResponse } from "@/types/portfolio-overview";

export const portfolioApi = {
  getOverview(accountId?: string): Promise<PortfolioOverviewResponse> {
    return get(ROUTES.PORTFOLIO.OVERVIEW, {
      params: accountId ? { accountId } : undefined,
    });
  },

  getSummary(accountId?: string): Promise<Pick<PortfolioOverviewResponse, "accountId" | "accountNumber" | "fundingType" | "generatedAt" | "summary">> {
    return get(ROUTES.PORTFOLIO.SUMMARY, {
      params: accountId ? { accountId } : undefined,
    });
  },

  getChart(
    accountId?: string,
    timeframe?: PortfolioOverviewResponse["chart"]["defaultTimeframe"],
  ): Promise<Pick<PortfolioOverviewResponse, "accountId" | "accountNumber" | "fundingType" | "generatedAt" | "chart">> {
    return get(ROUTES.PORTFOLIO.CHART, {
      params: {
        ...(accountId ? { accountId } : {}),
        ...(timeframe ? { timeframe } : {}),
      },
    });
  },

  getAllocation(accountId?: string): Promise<Pick<PortfolioOverviewResponse, "accountId" | "accountNumber" | "fundingType" | "generatedAt" | "allocation">> {
    return get(ROUTES.PORTFOLIO.ALLOCATION, {
      params: accountId ? { accountId } : undefined,
    });
  },

  getExposure(accountId?: string): Promise<Pick<PortfolioOverviewResponse, "accountId" | "accountNumber" | "fundingType" | "generatedAt" | "exposure">> {
    return get(ROUTES.PORTFOLIO.EXPOSURE, {
      params: accountId ? { accountId } : undefined,
    });
  },

  getTopMovers(accountId?: string): Promise<Pick<PortfolioOverviewResponse, "accountId" | "accountNumber" | "fundingType" | "generatedAt" | "topMovers">> {
    return get(ROUTES.PORTFOLIO.TOP_MOVERS, {
      params: accountId ? { accountId } : undefined,
    });
  },
};
