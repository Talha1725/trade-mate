import type { PortfolioMetricCard } from "@/types/portfolio-metric-card";
import type { PortfolioChartResponse, PortfolioOverviewResponse } from "@/types/portfolio-overview";
import type { PortfolioExposureItem, PortfolioAllocationItem } from "@/types/portfolio-overview";
import type { PortfolioAccount, PortfolioPosition } from "@/types/dashboard";
import { resolveUrfxPlanKey } from "@/lib/utils/urfx-pricing";
import type { UrfxPricingPlanKey } from "@/types/urfx-pricing";
import { calculateNotionalUsd, getInstrumentSpec, type QuotePriceMap } from "@/lib/utils/instrument-spec";

const PROFIT_TARGET_PERCENT_BY_PLAN: Record<UrfxPricingPlanKey, number> = {
  onePhase: 10,
  twoPhase: 10,
  instantFundingPro: 10,
  instantFundingLite: 8,
};

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatSignedCurrency(value: number) {
  const prefix = value >= 0 ? "+$" : "-$";
  return `${prefix}${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function clampDisplayPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function formatDisplayPercent(value: number) {
  const clampedValue = Math.max(0, Math.min(100, value));

  if (clampedValue === 0) {
    return "0.00%";
  }

  if (clampedValue < 1) {
    return `${Number(clampedValue.toFixed(2)).toString()}%`;
  }

  if (clampedValue < 10) {
    return `${Number(clampedValue.toFixed(1)).toString()}%`;
  }

  return `${Number(clampedValue.toFixed(0)).toString()}%`;
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

function getAssetGroup(symbol: string) {
  const assetClass = getInstrumentSpec(symbol).assetClass;

  if (assetClass === "CRYPTO") {
    return "crypto";
  }

  if (assetClass === "FOREX") {
    return "forex";
  }

  return "commodities";
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
): PortfolioAllocationItem[] {
  const groups = {
    crypto: 0,
    forex: 0,
    cash: 0,
    commodities: 0,
  };

  for (const position of positions.filter((item) => item.status === "OPEN")) {
    const currentPrice = toNumber(position.currentPrice ?? position.entryPrice);
    const notional = calculateNotionalUsd(position.symbol, toNumber(position.lots), currentPrice, quotePrices);
    const value = Math.abs(notional ?? (toNumber(position.lots) * currentPrice));
    const group = getAssetGroup(position.symbol);
    groups[group] += value;
  }

  const equity = Math.max(0, toNumber(account.equity));
  const positionValueSum = groups.crypto + groups.forex + groups.commodities;
  groups.cash = Math.max(0, equity - positionValueSum);

  const total = Math.max(1, Math.max(equity, positionValueSum));

  return [
    { id: "crypto", label: "Crypto", value: Number(groups.crypto.toFixed(2)), percent: Number(((groups.crypto / total) * 100).toFixed(1)), color: "#22E0A2" },
    { id: "forex", label: "Forex", value: Number(groups.forex.toFixed(2)), percent: Number(((groups.forex / total) * 100).toFixed(1)), color: "#3B82F6" },
    { id: "cash", label: "Cash", value: Number(groups.cash.toFixed(2)), percent: Number(((groups.cash / total) * 100).toFixed(1)), color: "#FF8000" },
    { id: "commodities", label: "Commodities", value: Number(groups.commodities.toFixed(2)), percent: Number(((groups.commodities / total) * 100).toFixed(1)), color: "#03D5D5" },
  ];
}

export function buildPortfolioExposureItems(positions: PortfolioPosition[]): PortfolioExposureItem[] {
  const groupedCounts = {
    crypto: 0,
    forex: 0,
    commodities: 0,
  };

  for (const position of positions.filter((item) => item.status === "OPEN")) {
    const group = getAssetGroup(position.symbol);
    groupedCounts[group] += 1;
  }

  const entries = [
    {
      id: "crypto",
      label: "Crypto",
      count: groupedCounts.crypto,
      iconSrc: "/images/portfolio/btc.svg",
      iconTone: "green" as const,
      fill: "linear-gradient(180deg, #0CE9A0 0%, #108961 100%)",
    },
    {
      id: "forex",
      label: "Forex",
      count: groupedCounts.forex,
      iconSrc: "/images/portfolio/dollar.svg",
      iconTone: "blue" as const,
      fill: "linear-gradient(180deg, #60A5FA 0%, #3B82F6 100%)",
    },
    {
      id: "commodities",
      label: "Commodities",
      count: groupedCounts.commodities,
      iconSrc: "/images/portfolio/graph.svg",
      iconTone: "orange" as const,
      fill: "linear-gradient(180deg, #56F0F0 0%, #03D5D5 100%)",
    },
  ].filter((item) => item.count > 0);

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
      value: formatSignedCurrency(displayedFloatingPnl),
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
