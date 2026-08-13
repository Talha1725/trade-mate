"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  History,
  Settings,
  Eye,
  EyeOff,
  ChevronRight,
} from "lucide-react";
import { HiMiniChartBar } from "react-icons/hi2";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { AssetIcon } from "@/components/shared/asset-icon";
import type { SidebarItemProps, CardRowProps } from "@/types/components";
import type { AccountMetricsSummary } from "@/types";
import { useAccountSummary, usePositions } from "@/hooks/use-trades";
import { SIDEBAR_ICONS } from "@/lib/mock-data/sidebar-icons";
import { useSelectedAccountStore } from "@/lib/stores/account-store";
import { useLiveAccountSnapshotStore } from "@/lib/stores/live-account-snapshot-store";
import { usePriceStream } from "@/hooks/use-price-stream";
import type { PriceSocketPortfolioMessage } from "@/types/price";
import type { PriceSocketQuote } from "@/types/price";
import type { PortfolioPosition } from "@/types/dashboard";
import { formatTradingSymbolLabel, getTradingSymbolAliases } from "@/lib/utils/market-symbol-icon";
import { getSupplementalQuoteSymbol } from "@/lib/utils/instrument-spec";
import { mergeLivePositions } from "@/lib/utils/live-portfolio";
import { mapPortfolioPositionToPortfolioRow } from "@/lib/utils/trader-data";

