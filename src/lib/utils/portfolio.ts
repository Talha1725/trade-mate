import type { PortfolioMetricCard } from "@/types/portfolio-metric-card";
import type { PortfolioChartResponse, PortfolioOverviewResponse } from "@/types/portfolio-overview";
import type { PortfolioExposureItem, PortfolioAllocationItem } from "@/types/portfolio-overview";
import type { PortfolioAccount, PortfolioPosition } from "@/types/dashboard";
import { resolveUrfxPlanKey } from "@/lib/utils/urfx-pricing";
import type { UrfxPricingPlanKey } from "@/types/urfx-pricing";
import type { TradingFilterBarAsset } from "@/types/trading-filter-bar";
import { PORTFOLIO_GROUPS, type PortfolioGroupId } from "@/constants/portfolio-groups";
import { calculateNotionalUsd, getInstrumentSpec, type QuotePriceMap } from "@/lib/utils/instrument-spec";
import { formatCurrency, formatDisplayPercent, formatSignedCurrency } from "@/lib/utils/number-formatters";

const PROFIT_TARGET_PERCENT_BY_PLAN: Record<UrfxPricingPlanKey, number> = {
  onePhase: 10,
  twoPhase: 10,
  instantFundingPro: 10,
  instantFundingLite: 8,
};

function clampDisplayPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function getRiskTone(label: PortfolioOverviewResponse["summary"]["riskLabel"]) {
  return label === "High" ? "red" : label === "Medium" ? "orange" : "green";
}

function getRiskLabel(marginUsagePercent: number): PortfolioOverviewResponse["summary"]["riskLabel"] {
  if (marginUsagePercent >= 80) {
    return "High";
  }

  if (marginUsagePercent >= 55) {
    return "Medium";
  }

  return "Low";
}

function getAssetGroup(symbol: string, assets: TradingFilterBarAsset[] = []): PortfolioGroupId | null {
  const assetClass = getInstrumentSpec(symbol, assets)?.assetClass;
  return PORTFOLIO_GROUPS.find((group) => assetClass && group.categories.includes(assetClass))?.id ?? null;
}

const DECORATIVE_CHART = [41, 44, 47, 50, 53, 55, 52, 54, 57, 60, 58, 61, 64, 62, 65, 63, 66, 69, 67, 70, 72, 74, 75];
const DECORATIVE_DOWN_CHART = [58, 57, 56, 55, 54, 52, 51, 50, 49, 48, 47, 46, 45];

function toNumber(value: string | number | null | undefined) {
  if (value == null) {
    return 0;
  }

  return typeof value === "number" ? value : Number(value);
}

function resolvePlanKey(fundingType: string | null | undefined) {
  return resolveUrfxPlanKey(fundingType);
}

function getProfitTargetPercent(fundingType: string | null | undefined) {
  const planKey = resolvePlanKey(fundingType);
  return planKey ? PROFIT_TARGET_PERCENT_BY_PLAN[planKey] ?? 10 : 10;
}

export function buildPortfolioAllocationItems(
  account: Pick<PortfolioAccount, "equity">,
  positions: PortfolioPosition[],
  quotePrices: QuotePriceMap = {},
  assets: TradingFilterBarAsset[] = [],
): PortfolioAllocationItem[] {
  const groups = Object.fromEntries(PORTFOLIO_GROUPS.map((group) => [group.id, 0])) as Record<PortfolioGroupId, number>;

  for (const position of positions.filter((item) => item.status === "OPEN")) {
    const currentPrice = toNumber(position.currentPrice ?? position.entryPrice);
    const notional = calculateNotionalUsd(position.symbol, toNumber(position.lots), currentPrice, quotePrices, assets);
    const value = Math.abs(notional ?? (toNumber(position.lots) * currentPrice));
    const group = getAssetGroup(position.symbol, assets);
    if (group) groups[group] += value;
  }

  const equity = Math.max(0, toNumber(account.equity));
  const positionValueSum = Object.values(groups).reduce((sum, value) => sum + value, 0);
  const cash = Math.max(0, equity - positionValueSum);

  const total = Math.max(1, Math.max(equity, positionValueSum));

  return [
    ...PORTFOLIO_GROUPS.map((group) => ({
      id: group.id,
      label: group.label,
      value: Number(groups[group.id].toFixed(2)),
      percent: Number(((groups[group.id] / total) * 100).toFixed(1)),
      color: group.color,
    })),
    { id: "cash", label: "Cash", value: Number(cash.toFixed(2)), percent: Number(((cash / total) * 100).toFixed(1)), color: "#FF8000" },
  ];
}

