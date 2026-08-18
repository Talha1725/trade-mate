"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { ChallengeProgressCard } from "@/components/analytics/challenge-progress-card";
import { TradingCalendarCard } from "@/components/analytics/trading-calendar-card";
import { RecentTradesTable } from "@/components/orders/recent-trades-table";
import { PageHeader } from "@/components/page-header";
import { PortfolioMetricCards } from "@/components/portfolio/portfolio-metric-cards";
import { PortfolioValueChart } from "@/components/portfolio/portfolio-value-chart";
import { analyticsApi } from "@/lib/services/analytics.api";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useSelectedAccountStore } from "@/lib/stores/account-store";
import { useUserAccounts } from "@/hooks/use-user-accounts";
import type { TradingTimeframe } from "@/types/trading-filter-bar";

const ANALYTICS_TIMEFRAMES: TradingTimeframe[] = ["1m", "5m"];

export default function AnalyticsPage() {
  const token = useAuthStore((state) => state.session?.token ?? null);
  const selectedAccountId = useSelectedAccountStore((state) => state.selectedAccountId);
  const hasHydrated = useSelectedAccountStore((state) => state.hasHydrated);
  const setSelectedAccountId = useSelectedAccountStore((state) => state.setSelectedAccountId);
  const { data: userAccounts } = useUserAccounts();

  const accountListLoaded = userAccounts !== undefined;
  const availableAccounts = React.useMemo(() => userAccounts?.accounts ?? [], [userAccounts?.accounts]);

  const resolvedAccountId = React.useMemo(() => {
    if (!accountListLoaded || !hasHydrated) {
      return null;
    }

    if (selectedAccountId && availableAccounts.some((account) => account.id === selectedAccountId)) {
      return selectedAccountId;
    }

    return availableAccounts[0]?.id ?? null;
  }, [accountListLoaded, availableAccounts, hasHydrated, selectedAccountId]);

  React.useEffect(() => {
    if (!accountListLoaded || !hasHydrated) {
      return;
    }

    if (resolvedAccountId !== selectedAccountId) {
      setSelectedAccountId(resolvedAccountId);
    }
  }, [accountListLoaded, hasHydrated, resolvedAccountId, selectedAccountId, setSelectedAccountId]);

  const analyticsQuery = useQuery({
    queryKey: ["analytics", resolvedAccountId, token],
    enabled: !!token && !!resolvedAccountId,
    queryFn: () => analyticsApi.getOverview(resolvedAccountId ?? "", token ?? undefined),
  });

  const analytics = analyticsQuery.data;

  if (analyticsQuery.isLoading || !analytics) {
    return (
      <AppShell>
        <div className="flex h-[80vh] w-full items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex w-full min-w-0 flex-col gap-6">
        <PageHeader
          title="Analytics"
          description="Review analytics and performance."
        />

        <PortfolioMetricCards
          cards={analytics.statsCards.map(card => card.id === "net-pnl" ? { ...card, chartValues: undefined } : card)}
          className="md:grid-cols-2 xl:grid-cols-3"
        />

        <div className="grid grid-cols-1 items-stretch gap-5 md:gap-6 xl:grid-cols-10 2xl:grid-cols-10 min-[1800px]:grid-cols-10">
          <div className="flex min-h-0 xl:col-span-5 2xl:col-span-5 min-[1800px]:col-span-4!">
            <ChallengeProgressCard
              className="w-full"
              {...analytics.challengeProgress}
            />
          </div>

          <div className="flex min-h-0 xl:col-span-5 2xl:col-span-5 min-[1800px]:col-span-6!">
            <PortfolioValueChart
              title="Equity Curve"
              dataByTimeframe={analytics.equityCurve.dataByTimeframe}
              timeframes={ANALYTICS_TIMEFRAMES}
              defaultTimeframe={analytics.equityCurve.defaultTimeframe}
              showExportButton
              emptyStateMessage="No equity curve data available."
              className="h-[400px] w-full xl:h-auto"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:gap-6 xl:grid-cols-3">
          <TradingCalendarCard {...analytics.calendar} />
          <div className="xl:col-span-2 2xl:col-span-2 min-[1800px]:col-span-2!">
            <RecentTradesTable
              variant="strategy-performance"
              strategies={analytics.strategyPerformance.rows}
              className="h-full"
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
