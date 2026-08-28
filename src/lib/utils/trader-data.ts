import type {
  AccountLedgerResponse,
  PortfolioPosition,
  PortfolioTrade,
  PortfolioAccount,
  UserPortfolioResponse,
} from "@/types/dashboard";
import type {
  EquityCurveDatum,
  PositionSummary,
  RecentActivityItem,
  StatCardDatum,
  SymbolBreakdownDatum,
} from "@/types/dashboard";
import type { Position, Trade } from "@/types/trade";
import { getTradingSymbolAliases, resolveMarketWatchIcon } from "@/lib/utils/market-symbol-icon";
import type { PortfolioOpenPositionRow } from "@/types/portfolio-open-positions";
import type { ActiveOrderRow } from "@/types/active-orders";
import type { RecentTradeRow } from "@/types/orders-recent-trades";
import type { PriceSocketQuote } from "@/types/price";
import type { LiveQuoteMap } from "@/types/live-price";
import type { TradingFilterBarAsset } from "@/types/trading-filter-bar";
import {
  calculateMarginUsd,
  calculateNotionalUsd,
  getInstrumentSpec,
} from "@/lib/utils/instrument-spec";
import type { QuotePriceMap } from "@/types/instrument-spec";
import { formatNewYorkDate, formatNewYorkDateTime } from "@/lib/utils/date-time";

function toNumber(value: string | number | null | undefined) {
  if (value == null) {
    return 0;
  }

  return typeof value === "number" ? value : Number(value);
}