export function buildPortfolioExposureItems(positions: PortfolioPosition[], assets: TradingFilterBarAsset[] = []): PortfolioExposureItem[] {
  const groupedCounts = Object.fromEntries(PORTFOLIO_GROUPS.map((group) => [group.id, 0])) as Record<PortfolioGroupId, number>;

  for (const position of positions.filter((item) => item.status === "OPEN")) {
    const group = getAssetGroup(position.symbol, assets);
    if (group) groupedCounts[group] += 1;
  }

  const entries = PORTFOLIO_GROUPS
    .map((group) => ({ ...group, count: groupedCounts[group.id] }))
    .filter((item) => item.count > 0);

  const total = entries.reduce((sum, item) => sum + item.count, 0);

  if (total <= 0) {
    return [];
  }

  const normalized = entries.map((item) => {
    const exact = (item.count / total) * 100;
    return {
      ...item,
      exact,
      percent: Math.floor(exact),
      remainder: exact - Math.floor(exact),
    };
  });

  let remainingPoints = Math.max(0, 100 - normalized.reduce((sum, item) => sum + item.percent, 0));

  const byRemainder = [...normalized].sort((left, right) => right.remainder - left.remainder);
  let index = 0;
  while (remainingPoints > 0 && byRemainder.length > 0) {
    const target = byRemainder[index % byRemainder.length];
    target.percent += 1;
    remainingPoints -= 1;
    index += 1;
  }

  return normalized
    .map(({ count: _count, exact: _exact, remainder: _remainder, ...item }) => ({
      ...item,
      percent: item.percent,
    }))
    .filter((item) => item.percent > 0);
}

const ZERO_ACCOUNT = { balance: "0", equity: "0", floatingPnl: "0", marginUsed: "0", accountSize: "0", fundingType: null };
const ZERO_OVERVIEW = { summary: undefined, chart: { defaultTimeframe: "4H" as const, dataByTimeframe: {} as PortfolioChartResponse["dataByTimeframe"] } };