function formatCurrency(value?: number) {
  return `$${(value ?? 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatSignedCurrency(value?: number) {
  const amount = value ?? 0;
  const prefix = amount >= 0 ? "+$" : "-$";
  return `${prefix}${Math.abs(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function toNumber(value: string | number | null | undefined) {
  if (value == null) {
    return 0;
  }

  return typeof value === "number" ? value : Number(value);
}

function buildLiveAccountSummary(
  payload: PriceSocketPortfolioMessage,
  accountId: string,
  fallback: AccountMetricsSummary | null,
): AccountMetricsSummary | null {
  const account = payload.accounts.find((item) => item.id === accountId);
  const openPositions = payload.positions.filter((position) => position.accountId === accountId && position.status === "OPEN");

  if (!account && !fallback) {
    return null;
  }

  const accountTrades = payload.trades.filter((trade) => trade.accountId === accountId);
  const closedTrades = accountTrades.filter((trade) => trade.status === "CLOSED" && trade.closedAt);
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const closedTradesLast30Days = closedTrades.filter((trade) => {
    const closedAt = new Date(trade.closedAt ?? trade.openedAt).getTime();
    return !Number.isNaN(closedAt) && closedAt >= thirtyDaysAgo;
  });
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTodayTime = startOfToday.getTime();
  const closedTradesToday = closedTrades.filter((trade) => {
    const closedAt = new Date(trade.closedAt ?? trade.openedAt).getTime();
    return !Number.isNaN(closedAt) && closedAt >= startOfTodayTime;
  });

  const bestAssetBySymbol = new Map<string, { symbol: string; pnl: number; tradeCount: number }>();

  for (const trade of closedTradesLast30Days) {
    const current = bestAssetBySymbol.get(trade.symbol) ?? {
      symbol: trade.symbol,
      pnl: 0,
      tradeCount: 0,
    };

    current.pnl += toNumber(trade.pnl);
    current.tradeCount += 1;
    bestAssetBySymbol.set(trade.symbol, current);
  }

  const bestAsset =
    Array.from(bestAssetBySymbol.values()).sort((left, right) => right.pnl - left.pnl)[0] ??
    fallback?.bestAsset ??
    null;

  const winners = closedTrades.filter((trade) => toNumber(trade.pnl) > 0).length;
  const winRate = closedTrades.length > 0 ? (winners / closedTrades.length) * 100 : fallback?.winRate;
  // Portfolio websocket updates can be partial (only positions touched by the
  // latest quote). The account snapshot contains the complete floating P&L.
  const floatingPnl = account ? toNumber(account.floatingPnl) : openPositions.reduce((sum, position) => sum + toNumber(position.floatingPnl), 0);
  const dailyPnl = closedTradesToday.length > 0
    ? closedTradesToday.reduce((sum, trade) => sum + toNumber(trade.pnl), 0)
    : fallback?.dailyPnl ?? 0;
  const balance = account ? Math.max(0, toNumber(account.balance)) : fallback?.balance ?? 0;
  const equity = account ? toNumber(account.equity) : balance + floatingPnl;

  return {
    accountId,
    accountNumber: account?.accountNumber ?? fallback?.accountNumber ?? null,
    fundingType: account?.fundingType ?? fallback?.fundingType ?? null,
    name: account?.name ?? fallback?.name ?? "Account",
    balance,
    equity,
    floatingPnl,
    dailyPnl,
    winRate,
    bestAsset,
  };
}

function mergeSidebarSummary(
  stableSummary: AccountMetricsSummary | null,
  liveSummary: AccountMetricsSummary | null,
): AccountMetricsSummary | null {
  if (!stableSummary && !liveSummary) {
    return null;
  }

  const baseSummary = stableSummary ?? liveSummary!;
  const livePnl = liveSummary?.floatingPnl ?? baseSummary.floatingPnl;
  const realizedDailyPnl = stableSummary?.dailyPnl ?? liveSummary?.dailyPnl ?? 0;

  return {
    ...baseSummary,
    accountNumber: stableSummary?.accountNumber ?? liveSummary?.accountNumber ?? null,
    fundingType: stableSummary?.fundingType ?? liveSummary?.fundingType ?? null,
    name: stableSummary?.name ?? liveSummary?.name ?? "Account",
    balance: stableSummary?.balance ?? liveSummary?.balance ?? 0,
    equity: stableSummary?.equity ?? liveSummary?.equity ?? 0,
    floatingPnl: livePnl,
    // Daily P&L includes today's realized P&L plus the current floating P&L
    // from open positions.
    dailyPnl: realizedDailyPnl + livePnl,
    winRate: stableSummary?.winRate ?? liveSummary?.winRate,
    bestAsset: liveSummary?.bestAsset ?? stableSummary?.bestAsset ?? null,
  };
}

export function SidebarItem({ icon: Icon, iconSrc, label, href, active, badge }: SidebarItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 px-5 py-[11.5px] transition-all duration-200 text-sm border rounded-[8px] font-medium group select-none cursor-pointer",
        active
          ? "card-green text-white border-primary"
          : "border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/20"
      )}
    >
      {iconSrc ? (
        <Image
          src={iconSrc}
          alt={label}
          width={20}
          height={20}
          className={cn(
            "size-5 shrink-0 transition-all",
            active ? "opacity-100" : "opacity-40 group-hover:opacity-100"
          )}
        />
      ) : Icon ? (
        <Icon
          className={cn(
            "size-5 shrink-0 transition-colors",
            active ? "text-white group-hover:text-white" : "text-neutral-400 group-hover:text-neutral-200"
          )}
        />
      ) : null}
      <span className="truncate">{label}</span>
      {badge !== undefined && (
        <span className="ml-auto bg-[#22E0A2] text-black text-[10px] font-black rounded-full size-5 flex items-center justify-center shadow-[0_0_8px_rgba(34,224,162,0.25)]">
          {badge}
        </span>
      )}
    </Link>
  );
}

