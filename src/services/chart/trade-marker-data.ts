"use client";

import { getTradingSymbolAliases } from "@/lib/utils/market-symbol-icon";
import { parseTradeTime } from "@/lib/utils/chart/formatters";
import type { PortfolioPosition, PortfolioTrade } from "@/types/dashboard";
import type { TradeMarker } from "@/types/chart/trade-marker";

export function deriveTradeMarkers(symbol: string, trades: PortfolioTrade[], tradePositions: PortfolioPosition[]): TradeMarker[] {
  const chartAliases = new Set(getTradingSymbolAliases(symbol));
  const tradePositionIds = new Set(trades.map((trade) => trade.positionId).filter(Boolean));
  const fallbackTrades: PortfolioTrade[] = tradePositions.filter((position) => position.status === "OPEN" && !tradePositionIds.has(position.id)).map((position) => ({
    id: position.tradeId ?? position.id, accountId: position.accountId, userId: null, symbol: position.symbol, internalSymbol: position.internalSymbol,
    direction: position.direction, lots: position.lots, entryPrice: position.entryPrice, exitPrice: null, stopLoss: position.stopLoss,
    takeProfit: position.takeProfit, openedAt: position.openedAt, closedAt: null, pnl: position.floatingPnl, status: "OPEN", exitStatus: null,
    source: position.source, notes: null, positionId: position.id,
  }));
  const derivedMarkers: TradeMarker[] = [];
  for (const trade of [...trades, ...fallbackTrades]) {
    const tradeAliases = new Set([...getTradingSymbolAliases(trade.symbol), ...getTradingSymbolAliases(trade.internalSymbol)]);
    if (![...tradeAliases].some((alias) => chartAliases.has(alias))) continue;
    const entryTime = parseTradeTime(trade.openedAt);
    const entryPrice = Number(trade.entryPrice);
    if (entryTime !== null && Number.isFinite(entryPrice)) derivedMarkers.push({ id: `${trade.id}-entry`, side: trade.direction === "BUY" ? "buy" : "sell", time: entryTime, price: entryPrice, quantity: Number(trade.lots), label: "Entry", timestamp: trade.openedAt, symbol: trade.symbol, metadata: trade });
    const exitTime = parseTradeTime(trade.closedAt);
    const exitPrice = trade.exitPrice === null ? null : Number(trade.exitPrice);
    if (exitTime !== null && exitPrice !== null && Number.isFinite(exitPrice)) derivedMarkers.push({ id: `${trade.id}-exit`, side: trade.direction === "BUY" ? "sell" : "buy", time: exitTime, price: exitPrice, quantity: Number(trade.lots), label: "Exit", timestamp: trade.closedAt, symbol: trade.symbol, metadata: trade });
  }
  return derivedMarkers;
}