export function buildPortfolioMetricCards(
  account: Pick<PortfolioAccount, "balance" | "equity" | "floatingPnl" | "marginUsed" | "accountSize" | "fundingType"> | null,
  overview: Pick<PortfolioOverviewResponse, "summary" | "chart"> | null,
  liveFloatingPnl?: number,
): PortfolioMetricCard[] {
  const acc = account ?? ZERO_ACCOUNT;
  const ov = overview ?? ZERO_OVERVIEW;
  const walletBalance = Math.max(0, Number(acc.balance));
  const accountSize = Math.max(1, Number(ov.summary?.accountSize ?? acc.accountSize ?? walletBalance));
  const availableMargin = Number(acc.equity) - Number(acc.marginUsed);
  const marginUsagePercent = Number(acc.marginUsed) > 0 ? (Number(acc.marginUsed) / accountSize) * 100 : 0;
  const freeMarginPercent = accountSize > 0 ? (availableMargin / accountSize) * 100 : 0;
  const fallbackProfitTargetPercent = getProfitTargetPercent(acc.fundingType);
  const displayedFloatingPnl = liveFloatingPnl ?? Number(acc.floatingPnl);
  const riskLabel = getRiskLabel(marginUsagePercent);
  const summary =
    ov.summary ?? {
      accountSize,
      walletBalance,
      equity: Number(acc.equity),
      floatingPnl: displayedFloatingPnl,
      availableMargin: Math.max(0, Number(acc.equity) - Number(acc.marginUsed)),
      marginUsagePercent: Number(marginUsagePercent.toFixed(1)),
      openPositionsCount: 0,
      winningPositionsCount: 0,
      losingPositionsCount: 0,
      winRate: 0,
      riskLabel,
      riskTone: getRiskTone(riskLabel),
      profitTarget: {
        baseBalance: accountSize,
        targetAmount: Math.max(1, accountSize * (fallbackProfitTargetPercent / 100)),
        currentProfit: 0,
        remaining: Math.max(1, accountSize * (fallbackProfitTargetPercent / 100)),
        progressPercent: 0,
      },
    };
  const currentProfit = Math.max(0, Number(summary.profitTarget.currentProfit));
  const profitTargetProgress = clampDisplayPercent(summary.profitTarget.progressPercent);
  const remaining = Math.max(0, summary.profitTarget.targetAmount - currentProfit);
  const thirtyDayHigh =
    ov.chart.dataByTimeframe["D"]?.reduce((max, point) => Math.max(max, Number(point.value)), 0) ??
    summary.accountSize;

  return [
    {
      id: "wallet",
      variant: "icon-stats",
      title: "Wallet",
      value: `$${formatCurrency(walletBalance)}`,
      subtitle: `Equity ${formatCurrency(Number(acc.equity))}`,
      subtitleTone: "default",
      iconSrc: "/images/portfolio/wallet.svg",
      iconTone: "green",
      subStats: [
        { label: "30 Days High", value: `$${formatCurrency(thirtyDayHigh)}` },
        { label: "Assets Held", value: `${summary.openPositionsCount} positions` },
      ],
      chartValues: DECORATIVE_CHART,
      valueTone: "default",
    },
    {
      id: "pnl",
      variant: "icon-stats",
      title: "P&L",
      value: formatSignedCurrency(displayedFloatingPnl, "plus"),
      subtitle: "Across open positions",
      subtitleTone: displayedFloatingPnl >= 0 ? "positive" : "negative",
      iconSrc: "/images/portfolio/graph.svg",
      iconTone: displayedFloatingPnl >= 0 ? "green" : "red",
      subStats: [
        { label: "Winning", value: `${summary.winningPositionsCount} positions`, tone: "positive" },
        { label: "Losing", value: `${summary.losingPositionsCount} positions`, tone: "negative" },
      ],
      valueTone: displayedFloatingPnl >= 0 ? "positive" : "negative",
    },
    {
      id: "available-margin",
      variant: "gauge-progress",
      title: "Available Margin",
      value: `$${formatCurrency(availableMargin)}`,
      subtitle: `Margin usage ${formatDisplayPercent(marginUsagePercent)}`,
      gaugeValue: marginUsagePercent,
      progressValue: freeMarginPercent,
      progressLeftLabel: "Free Margin",
      progressRightLabel: `$${formatCurrency(availableMargin)}`,
    },
    // {
    //   id: "risk-score",
    //   variant: "icon-stats",
    //   title: "Risk Score",
    //   value: riskLabel,
    //   subtitle: "Healthy portfolio exposure",
    //   subtitleTone: getRiskTone(riskLabel) === "green" ? "positive" : "default",
    //   iconSrc: "/images/portfolio/risk.svg",
    //   iconTone: getRiskTone(riskLabel),
    //   subStats: [
    //     { label: "VAR", value: formatDisplayPercent(marginUsagePercent) },
    //     { label: "Compliance", value: summary.winRate >= 50 ? "Good" : "Review", tone: summary.winRate >= 50 ? "positive" : "negative" },
    //   ],
    //   valueTone: getRiskTone(riskLabel) === "red" ? "negative" : "positive",
    // },
    {
      id: "profit-target",
      variant: "gauge-progress",
      title: "Profit Target",
      value: formatDisplayPercent(profitTargetProgress),
      subtitle: `$${formatCurrency(currentProfit)} / $${formatCurrency(summary.profitTarget.targetAmount)}`,
      gaugeValue: profitTargetProgress,
      progressValue: profitTargetProgress,
      progressLeftLabel: "Remaining",
      progressRightLabel: `$${formatCurrency(remaining)}`,
    },
  ];
}
