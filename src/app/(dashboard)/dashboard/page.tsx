"use client";

import * as React from "react";
import { toast } from "sonner";

import { LiveTradingView } from "@/components/common/live-trading-view";
import { MarketSnapshotCard } from "@/components/dashboard/market-snapshot-card";
import { MarketWatchCard } from "@/components/dashboard/market-watch-card";
import { OpenPositionsStripCard } from "@/components/dashboard/open-positions-strip-card";
import { TradingFilterBar } from "@/components/dashboard/trading-filter-bar";
import { PageHeader } from "@/components/page-header";
import { dashboardApi } from "@/lib/services/dashboard.api";
import { marketApi } from "@/lib/services/market.api";
import { terminalApi } from "@/lib/services/terminal.api";
import { ordersApi } from "@/lib/services/orders.api";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useMarketSelectionStore } from "@/lib/stores/market-selection-store";
import { useSelectedAccountStore } from "@/lib/stores/account-store";
import { mapTimeframeToMarketInterval } from "@/lib/utils/trading-view";
import {
  buildDashboardData,
  mapPortfolioPositionToPortfolioRow,
} from "@/lib/utils/trader-data";
import { getSupplementalQuoteSymbol } from "@/lib/utils/instrument-spec";
import { mergeStablePositions } from "@/lib/utils/stable-positions";
import { mergeLivePositions, mergeLiveTrades } from "@/lib/utils/live-portfolio";
import { normalizeTradingSymbol } from "@/lib/utils/market-symbol-icon";
import { resolveMarketWatchIcon } from "@/lib/utils/market-symbol-icon";
import { formatTradingPrice } from "@/lib/utils/price-formatters";
import type { AccountLedgerResponse, UserPortfolioResponse } from "@/types/dashboard";
import type { MarketSnapshotChartSummary, MarketSnapshotData } from "@/types/market-snapshot";
import type { MarketWatchItem } from "@/types/market-watch-card";
import type { OpenPositionStripItem } from "@/types/open-positions-strip";
import type { PortfolioPosition } from "@/types/dashboard";
import type { PriceSocketPortfolioMessage, PriceSocketQuote } from "@/types";
import type { ChartCandle } from "@/types/eodhd";
import { usePriceStream } from "@/hooks/use-price-stream";
import { useAccountWishlist } from "@/hooks/use-account-wishlist";
import { useEodhdMarketQuotes } from "@/hooks/use-eodhd-market-quotes";
import { useResolvedAccountNumber } from "@/hooks/use-resolved-account-number";
import { useSyncedTradingAssets } from "@/hooks/use-synced-trading-assets";
import { getTradingSymbolAliases } from "@/lib/utils/market-symbol-icon";