function CardRow({
  icon: Icon,
  iconSrc,
  label,
  subLabel,
  value,
  iconColorClass,
  iconBgClass,
  valueIcon,
  valueClassName,
}: CardRowProps) {
  return (
    <div className="flex items-center justify-between p-2.5 rounded-xl border border-white/20 ">
      <div className="flex items-center gap-2.5">
        <div className={`size-7 rounded-sm! flex items-center justify-center shrink-0 ${label === "Open P&L" ? "btn-green" : label === "Best Asset" ? "btn-orange" : label === "Win Rate" ? "btn-blue" : ""} ${iconBgClass}`}>
          {iconSrc ? (
            <Image src={iconSrc} alt={label} width={14} height={14} className="size-3.5" />
          ) : Icon ? (
            <Icon className={cn("size-3.5", iconColorClass)} />
          ) : null}
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-medium text-white leading-3">{label}</span>
          <span className="text-[8px] text-white/60 font-medium mt-1 leading-2">{subLabel}</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {valueIcon}
        <span className={cn("text-xs font-semibold text-[#EDF6FF]", valueClassName)}>{value}</span>
      </div>
    </div>
  );
}

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [showBalance, setShowBalance] = React.useState(true);
  const selectedAccountId = useSelectedAccountStore((state) => state.selectedAccountId);
  const { data: accountSummary, refetch: refetchAccountSummary } = useAccountSummary(selectedAccountId);
  const liveSummariesByAccountId = useLiveAccountSnapshotStore((state) => state.summariesByAccountId);
  const liveOpenOrderCountsByAccountId = useLiveAccountSnapshotStore((state) => state.openOrderCountsByAccountId);
  const setAccountSummary = useLiveAccountSnapshotStore((state) => state.setAccountSummary);
  const setOpenOrderCount = useLiveAccountSnapshotStore((state) => state.setOpenOrderCount);
  const cachedSummary = selectedAccountId ? liveSummariesByAccountId[selectedAccountId] ?? null : null;
  const queryCachedPositions = selectedAccountId
    ? queryClient.getQueryData<{ positions?: Array<{ status?: string }> }>(["positions", selectedAccountId])
    : null;
  const queryCachedOpenOrdersCount =
    queryCachedPositions?.positions?.filter((position) => position.status === "OPEN").length ?? 0;
  const cachedOpenOrdersCount = selectedAccountId
    ? liveOpenOrderCountsByAccountId[selectedAccountId] ?? queryCachedOpenOrdersCount
    : 0;
  const activeSummary = mergeSidebarSummary(accountSummary ?? null, cachedSummary);
  const bestAssetSymbol = activeSummary?.bestAsset?.symbol ?? null;

  const { data: openPositions, isFetching: isOpenPositionsFetching } = usePositions(selectedAccountId);
  const sidebarPositions = openPositions?.positions;
  const [liveQuotes, setLiveQuotes] = React.useState<Record<string, PriceSocketQuote>>({});
  const liveQuotePrices = React.useMemo(
    () => Object.fromEntries(Object.values(liveQuotes).map((quote) => [quote.symbol.toUpperCase(), quote.price])),
    [liveQuotes],
  );
  const sidebarQuoteSymbols = React.useMemo(() => {
    const symbols = new Set<string>();

    for (const position of sidebarPositions ?? []) {
      if (position.status !== "OPEN") {
        continue;
      }

      symbols.add(position.symbol);
      const supplemental = getSupplementalQuoteSymbol(position.symbol);
      if (supplemental) {
        symbols.add(supplemental);
      }
    }

    return Array.from(symbols);
  }, [sidebarPositions]);
  const liveOpenPnl = React.useMemo(() => {
    if (!sidebarPositions) {
      return null;
    }

    return sidebarPositions
      .filter((position) => position.status === "OPEN")
      .reduce((total, position) => {
        const aliases = new Set(getTradingSymbolAliases(position.symbol));
        const quote = Object.values(liveQuotes).find((item) => aliases.has(item.symbol.toUpperCase())) ?? null;
        const row = mapPortfolioPositionToPortfolioRow(position, quote, null, liveQuotePrices);
        return total + row.pnl;
      }, 0);
  }, [liveQuotePrices, liveQuotes, sidebarPositions]);
  const displayedOpenPnl = liveOpenPnl ?? activeSummary?.floatingPnl;
  const livePositionsByAccountIdRef = React.useRef<Record<string, PortfolioPosition[]>>({});
  const [displayedOpenOrdersCount, setDisplayedOpenOrdersCount] = React.useState(cachedOpenOrdersCount);
  const lastStableOpenOrdersCountRef = React.useRef(cachedOpenOrdersCount);

  React.useEffect(() => {
    if (!selectedAccountId) {
      lastStableOpenOrdersCountRef.current = 0;
      setDisplayedOpenOrdersCount(0);
      return;
    }

    const liveCount = liveOpenOrderCountsByAccountId[selectedAccountId];
    if (liveCount != null) {
      lastStableOpenOrdersCountRef.current = liveCount;
      setDisplayedOpenOrdersCount(liveCount);
      return;
    }

    if (openPositions?.positions && !isOpenPositionsFetching) {
      livePositionsByAccountIdRef.current[selectedAccountId] = openPositions.positions;
      const nextCount = openPositions.positions.filter((position) => position.status === "OPEN").length;
      lastStableOpenOrdersCountRef.current = nextCount;
      setDisplayedOpenOrdersCount(nextCount);
      return;
    }

    if (queryCachedOpenOrdersCount > 0) {
      lastStableOpenOrdersCountRef.current = queryCachedOpenOrdersCount;
      setDisplayedOpenOrdersCount(queryCachedOpenOrdersCount);
      return;
    }

    setDisplayedOpenOrdersCount(lastStableOpenOrdersCountRef.current);
  }, [isOpenPositionsFetching, liveOpenOrderCountsByAccountId, openPositions?.positions, queryCachedOpenOrdersCount, selectedAccountId]);

  React.useEffect(() => {
    if (!openPositions?.positions || !selectedAccountId) {
      return;
    }

    setOpenOrderCount(
      selectedAccountId,
      openPositions.positions.filter((position) => position.status === "OPEN").length,
    );
  }, [openPositions?.positions, selectedAccountId, setOpenOrderCount]);

  React.useEffect(() => {
    const handlePositionsChanged = () => {
      if (!selectedAccountId) {
        return;
      }

      void queryClient.invalidateQueries({ queryKey: ["positions", selectedAccountId] });
      void refetchAccountSummary();
    };

    window.addEventListener("trade-mate:positions-changed", handlePositionsChanged);
    return () => window.removeEventListener("trade-mate:positions-changed", handlePositionsChanged);
  }, [queryClient, refetchAccountSummary, selectedAccountId]);

  const activeBalance = activeSummary?.balance ?? 0;
  const activeDailyPnl = activeSummary?.dailyPnl ?? 0;

  const dailyPnlProgress =
    activeDailyPnl === 0 || activeBalance <= 0
      ? 0
      : Math.min(100, Math.max(4, (Math.abs(activeDailyPnl) / activeBalance) * 10000));

  const dailyPnlValue = activeDailyPnl;
  const dailyPnlIsPositive = dailyPnlValue > 0;
  const dailyPnlIsNegative = dailyPnlValue < 0;
  const dailyPnlBarClass = dailyPnlIsPositive
    ? "bg-linear-to-r from-primary via-[#1FE1A4] to-[#10B981] shadow-[0_0_10px_rgba(34,224,162,0.55)]"
    : dailyPnlIsNegative
      ? "bg-linear-to-r from-[#FF4D4D] via-[#EF4444] to-[#B91C1C] shadow-[0_0_10px_rgba(239,68,68,0.55)]"
      : "bg-neutral-500 shadow-[0_0_8px_rgba(115,115,115,0.35)]";

  usePriceStream({
    enabled: !!selectedAccountId,
    symbols: sidebarQuoteSymbols,
    accountIds: selectedAccountId ? [selectedAccountId] : [],
    onQuotes: (quotes) => {
      setLiveQuotes((current) => {
        const next = { ...current };

        for (const quote of quotes) {
          next[quote.symbol.toUpperCase()] = quote;
        }

        return next;
      });
    },
    onPortfolio: (payload) => {
      if (!selectedAccountId) {
        return;
      }

      const accountUpdates = payload.positions.filter((position) => position.accountId === selectedAccountId);
      const currentPositions = livePositionsByAccountIdRef.current[selectedAccountId] ?? sidebarPositions ?? [];
      const nextPositions = mergeLivePositions(currentPositions, accountUpdates);
      livePositionsByAccountIdRef.current[selectedAccountId] = nextPositions;
      const nextCount = nextPositions.filter((position) => position.status === "OPEN").length;
      lastStableOpenOrdersCountRef.current = nextCount;
      setDisplayedOpenOrdersCount(nextCount);
      setOpenOrderCount(selectedAccountId, nextCount);

      const currentSummary = useLiveAccountSnapshotStore.getState().summariesByAccountId[selectedAccountId] ?? accountSummary ?? null;
      const nextSummary = buildLiveAccountSummary(payload, selectedAccountId, currentSummary);

      if (nextSummary) {
        setAccountSummary(nextSummary);
      }
    },
  });

  // Map routes to determine active state
  const isTabActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        "flex w-[278px] shrink-0 flex-col overflow-x-hidden rounded-[20px] border border-white/20 p-4",
        "h-full overflow-y-auto no-scrollbar",
        "lg:sticky lg:top-0 lg:min-h-dvh lg:max-h-dvh lg:self-start lg:overflow-hidden lg:no-scrollbar",
        className,
      )}
    >
    <div className="flex min-h-0 flex-1 flex-col py-1 overflow-y-auto no-scrollbar">
      {/* Brand Header */}
      <div className="flex items-center gap-3 select-none">
        <Image src="/images/logo.svg" alt="logo" height={40} width={213} loading="eager" />
      </div>

      {/* Workspace Label */} 
      <div> 
       <h3 className="text-base leading-4 pb-4 font-medium text-white/60 mt-8">
          Workspace
        </h3>
      </div>
      {/* Workspace Section */}
      <div className="flex flex-col overflow-visible gap-2.5 px-0">
        
        <SidebarItem
          icon={HiMiniChartBar}
          label="Chart View"
          href="/dashboard"
          active={isTabActive("/dashboard")}
        />
        <SidebarItem
          iconSrc={SIDEBAR_ICONS.roundGraph}
          label="Portfolio"
          href="/porfolio"
          active={isTabActive("/porfolio")}
        />
        <SidebarItem
          iconSrc={SIDEBAR_ICONS.reorder}
          label="Orders"
          href="/orders"
          badge={displayedOpenOrdersCount}
          active={isTabActive("/orders")}
        />
        <SidebarItem
          icon={History}
          label="History"
          href="/history"
          active={isTabActive("/history")}
        />
        <SidebarItem
          iconSrc={SIDEBAR_ICONS.pieChart2}
          label="Analytics"
          href="/analytics"
          active={isTabActive("/analytics")}
        />
      </div>

      {/* Tools Section */}
      <div className="flex flex-col gap-[10px] px-0 pt-2.5">
        <SidebarItem
          icon={Settings}
          label="Settings"
          href="/settings"
          active={isTabActive("/settings")}
        />
      </div>
    </div>

      {/* Account Widget Card */}
      {/* Diamond Widget (Hidden)
      {pathname === "/porfolio" && (
        <div className="mt-4 shrink-0 p-4 rounded-[20px] card-green border border-white/20 flex flex-col w-full">
          <div className="absolute -bottom-12 -left-12 size-24 blur-[30px] rounded-full pointer-events-none" />

          <div className="flex justify-center">
            <Image src={SIDEBAR_ICONS.diamond} alt="diamond" width={214} height={88} loading="eager" />
          </div>

          <div className="flex flex-col items-center gap-2.5 py-5 text-center">
            <span className="text-[18px] font-medium text-white leading-4.5">
              Unlock Pro Insights
            </span>
            <span className="text-xs text-white/60">
              Get AI-powered analytics and advanced features.
            </span>
          </div>

          <Link
            href="/analytics"
            className="w-full py-[9px] px-2 rounded-sm hover:bg-white/8 duration-300 bg-white/4 border border-white/5 flex items-center  justify-center gap-1.5"
          >
            <span className="text-sm  font-medium text-primary">
              Upgrade to Pro
            </span>
            <Image src={SIDEBAR_ICONS.upload} alt="upload" width={14} height={14} className="size-3.5" />
          </Link>
        </div>
      )}
      */}
      <div className="mt-4 shrink-0 p-4 rounded-[20px] card-green from-neutral-900/80 to-[#0C0C0E]/90 border border-white/20 flex flex-col gap-3.5 relative overflow-hidden">
          {/* Decorative Green Glow Spot */}
          <div className="absolute -bottom-12 -left-12 size-24 bg-[#22E0A2]/10 blur-[30px] rounded-full pointer-events-none" />

          {/* Card Header & Balance */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[14px] font-regular leading-3.5 text-neutral-400">
              {activeSummary?.accountNumber || activeSummary?.fundingType || "Account Overview"}
            </span>
            <div className="flex items-center justify-between">
              <span className="text-[24px] font-medium leading-6 text-white">
                {showBalance ? formatCurrency(activeSummary?.balance) : "•••••••"}
              </span>
              <button
                onClick={() => setShowBalance(!showBalance)}
                className="text-white/60 hover:text-white transition-colors p-1 cursor-pointer rounded"
                title={showBalance ? "Hide Balance" : "Show Balance"}
              >
                {showBalance ? <Eye className="size-4.5" /> : <EyeOff className="size-4.5" />}
              </button>
            </div>
          </div>

          {/* Daily P&L */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-xs leading-3 text-white/60 font-medium">Daily P&L</span>
              <span
                className={cn(
                  "font-semibold text-xs",
                  dailyPnlIsPositive ? "text-primary" : dailyPnlIsNegative ? "text-destructive" : "text-white/60",
                )}
              >
                {formatCurrency(dailyPnlValue)}
              </span>
            </div>
            <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden mt-1.5">
              <div
                className={cn(
                  "h-full rounded-full shadow-[0_0_8px_rgba(34,224,162,0.4)] transition-[width,background-color] duration-200 ease-out",
                  dailyPnlBarClass,
                )}
                style={{ width: `${dailyPnlProgress}%` }}
              />
            </div>
          </div>

          {/* Reusable Card Rows */}
          <div className="flex flex-col gap-2">
            <CardRow
              iconSrc={SIDEBAR_ICONS.openPnl}
              label="Open P&L"
              subLabel="Today"
              value={formatSignedCurrency(displayedOpenPnl)}
              valueClassName={cn(
                (displayedOpenPnl ?? 0) > 0
                  ? "text-primary"
                  : (displayedOpenPnl ?? 0) < 0
                    ? "text-destructive"
                    : "text-[#EDF6FF]",
              )}
            />
            <CardRow
              iconSrc={SIDEBAR_ICONS.winrate}
              label="Win Rate"
              subLabel="Last 30 Days"
              value={activeSummary?.winRate != null ? `${Math.round(activeSummary.winRate)}%` : "N/A"}
            />
            <CardRow
              iconSrc={SIDEBAR_ICONS.cupStar}
              label="Best Asset"
              subLabel="Last 30 Days"
              value={bestAssetSymbol ? formatTradingSymbolLabel(bestAssetSymbol) : "N/A"}
              valueIcon={
                bestAssetSymbol ? (
                  <AssetIcon symbol={bestAssetSymbol} label={bestAssetSymbol} size={14} className="size-3.5" />
                ) : null
              }
            />
          </div>

          {/* Action Button */}
          <Link
            href="/analytics"
            className="w-full mt-1 py-2.5 px-3 rounded-sm hover:bg-white/10 transition-all duration-200 bg-white/4 border border-white/5  flex items-center justify-center gap-1.5 cursor-pointer group"
          >
            <span className="text-xs leading-3 font-medium text-primary ">
              View Full Analytics
            </span>
            <ChevronRight className="size-3.5 text-primary" />
          </Link>
        </div>
    </aside>
  );
}