function formatMoney(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

function getFreeCash(account: Pick<PortfolioAccount, "balance" | "marginUsed" | "equity">) {
  return Math.max(0, toNumber(account.balance) - toNumber(account.marginUsed));
}

function getExecutablePrice(
  position: PortfolioPosition,
  liveQuote?: PriceSocketQuote | null,
) {
  if (!liveQuote) {
    return toNumber(position.currentPrice ?? position.entryPrice);
  }

  const executablePrice = position.direction === "BUY" ? liveQuote.bid : liveQuote.ask;
  return toNumber(executablePrice ?? liveQuote.price);
}

function resolveLiveQuote(symbol: string, liveQuotes: LiveQuoteMap) {
  const aliases = new Set(getTradingSymbolAliases(symbol));

  return Object.values(liveQuotes).find((quote) => aliases.has(quote.symbol.toUpperCase())) ?? null;
}

export function calculateLiveFloatingPnl(
  positions: PortfolioPosition[],
  liveQuotes: LiveQuoteMap = {},
  quotePrices: QuotePriceMap = {},
  assets: TradingFilterBarAsset[] = [],
) {
  return positions
    .filter((position) => position.status === "OPEN")
    .reduce((total, position) => {
      const liveQuote = resolveLiveQuote(position.symbol, liveQuotes);
      return total + mapPortfolioPositionToPortfolioRow(position, liveQuote, null, quotePrices, assets).pnl;
    }, 0);
}

export function formatDateLabel(dateValue: string | null | undefined) {
  return formatNewYorkDate(dateValue);
}

export function formatDateTimeLabel(dateValue: string | null | undefined) {
  return formatNewYorkDateTime(dateValue);
}

export function mapPortfolioPositionToPosition(position: PortfolioPosition): Position {
  const direction = position.direction === "BUY" ? "Buy" : "Sell";
  const openPrice = toNumber(position.entryPrice);
  const currentPrice = toNumber(position.currentPrice ?? position.entryPrice);

  return {
    ticket: position.id,
    symbol: position.symbol,
    type: direction,
    volume: toNumber(position.lots),
    openPrice,
    sl: position.stopLoss ? toNumber(position.stopLoss) : null,
    tp: position.takeProfit ? toNumber(position.takeProfit) : null,
    current: currentPrice,
    profit: toNumber(position.floatingPnl),
  };
}

export function mapPortfolioPositionToPortfolioRow(
  position: PortfolioPosition,
  liveQuote?: PriceSocketQuote | null,
  _assetCategory?: string | null,
  quotePrices: QuotePriceMap = {},
  assets: TradingFilterBarAsset[] = [],
): PortfolioOpenPositionRow {
  const entryPrice = toNumber(position.entryPrice);
  const size = toNumber(position.lots);
  const directionMultiplier = position.direction === "BUY" ? 1 : -1;
  const spec = getInstrumentSpec(position.symbol, assets);
  const markPrice = getExecutablePrice(position, liveQuote);
  const priceDelta = (markPrice - entryPrice) * directionMultiplier;
  const calculatedPnl = calculateNotionalUsd(position.symbol, size, priceDelta, quotePrices, assets);
  const pnl = calculatedPnl ?? toNumber(position.floatingPnl);
  const pnlPercentBase = calculateMarginUsd(position.symbol, size, entryPrice, quotePrices, assets);
  const pnlPercent = pnlPercentBase != null && pnlPercentBase > 0 ? (pnl / pnlPercentBase) * 100 : 0;

  return {
    id: position.id,
    symbol: position.symbol,
    openedAt: position.openedAt,
    icon: resolveMarketWatchIcon(position.symbol) ?? "bitcoin",
    side: position.direction === "BUY" ? "long" : "short",
    size,
    sizeUnit: position.symbol.replace(/USD$/i, "") || position.symbol,
    avgEntry: entryPrice,
    markPrice,
    takeProfit: position.takeProfit != null ? toNumber(position.takeProfit) : null,
    stopLoss: position.stopLoss != null ? toNumber(position.stopLoss) : null,
    leverage: spec?.leverage ?? 0,
    pnl,
    pnlPercent,
    liquidationPrice: 0,
    risk: Math.abs(pnlPercent) > 10 ? "high" : Math.abs(pnlPercent) > 5 ? "medium" : "low",
  };
}

export function mapPortfolioPositionToActiveOrder(
  position: PortfolioPosition,
  liveQuote?: PriceSocketQuote | null,
  quotePrices: QuotePriceMap = {},
  assets: TradingFilterBarAsset[] = [],
): ActiveOrderRow {
  const entryPrice = toNumber(position.entryPrice);
  const size = toNumber(position.lots);
  const directionMultiplier = position.direction === "BUY" ? 1 : -1;
  const markPrice = getExecutablePrice(position, liveQuote);
  const priceDelta = (markPrice - entryPrice) * directionMultiplier;
  const calculatedPnl = liveQuote
    ? calculateNotionalUsd(position.symbol, size, priceDelta, quotePrices, assets)
    : null;

  return {
    id: position.id,
    displayId: position.id.slice(-8).toUpperCase(),
    symbol: position.symbol,
    openedAt: position.openedAt,
    icon: resolveMarketWatchIcon(position.symbol) ?? "bitcoin",
    side: position.direction === "BUY" ? "buy" : "sell",
    type: "market",
    qty: size,
    price: entryPrice,
    // An active position has not exited yet. Keep this separate from the
    // live mark price so the Exit column does not fluctuate while open.
    exitPrice: null,
    markPrice: markPrice,
    pnl: calculatedPnl ?? toNumber(position.floatingPnl),
    takeProfit: position.takeProfit ? toNumber(position.takeProfit) : null,
    stopLoss: position.stopLoss ? toNumber(position.stopLoss) : null,
    status: "filled",
  };
}

export function mapPortfolioTradeToTrade(trade: PortfolioTrade): Trade {
  const direction = trade.direction === "BUY" ? "Buy" : "Sell";
  const closePrice = trade.exitPrice ? toNumber(trade.exitPrice) : toNumber(trade.entryPrice);

  return {
    id: trade.id,
    symbol: trade.symbol,
    type: direction,
    vol: toNumber(trade.lots),
    openP: toNumber(trade.entryPrice),
    closeP: closePrice,
    profit: toNumber(trade.pnl),
    time: formatDateTimeLabel(trade.closedAt ?? trade.openedAt),
    openedAt: trade.openedAt,
    closedAt: trade.closedAt,
    status: trade.status === "OPEN" ? "Open" : "Closed",
    exitStatus: trade.exitStatus ?? null,
    stopLoss: trade.stopLoss ? toNumber(trade.stopLoss) : null,
    takeProfit: trade.takeProfit ? toNumber(trade.takeProfit) : null,
    notes: trade.notes,
  };
}

export function mapPortfolioTradeToRecentTrade(trade: PortfolioTrade): RecentTradeRow {
  const entryPrice = toNumber(trade.entryPrice);
  const exitPrice = toNumber(trade.exitPrice ?? trade.entryPrice);

  return {
    id: trade.id,
    symbol: trade.symbol,
    price: exitPrice,
    direction: exitPrice >= entryPrice ? "up" : "down",
    sizeBtc: toNumber(trade.lots),
    time: formatDateTimeLabel(trade.closedAt ?? trade.openedAt),
  };
}

export function buildOpenPositionSummary(positions: PortfolioPosition[]): PositionSummary[] {
  return positions.map((position) => ({
    id: position.id,
    symbol: position.symbol,
    type: position.direction === "BUY" ? "Buy" : "Sell",
    volume: toNumber(position.lots),
    profit: toNumber(position.floatingPnl),
  }));
}

export function buildRecentActivity(trades: PortfolioTrade[]): RecentActivityItem[] {
  return [...trades]
    .sort((left, right) => {
      const leftDate = new Date(left.closedAt ?? left.openedAt).getTime();
      const rightDate = new Date(right.closedAt ?? right.openedAt).getTime();
      return rightDate - leftDate;
    })
    .slice(0, 5)
    .map((trade) => ({
      id: trade.id,
      symbol: trade.symbol,
      action: trade.closedAt ? `Close ${trade.direction === "BUY" ? "Buy" : "Sell"}` : trade.direction === "BUY" ? "Buy" : "Sell",
      price: toNumber(trade.exitPrice ?? trade.entryPrice),
      dateLabel: formatDateLabel(trade.closedAt ?? trade.openedAt),
    }));
}

export function buildEquityCurve(account: PortfolioAccount, trades: PortfolioTrade[]): EquityCurveDatum[] {
  const closedTrades = [...trades]
    .filter((trade) => trade.closedAt)
    .sort((left, right) => new Date(left.closedAt ?? left.openedAt).getTime() - new Date(right.closedAt ?? right.openedAt).getTime());
  const accountSize = toNumber(account.accountSize ?? account.balance);
  const currentBalance = toNumber(account.balance);

  if (closedTrades.length === 0) {
    return [
      { name: "Start", equity: accountSize },
      { name: "Now", equity: currentBalance },
    ];
  }

  let runningEquity = accountSize;

  const points = closedTrades.map((trade, index) => {
    runningEquity += toNumber(trade.pnl);

    return {
      name: formatDateLabel(trade.closedAt ?? trade.openedAt) || `T${index + 1}`,
      equity: Number(runningEquity.toFixed(2)),
    };
    });

  const clippedPoints = points.slice(-7);
  const finalPoint = clippedPoints.at(-1);

  if (finalPoint && finalPoint.equity !== currentBalance) {
    clippedPoints[clippedPoints.length - 1] = {
      ...finalPoint,
      equity: Number(currentBalance.toFixed(2)),
    };
  }

  return clippedPoints;
}

export function buildSymbolBreakdown(
  positions: PortfolioPosition[],
  quotePrices: QuotePriceMap = {},
  assets: TradingFilterBarAsset[] = [],
): SymbolBreakdownDatum[] {
  const totals = new Map<string, number>();

  for (const position of positions) {
    const current = totals.get(position.symbol) ?? 0;
    const currentPrice = toNumber(position.currentPrice ?? position.entryPrice);
    const notional = calculateNotionalUsd(position.symbol, toNumber(position.lots), currentPrice, quotePrices, assets);
    totals.set(
      position.symbol,
      current + (notional != null ? Math.abs(notional) : Math.max(Math.abs(toNumber(position.floatingPnl)), toNumber(position.lots))),
    );
  }

  return Array.from(totals.entries()).map(([name, value]) => ({
    name,
    value: Number(value.toFixed(2)),
  }));
}

export function buildStatCards(
  account: PortfolioAccount,
  positions: PortfolioPosition[],
  trades: PortfolioTrade[],
  quotePrices: QuotePriceMap = {},
  liveQuotes: LiveQuoteMap = {},
  assets: TradingFilterBarAsset[] = [],
): StatCardDatum[] {
  const closedTrades = trades.filter((trade) => trade.status === "CLOSED");
  const winners = closedTrades.filter((trade) => toNumber(trade.pnl) > 0).length;
  const winRate = closedTrades.length > 0 ? Math.round((winners / closedTrades.length) * 100) : 0;

  const freeCash = getFreeCash(account);
  const liveFloatingPnl = calculateLiveFloatingPnl(positions, liveQuotes, quotePrices, assets);

  return [
    {
      title: "Account Balance",
      value: formatMoney(freeCash),
      description: `${formatMoney(toNumber(account.equity) - freeCash)} floating`,
    },
    {
      title: "Open Positions",
      value: String(positions.length),
      description: `${positions.filter((position) => position.direction === "BUY").length} long / ${positions.filter((position) => position.direction === "SELL").length} short`,
    },
    {
      title: "Today's P&L",
      value: formatMoney(liveFloatingPnl),
      description: `${formatMoney(liveFloatingPnl)} account floating`,
      tone: "success",
    },
    {
      title: "Win Rate",
      value: `${winRate}%`,
      description: `${closedTrades.length} closed trades`,
    },
  ];
}

export function buildDashboardData(
  snapshot: UserPortfolioResponse,
  ledger?: AccountLedgerResponse,
  quotePrices: QuotePriceMap = {},
  liveQuotes: LiveQuoteMap = {},
  assets: TradingFilterBarAsset[] = [],
) {
  const account = ledger?.account ?? snapshot.account;
  const positions = ledger?.positions ?? snapshot.positions;
  const trades = ledger?.trades ?? [];

  return {
    account,
    positions,
    trades,
    statCards: buildStatCards(account, positions, trades, quotePrices, liveQuotes, assets),
    equityCurve: buildEquityCurve(account, trades),
    breakdown: buildSymbolBreakdown(positions, quotePrices, assets),
    openPositionsSummary: buildOpenPositionSummary(positions),
    recentActivity: buildRecentActivity(trades),
  };
}

export function mapSnapshotPositions(snapshot: UserPortfolioResponse) {
  return snapshot.positions.map(mapPortfolioPositionToPosition);
}

export function mapLedgerTrades(ledger?: AccountLedgerResponse) {
  return ledger?.trades?.map(mapPortfolioTradeToTrade) ?? [];
}
