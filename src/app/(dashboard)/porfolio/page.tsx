"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { PortfolioMetricCards } from "@/components/portfolio/portfolio-metric-cards";
import { PortfolioAllocationCard } from "@/components/portfolio/portfolio-allocation-card";
import { PortfolioExposureBreakdownCard } from "@/components/portfolio/portfolio-exposure-breakdown-card";
import { PortfolioOpenPositionsTable } from "@/components/portfolio/portfolio-open-positions-table";
import { PortfolioTopMoversCard } from "@/components/portfolio/portfolio-top-movers-card";
import { PortfolioValueChart } from "@/components/portfolio/portfolio-value-chart";
import { portfolioApi } from "@/lib/services/portfolio.api";
import { ordersApi } from "@/lib/services/orders.api";
import { terminalApi } from "@/lib/services/terminal.api";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useSelectedAccountStore } from "@/lib/stores/account-store";
import { useUserAccounts } from "@/hooks/use-user-accounts";
import { useSyncedTradingAssets } from "@/hooks/use-synced-trading-assets";
import {
    buildPortfolioAllocationItems,
    buildPortfolioExposureItems,
    buildPortfolioMetricCards,
} from "@/lib/utils/portfolio";
import { calculateLiveFloatingPnl, mapPortfolioPositionToPortfolioRow } from "@/lib/utils/trader-data";
import { getSupplementalQuoteSymbol } from "@/lib/utils/instrument-spec";
import { mergeLivePositions } from "@/lib/utils/live-portfolio";
import { getTradingSymbolAliases, normalizeTradingSymbol } from "@/lib/utils/market-symbol-icon";
import { useLiveAccountSnapshotStore } from "@/lib/stores/live-account-snapshot-store";
import { downloadTextFile } from "@/lib/utils/download";
import { buildAccountMetricsSummaryFromAccount } from "@/lib/utils/live-account-summary";
import type { UserPortfolioResponse } from "@/types/dashboard";
import type { PortfolioOverviewResponse } from "@/types/portfolio-overview";
import { usePriceStream } from "@/hooks/use-price-stream";
import type { PriceSocketPortfolioMessage } from "@/types";
import { useLivePriceStore } from "@/lib/stores/live-price-store";