export default function DashboardPage() {
  const [snapshot, setSnapshot] = React.useState<UserPortfolioResponse | null>(null);
  const [ledger, setLedger] = React.useState<AccountLedgerResponse | null>(null);
  const [marketSnapshot, setMarketSnapshot] = React.useState<MarketSnapshotData | null>(null);
  const [marketChart, setMarketChart] = React.useState<MarketSnapshotChartSummary | null>(null);
  const [chartOhlcvCandle, setChartOhlcvCandle] = React.useState<ChartCandle | null>(null);
  const [liveQuotes, setLiveQuotes] = React.useState<Record<string, PriceSocketQuote>>({});
  const livePositionMissingCountsRef = React.useRef(new Map<string, number>());
  const locallyClosedPositionIdsRef = React.useRef(new Set<string>());

  const selectedMarketId = useMarketSelectionStore((state) => state.selectedMarketId);
  const setSelectedMarketId = useMarketSelectionStore((state) => state.setSelectedMarketId);
  const compareAssetId = useMarketSelectionStore((state) => state.compareAssetId);
  const setCompareAssetId = useMarketSelectionStore((state) => state.setCompareAssetId);
  const timeframe = useMarketSelectionStore((state) => state.timeframe);
  const setTimeframe = useMarketSelectionStore((state) => state.setTimeframe);

  const token = useAuthStore((state) => state.session?.token ?? null);
  const selectedAccountId = useSelectedAccountStore((state) => state.selectedAccountId);
  const hasHydrated = useSelectedAccountStore((state) => state.hasHydrated);
  const { data: tradingAssets = [] } = useSyncedTradingAssets();
  const assetCategoryBySymbol = React.useMemo(
    () => new Map(tradingAssets.map((asset) => [asset.symbol.toUpperCase(), asset.category])),
    [tradingAssets],
  );
  const liveQuotePrices = React.useMemo(
    () =>
      Object.fromEntries(
        Object.values(liveQuotes).map((quote) => [quote.symbol.toUpperCase(), quote.price]),
      ) as Record<string, number>,
    [liveQuotes],
  );

  const resolvedAccountId = React.useMemo(() => {
    if (!hasHydrated) {
      return null;
    }

    return selectedAccountId;
  }, [hasHydrated, selectedAccountId]);

  React.useEffect(() => {
    if (!token) {
      return;
    }

    let isMounted = true;

    const refreshDashboard = async () => {
      try {
        const accountSnapshot = await dashboardApi.getPortfolioSnapshot(
          token,
          resolvedAccountId ?? undefined,
        );

        if (!isMounted) {
          return;
        }

        setSnapshot((current) => {
          if (!current) {
            return {
              ...accountSnapshot,
              positions: accountSnapshot.positions.filter(
                (position) => !locallyClosedPositionIdsRef.current.has(position.id),
              ),
            };
          }

          return {
            ...accountSnapshot,
            positions: mergeStablePositions(
              current.positions,
              accountSnapshot.positions,
              livePositionMissingCountsRef.current,
            ).filter((position) => !locallyClosedPositionIdsRef.current.has(position.id)),
          };
        });

        const accountLedger = await dashboardApi.getAccountLedger(accountSnapshot.account.id, token);

        if (!isMounted) {
          return;
        }

        setLedger((current) => {
          if (!current) {
            return {
              ...accountLedger,
              positions: accountLedger.positions.filter(
                (position) => !locallyClosedPositionIdsRef.current.has(position.id),
              ),
            };
          }

          return {
            ...accountLedger,
            positions: mergeStablePositions(
              current.positions,
              accountLedger.positions,
              livePositionMissingCountsRef.current,
            ).filter((position) => !locallyClosedPositionIdsRef.current.has(position.id)),
          };
        });
      } catch {
        // Keep the last successful snapshot/ledger visible if a refresh fails.
      }
    };

    void refreshDashboard();

    return () => {
      isMounted = false;
    };
  }, [resolvedAccountId, token]);

  const dashboardData = snapshot ? buildDashboardData(snapshot, ledger ?? undefined, liveQuotePrices, liveQuotes, tradingAssets) : null;
  const liveSymbol = dashboardData?.positions[0]?.symbol;
  const openPortfolioPositions = React.useMemo(
    () => dashboardData?.positions.filter((position) => position.status === "OPEN") ?? [],
    [dashboardData?.positions],
  );

  const livePositions = React.useMemo(
    () =>
      [...openPortfolioPositions].sort((left, right) => {
        const openedAtDifference = new Date(left.openedAt).getTime() - new Date(right.openedAt).getTime();
        return openedAtDifference || left.id.localeCompare(right.id);
      }),
    [openPortfolioPositions],
  );
  const openSymbols = React.useMemo(
    () =>
      Array.from(
        new Set(
          openPortfolioPositions
            .map((position) => position.symbol),
        ),
      ),
    [openPortfolioPositions],
  );
  const accountId = snapshot?.account.id ?? selectedAccountId ?? null;

  const accountNumber = useResolvedAccountNumber(snapshot?.account.accountNumber);
  const {
    watchlistItems: accountWatchlistItems,
    toggleWishlistAsset,
  } = useAccountWishlist(accountNumber, tradingAssets);
  const [liveWatchlistItems, setLiveWatchlistItems] = React.useState<MarketWatchItem[]>([]);
  const watchlistSymbols = React.useMemo(
    () => accountWatchlistItems.map((item) => item.symbol),
    [accountWatchlistItems],
  );
  const { data: watchlistQuoteResponse } = useEodhdMarketQuotes(watchlistSymbols, {
    enabled: Boolean(token && watchlistSymbols.length > 0),
    refetchInterval: 15_000,
  });

  const selectedWatchlistItem = liveWatchlistItems.find((item) => item.id === selectedMarketId);
  const selectedFilterAsset = tradingAssets.find((asset) => asset.id === selectedMarketId);
  const chartSymbol =
    selectedWatchlistItem?.symbol ?? selectedFilterAsset?.symbol ?? liveSymbol ?? "BTCUSDT";
  const compareWatchlistItem = compareAssetId
    ? liveWatchlistItems.find((item) => item.id === compareAssetId)
    : null;
  const compareFilterAsset = compareAssetId
    ? tradingAssets.find((asset) => asset.id === compareAssetId)
    : null;
  const compareSymbol = compareWatchlistItem?.symbol ?? compareFilterAsset?.symbol ?? null;

  const marketInterval = mapTimeframeToMarketInterval(timeframe);

  React.useEffect(() => {
    setChartOhlcvCandle(null);
  }, [chartSymbol, timeframe]);

  React.useEffect(() => {
    if (compareAssetId && compareAssetId === selectedMarketId) {
      setCompareAssetId(null);
    }
  }, [compareAssetId, selectedMarketId]);

  const resolveQuoteForSymbol = React.useCallback((quotes: PriceSocketQuote[], symbol: string) => {
    const normalizedSymbols = new Set(getTradingSymbolAliases(symbol));

    return (
      quotes.find((quote) => normalizedSymbols.has(normalizeTradingSymbol(quote.symbol))) ?? null
    );
  }, []);
  const chartLiveQuote = React.useMemo(
    () => resolveQuoteForSymbol(Object.values(liveQuotes), chartSymbol),
    [chartSymbol, liveQuotes, resolveQuoteForSymbol],
  );
  const compareLiveQuote = React.useMemo(
    () => (compareSymbol ? resolveQuoteForSymbol(Object.values(liveQuotes), compareSymbol) : null),
    [compareSymbol, liveQuotes, resolveQuoteForSymbol],
  );

  React.useEffect(() => {
    const quotes = Object.values(liveQuotes);
    const nextItems = accountWatchlistItems.flatMap((item) => {
      const liveQuote = resolveQuoteForSymbol(quotes, item.symbol);
      const eodhdQuote = Object.values(watchlistQuoteResponse?.quotes ?? {}).find(
        (quote) => normalizeTradingSymbol(quote.symbol) === normalizeTradingSymbol(item.symbol),
      );

      if (!liveQuote && !eodhdQuote) {
        return [];
      }

      return [{
        ...item,
        price: liveQuote?.price ?? eodhdQuote?.price ?? item.price,
        change: liveQuote?.change ?? eodhdQuote?.change ?? null,
        changePercent: liveQuote?.changePercent ?? eodhdQuote?.changePercent ?? item.changePercent,
        high: eodhdQuote?.high ?? null,
        low: eodhdQuote?.low ?? null,
        volume: eodhdQuote?.volume ?? null,
      }];
    });

    setLiveWatchlistItems(nextItems);
  }, [accountWatchlistItems, liveQuotes, resolveQuoteForSymbol, watchlistQuoteResponse]);

  React.useEffect(() => {
    if (!token || !chartSymbol) {
      return;
    }

    let isMounted = true;
    setMarketSnapshot(null);
    setMarketChart(null);

    const refreshMarketSnapshot = async () => {
      try {
        const response = await marketApi.getSnapshot(chartSymbol, marketInterval);

        if (!isMounted) {
          return;
        }

        const initialSparkline = response.snapshot.sparkline.length > 0
          ? [
              ...response.snapshot.sparkline.slice(0, -1),
              { value: response.snapshot.price },
            ]
          : [{ value: response.snapshot.price }];

        setMarketSnapshot({
          ...response.snapshot,
          sparkline: initialSparkline,
        });
        setMarketChart(response.chart);
      } catch {
        if (!isMounted) {
          return;
        }
      }
    };

    void refreshMarketSnapshot();

    return () => {
      isMounted = false;
    };
  }, [chartSymbol, marketInterval, token]);

  const filterBarQuote = React.useMemo(
    () =>
      marketChart
        ? {
            price: marketSnapshot?.price ?? marketChart.close,
            change:
              marketSnapshot?.price != null
                ? marketSnapshot.price * ((marketSnapshot.changePercent ?? 0) / 100)
                : marketChart.change,
            changePercent: marketSnapshot?.changePercent ?? marketChart.changePercent,
          }
        : { price: 0, change: 0, changePercent: 0 },
    [marketChart, marketSnapshot?.changePercent, marketSnapshot?.price],
  );
  const filterBarOhlcv = React.useMemo(
    () =>
      chartOhlcvCandle
        ? {
            open: chartOhlcvCandle.open,
            high: chartOhlcvCandle.high,
            low: chartOhlcvCandle.low,
            volume: chartOhlcvCandle.volume,
          }
        : marketChart
          ? {
              open: marketChart.open,
              high: marketChart.high,
              low: marketChart.low,
              volume: marketChart.volume,
            }
          : { open: 0, high: 0, low: 0, volume: 0 },
    [chartOhlcvCandle, marketChart],
  );

  function buildPositionTrend(entryPrice: number, currentPrice: number, side: "long" | "short") {
    const base = entryPrice || currentPrice || 0;
    const end = currentPrice || base;
    const delta = end - base;
    const amplitude = Math.max(Math.abs(delta) * 0.18, Math.max(base * 0.003, 0.5));

    return Array.from({ length: 8 }, (_, index) => {
      const progress = index / 7;
      const wave = Math.sin(progress * Math.PI * 1.8) * amplitude * 0.28;
      const directionBias = side === "long" ? amplitude * 0.05 : -amplitude * 0.05;
      const value = base + delta * progress + wave + directionBias;

      return { value: Number(value.toFixed(4)) };
    });
  }

  function mapPositionToOpenStripItem(position: PortfolioPosition): OpenPositionStripItem {
    const isLong = position.direction === "BUY";
    const side = isLong ? "long" : "short";
    const liveQuote = liveQuotes[position.symbol.toUpperCase()];
    const assetCategory = assetCategoryBySymbol.get(position.symbol.toUpperCase()) ?? null;
    const portfolioRow = mapPortfolioPositionToPortfolioRow(position, liveQuote ?? null, assetCategory, liveQuotePrices, tradingAssets);
    const entryPrice = Number(position.entryPrice);
    const currentPrice = Number(liveQuote?.price ?? position.currentPrice ?? position.entryPrice);
    const lots = Number(position.lots);
    const sizeUnit = position.symbol.replace(/USD$/i, "") || position.symbol;
    const entryLabelPrice =
      position.symbol.trim().toUpperCase().match(/^(AUD|CAD|CHF|EUR|GBP|JPY|NZD|USD)[A-Z]{3}$/)
        ? entryPrice.toLocaleString("en-US", {
            minimumFractionDigits: 5,
            maximumFractionDigits: 5,
          })
        : formatTradingPrice(entryPrice, position.symbol);

    return {
      id: position.id,
      symbol: position.symbol,
      icon: resolveMarketWatchIcon(position.symbol) ?? "bitcoin",
      side,
      pnl: Number(portfolioRow.pnl.toFixed(2)),
      pnlPercent: Number(portfolioRow.pnlPercent.toFixed(2)),
      sizeLabel: `${lots.toFixed(4)} ${sizeUnit}`,
      entryLabel: `Entry ${entryLabelPrice}`,
      trend: buildPositionTrend(entryPrice, currentPrice, side),
      palette: portfolioRow.pnl >= 0 ? "profit" : "loss",
      entryPrice,
      markPrice: Number.isFinite(currentPrice) ? currentPrice : null,
      stopLoss: position.stopLoss == null ? null : Number(position.stopLoss),
      takeProfit: position.takeProfit == null ? null : Number(position.takeProfit),
      lots,
    };
  }

  const openPositionItems = React.useMemo(
    () => livePositions.slice(0, 4).map(mapPositionToOpenStripItem),
    [livePositions, liveQuotes, tradingAssets],
  );

  const handleClosePosition = React.useCallback(async (positionId: string) => {
    if (!token) return;
    const result = await terminalApi.closeTrade({ positionId }, token);
    locallyClosedPositionIdsRef.current.add(positionId);
    setSnapshot((current) => current ? { ...current, account: result.account, positions: current.positions.filter((position) => position.id !== positionId) } : current);
    setLedger((current) => current ? { ...current, account: result.account, positions: current.positions.filter((position) => position.id !== positionId) } : current);
    toast.success("Position closed.");
  }, [token]);

  const handleModifyProtection = React.useCallback(async (input: { positionId: string; stopLoss: number | null; takeProfit: number | null }) => {
    if (!token) return { status: "FAILED" as const };
    const result = await ordersApi.modifyProtection(input, token);
    setSnapshot((current) => current ? { ...current, positions: current.positions.map((position) => position.id === input.positionId ? { ...position, stopLoss: input.stopLoss == null ? null : String(input.stopLoss), takeProfit: input.takeProfit == null ? null : String(input.takeProfit) } : position) } : current);
    setLedger((current) => current ? { ...current, positions: current.positions.map((position) => position.id === input.positionId ? { ...position, stopLoss: input.stopLoss == null ? null : String(input.stopLoss), takeProfit: input.takeProfit == null ? null : String(input.takeProfit) } : position) } : current);
    toast.success("Trade protection updated.");
    return { status: result.sync.status };
  }, [token]);

  const handleMarketQuotes = React.useCallback(
    (quotes: PriceSocketQuote[]) => {
      const liveQuote = resolveQuoteForSymbol(quotes, chartSymbol);

      if (!liveQuote) {
        return;
      }

      setMarketSnapshot((current) => {
        if (!current) {
          return current;
        }

        const nextSparkline =
          current.sparkline.length > 0
            ? [...current.sparkline.slice(1), { value: liveQuote.price }]
            : current.sparkline;

        return {
          ...current,
          price: liveQuote.price,
          changePercent: liveQuote.changePercent ?? current.changePercent,
          sparkline: nextSparkline,
        };
      });

      setMarketChart((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          close: liveQuote.price,
        };
      });

      setLiveWatchlistItems((current) =>
        current.map((item) => {
          const quote = resolveQuoteForSymbol(quotes, item.symbol);

          if (!quote) {
            return item;
          }

          return {
            ...item,
            price: quote.price,
            change: quote.change ?? item.change ?? null,
            changePercent: quote.changePercent ?? item.changePercent,
          };
        }),
      );

      setLiveQuotes((current) => {
        const nextQuotes = { ...current };

        for (const quote of quotes) {
          for (const alias of getTradingSymbolAliases(quote.symbol)) {
            nextQuotes[alias] = quote;
          }
        }

        return nextQuotes;
      });
    },
    [chartSymbol, resolveQuoteForSymbol],
  );

  const supplementalQuoteSymbols = React.useMemo(
    () =>
      Array.from(
        new Set([chartSymbol, ...openSymbols].map((symbol) => getSupplementalQuoteSymbol(symbol, tradingAssets)).filter(Boolean) as string[]),
      ),
    [chartSymbol, openSymbols, tradingAssets],
  );
  const subscriptionMarketSymbols = React.useMemo(
    () =>
      Array.from(
        new Set([chartSymbol, compareSymbol, ...openSymbols, ...supplementalQuoteSymbols].filter(Boolean) as string[]),
      ),
    [chartSymbol, compareSymbol, openSymbols, supplementalQuoteSymbols],
  );
  const watchlistMarketSymbols = React.useMemo(
    () => accountWatchlistItems.map((item) => item.symbol),
    [accountWatchlistItems],
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
    enabled: !!token && (subscriptionMarketSymbols.length > 0 || watchlistMarketSymbols.length > 0),
    symbols: Array.from(new Set([...subscriptionMarketSymbols, ...watchlistMarketSymbols])),
    accountIds: accountId ? [accountId] : [],
    onQuotes: handleMarketQuotes,
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
      for (const positionId of locallyClosedPositionIdsRef.current) {
        closedIds.add(positionId);
      }

      setSnapshot((current) => {
        if (!current) {
          return {
            account: {
              ...account,
            },
            positions: payload.positions.filter(
              (position) => !locallyClosedPositionIdsRef.current.has(position.id),
            ),
          };
        }

        return {
          ...current,
          account: {
            ...account,
          },
          positions: mergeLivePositions(
            current.positions,
            payload.positions,
            { closedIds },
          ),
        };
      });

      setLedger((current) => {
        if (!current) {
          return {
            account: {
              ...account,
            },
            positions: payload.positions.filter(
              (position) => !locallyClosedPositionIdsRef.current.has(position.id),
            ),
            trades: payload.trades,
            tradePagination: {
              page: 1,
              limit: payload.trades.length || 1,
              total: payload.trades.length,
              pageCount: 1,
            },
          };
        }

        return {
          ...current,
          account: {
            ...account,
          },
          positions: mergeLivePositions(
            current.positions,
            payload.positions,
            { closedIds },
          ),
          trades: mergeLiveTrades(current.trades, payload.trades),
        };
      });
    },
  });

  return (
    <div>
      <div className="flex w-full flex-col gap-4">
        <PageHeader
          title="Dashboard"
          description="Account overview, equity curve, and trading performance."
        />

        <TradingFilterBar
          assets={tradingAssets}
          selectedAssetId={selectedMarketId}
          onAssetChange={setSelectedMarketId}
          quote={filterBarQuote}
          ohlcv={filterBarOhlcv}
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
          compareAssetId={compareAssetId}
          onCompareChange={setCompareAssetId}
        />

        <div className="grid grid-cols-12 items-start gap-4 xl:gap-5">
          <div className="col-span-12 flex min-w-0 flex-col gap-4 xl:col-span-7">
            <LiveTradingView
              symbol={chartSymbol}
              compareSymbol={compareSymbol}
              timeframe={timeframe}
              liveQuote={chartLiveQuote}
              compareLiveQuote={compareLiveQuote}
              trades={ledger?.trades ?? []}
              tradePositions={snapshot?.positions ?? []}
              onOhlcvChange={setChartOhlcvCandle}
              className="h-[420px] min-h-0 xl:h-[560px]"
            />
            <MarketWatchCard
              items={liveWatchlistItems}
              selectedItemId={selectedMarketId}
              isLoading={accountWatchlistItems.length > 0 && liveWatchlistItems.length < accountWatchlistItems.length}
              onItemSelect={setSelectedMarketId}
              onWatchlistToggle={toggleWishlistAsset}
              className="min-h-[340px] xl:h-[390px]"
            />
          </div>

          <div className="col-span-12 flex min-w-0 flex-col gap-4 xl:col-span-5">
            <OpenPositionsStripCard
              items={openPositionItems}
              className="order-2 h-[420px] min-h-0 xl:order-1 xl:h-[560px]"
              onClosePosition={handleClosePosition}
              onModifyProtection={handleModifyProtection}
            />
            <MarketSnapshotCard
              data={marketSnapshot ?? undefined}
              symbol={chartSymbol}
              assetClass={selectedFilterAsset?.category ?? null}
              className="order-1 min-h-[340px] xl:order-2 xl:h-[390px]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