export default function PortfolioPage() {
    const [snapshot, setSnapshot] = React.useState<UserPortfolioResponse | null>(null);
    const [overview, setOverview] = React.useState<PortfolioOverviewResponse | null>(null);
    const [isClosingAll, setIsClosingAll] = React.useState(false);
    const token = useAuthStore((state) => state.session?.token ?? null);
    const selectedAccountId = useSelectedAccountStore((state) => state.selectedAccountId);
    const hasHydrated = useSelectedAccountStore((state) => state.hasHydrated);
    const setSelectedAccountId = useSelectedAccountStore((state) => state.setSelectedAccountId);
    const { data: userAccounts } = useUserAccounts();
    const { data: tradingAssets = [] } = useSyncedTradingAssets();
    const positionOrderRef = React.useRef(new Map<string, number>());
    const positionOrderCounterRef = React.useRef(0);
    const liveQuotes = useLivePriceStore((state) => state.quotes);
    const liveQuotePrices = React.useMemo(
        () =>
            Object.fromEntries(
                Object.values(liveQuotes).map((quote) => [quote.symbol.toUpperCase(), quote.price]),
            ) as Record<string, number>,
        [liveQuotes],
    );
    const accountListLoaded = userAccounts !== undefined;
    const availableAccounts = userAccounts?.accounts ?? [];
    const assetCategoryBySymbol = React.useMemo(
        () =>
            new Map(
                tradingAssets.map((asset) => [asset.symbol.toUpperCase(), asset.category]),
            ),
        [tradingAssets],
    );

    const resolveLiveQuoteForSymbol = React.useCallback(
        (symbol: string) => {
            const normalizedSymbols = new Set(getTradingSymbolAliases(symbol));

            return (
                Object.values(liveQuotes).find((quote) => normalizedSymbols.has(normalizeTradingSymbol(quote.symbol))) ??
                null
            );
        },
        [liveQuotes],
    );

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

    React.useEffect(() => {
        setSnapshot(null);
        setOverview(null);
        positionOrderRef.current.clear();
        positionOrderCounterRef.current = 0;
    }, [resolvedAccountId, token]);

    const normalizeOpenPositions = React.useCallback(
        (positions: UserPortfolioResponse["positions"]) => {
            const seen = new Set<string>();

            return positions.filter((position) => {
                if (position.status !== "OPEN" || seen.has(position.id)) {
                    return false;
                }

                if (resolvedAccountId && position.accountId !== resolvedAccountId) {
                    return false;
                }

                seen.add(position.id);
                return true;
            });
        },
        [resolvedAccountId],
    );
    const refreshOverview = React.useCallback(async () => {
        if (!token || !accountListLoaded || !resolvedAccountId) return;

        try {
            const nextOverview = await portfolioApi.getOverview(resolvedAccountId);
            setOverview(nextOverview);
        } catch {
            setOverview(null);
        }
    }, [accountListLoaded, resolvedAccountId, token]);

    const refreshSnapshot = React.useCallback(async () => {
        if (!token || !accountListLoaded || !resolvedAccountId) return;

        try {
            const nextSnapshot = await terminalApi.getOpenPositions(token, resolvedAccountId);
            setSnapshot({
                ...nextSnapshot,
                positions: normalizeOpenPositions(nextSnapshot.positions),
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unable to load portfolio snapshot.";
            toast.error(message);
            console.error("Unable to load portfolio snapshot.", error);
        }
    }, [accountListLoaded, normalizeOpenPositions, resolvedAccountId, token]);

    React.useEffect(() => {
        void refreshSnapshot();
    }, [refreshSnapshot]);

    React.useEffect(() => {
        void refreshOverview();
    }, [refreshOverview]);

    React.useEffect(() => {
        window.addEventListener("trade-mate:positions-changed", refreshSnapshot);
        window.addEventListener("trade-mate:positions-changed", refreshOverview);
        return () => {
            window.removeEventListener("trade-mate:positions-changed", refreshSnapshot);
            window.removeEventListener("trade-mate:positions-changed", refreshOverview);
        };
    }, [refreshOverview, refreshSnapshot]);

    const positions = React.useMemo(() => {
        const nextPositions =
            snapshot?.positions.map((position) =>
                mapPortfolioPositionToPortfolioRow(
                    position,
                    resolveLiveQuoteForSymbol(position.symbol),
                    assetCategoryBySymbol.get(position.symbol.toUpperCase()) ?? null,
                    liveQuotePrices,
                    tradingAssets,
                ),
            ) ?? [];

        for (const position of nextPositions) {
            if (!positionOrderRef.current.has(position.id)) {
                positionOrderRef.current.set(position.id, positionOrderCounterRef.current += 1);
            }
        }

        return [...nextPositions].sort((left, right) => {
            const leftOrder = positionOrderRef.current.get(left.id) ?? Number.MAX_SAFE_INTEGER;
            const rightOrder = positionOrderRef.current.get(right.id) ?? Number.MAX_SAFE_INTEGER;
            return leftOrder - rightOrder;
        });
    }, [assetCategoryBySymbol, liveQuotePrices, resolveLiveQuoteForSymbol, snapshot?.positions, tradingAssets]);

    const openPositionSymbols = React.useMemo(
        () =>
            Array.from(
                new Set((snapshot?.positions ?? []).map((position) => position.symbol.toUpperCase()).filter(Boolean)),
            ),
        [snapshot?.positions],
    );

    const liveMetricOverview = React.useMemo(() => {
        if (!overview) {
            return null;
        }

        const liveOpenPositions = (snapshot?.positions ?? []).filter((position) => position.status === "OPEN");
        const winningPositionsCount = liveOpenPositions.filter((position) => Number(position.floatingPnl) > 0).length;
        const losingPositionsCount = liveOpenPositions.filter((position) => Number(position.floatingPnl) < 0).length;

        return {
            ...overview,
            summary: {
                ...overview.summary,
                winningPositionsCount,
                losingPositionsCount,
            },
        };
    }, [overview, snapshot?.positions]);

    const metricCards = React.useMemo(
        () => buildPortfolioMetricCards(
            snapshot?.account ?? null,
            liveMetricOverview,
            calculateLiveFloatingPnl(snapshot?.positions ?? [], liveQuotes, liveQuotePrices, tradingAssets),
        ),
        [liveMetricOverview, liveQuotePrices, liveQuotes, snapshot?.account, snapshot?.positions, tradingAssets],
    );

    const allocationItems = React.useMemo(() => {
        if (!snapshot?.account) {
            return overview?.allocation.items ?? [];
        }

        return buildPortfolioAllocationItems(snapshot.account, snapshot.positions, liveQuotePrices, tradingAssets);
    }, [liveQuotePrices, overview?.allocation.items, snapshot?.account, snapshot?.positions, tradingAssets]);

    const exposureItems = React.useMemo(() => {
        if (!snapshot?.positions) {
            return [];
        }

        return buildPortfolioExposureItems(snapshot.positions, tradingAssets);
    }, [snapshot?.positions, tradingAssets]);

    const accountId = resolvedAccountId;
    const supplementalQuoteSymbols = React.useMemo(
        () =>
            Array.from(
                new Set(
                    openPositionSymbols
                        .map((symbol) => getSupplementalQuoteSymbol(symbol, tradingAssets))
                        .filter(Boolean) as string[],
                ),
            ),
        [openPositionSymbols, tradingAssets],
    );
    const subscriptionSymbols = React.useMemo(
        () =>
            Array.from(
                new Set(
                    [...openPositionSymbols, ...supplementalQuoteSymbols].filter(Boolean) as string[],
                ),
            ),
        [openPositionSymbols, supplementalQuoteSymbols],
    );

    const resolvePortfolioAccount = React.useCallback(
        (payload: PriceSocketPortfolioMessage) => {
            if (accountId) {
                const matchedAccount = payload.accounts.find((item) => item.id === accountId);

                if (matchedAccount) {
                    return matchedAccount;
                }

                return null;
            }

            return payload.accounts[0] ?? null;
        },
        [accountId],
    );

    usePriceStream({
        enabled: !!token && !!accountId,
        symbols: subscriptionSymbols,
        accountIds: accountId ? [accountId] : [],
        onPortfolio: (payload: PriceSocketPortfolioMessage) => {
            const account = resolvePortfolioAccount(payload);

            if (!account) {
                return;
            }

            const closedIds = new Set(
                payload.trades
                    .filter((trade) => trade.status === "CLOSED" && trade.positionId)
                    .map((trade) => trade.positionId as string),
            );

            setSnapshot((current) => {
                if (!current) {
                    return {
                        account,
                        positions: normalizeOpenPositions(payload.positions),
                    };
                }

                return {
                    ...current,
                    account,
                    positions: normalizeOpenPositions(
                        mergeLivePositions(
                            current.positions,
                            payload.positions,
                            { closedIds },
                        ),
                    ),
                };
            });
        },
    });

    const handleClosePosition = React.useCallback(
        async (positionId: string) => {
            if (!token) return;

            try {
                const result = await terminalApi.closeTrade({ positionId }, token);

                setSnapshot((current) => {
                    if (!current) {
                        return {
                            account: result.account,
                            positions: [],
                        };
                    }

                    return {
                        ...current,
                        account: result.account,
                        positions: current.positions.filter((position) => position.id !== result.position.id),
                    };
                });

                const currentSummary =
                    useLiveAccountSnapshotStore.getState().summariesByAccountId[result.account.id] ?? null;
                useLiveAccountSnapshotStore.getState().setAccountSummary(
                    buildAccountMetricsSummaryFromAccount(result.account, currentSummary),
                );

                toast.success("Position closed.");
                window.dispatchEvent(new Event("trade-mate:positions-changed"));
                await refreshSnapshot();
                await refreshOverview();
            } catch (error) {
                toast.error(error instanceof Error ? error.message : "Unable to close position.");
            }
        },
        [refreshOverview, refreshSnapshot, token],
    );

    const handleModifyProtection = React.useCallback(
        async (input: { positionId: string; stopLoss: number | null; takeProfit: number | null }) => {
            if (!token) throw new Error("You must be signed in to modify protection.");
      const result = await ordersApi.modifyProtection(input, token);
      toast.success("Trade updated successfully");
            window.dispatchEvent(new Event("trade-mate:positions-changed"));
            await refreshSnapshot();
            await refreshOverview();
            return { status: result.sync.status };
        },
        [refreshOverview, refreshSnapshot, token],
    );

    const handleCloseAll = React.useCallback(async () => {
        if (!token || positions.length === 0) return;

        try {
            setIsClosingAll(true);
            await Promise.all(positions.map((position) => terminalApi.closeTrade({ positionId: position.id }, token)));
            toast.success("All open positions closed.");
            window.dispatchEvent(new Event("trade-mate:positions-changed"));
            await refreshSnapshot();
            await refreshOverview();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to close all positions.");
        } finally {
            setIsClosingAll(false);
        }
    }, [positions, refreshOverview, refreshSnapshot, token]);

    const handleExport = React.useCallback(() => {
        if (positions.length === 0) return;

        const rows = positions.map((position) =>
            [position.symbol, position.side, position.size, position.avgEntry, position.markPrice, position.pnl].join(","),
        );
        const csv = [["Symbol", "Side", "Size", "Entry", "Mark", "PnL"].join(","), ...rows].join("\n");
        downloadTextFile("portfolio-open-positions.csv", csv, "text/csv");
    }, [positions]);

    if (!snapshot || !overview) {
        return (
            <div className="flex h-[80vh] w-full items-center justify-center">
                <Loader2 className="size-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex w-full min-w-0 flex-col gap-6">
                <PageHeader
                    title="Portfolio"
                    description="Portfolio overview, equity curve, and trading performance."
                />
                <PortfolioMetricCards cards={metricCards} />

                {/* 2 grid card  */}
                <div className="grid grid-cols-1 items-stretch gap-5 md:gap-6 xl:grid-cols-10">
                    <div className="flex xl:min-h-0 xl:col-span-6">
                        <PortfolioValueChart
                            className="w-full h-[400px] xl:h-auto"
                            dataByTimeframe={overview?.chart.dataByTimeframe ?? {}}
                            defaultTimeframe={overview?.chart.defaultTimeframe ?? "4H"}
                        />
                    </div>
                    <div className="flex xl:min-h-0 xl:col-span-4">
                        <PortfolioAllocationCard
                            className="w-full "
                            items={allocationItems}
                        />
                    </div>
                </div>
                {/* 2 grid card  */}
                <div className="grid grid-cols-1 gap-5 md:gap-6  xl:grid-cols-2">
                    <PortfolioExposureBreakdownCard
                        badgeLabel={overview?.exposure.badgeLabel}
                        items={exposureItems}
                    />
                    <PortfolioTopMoversCard items={overview?.topMovers.items ?? []} />
                </div>

                {/* Open Positions Table */}
                <PortfolioOpenPositionsTable
                    positions={positions}
                    onCancel={handleClosePosition}
                    onModifyProtection={handleModifyProtection}
                    onCloseAll={handleCloseAll}
                    isCloseAllLoading={isClosingAll}
                    onExport={handleExport}
                />
            </div>
    );
}
