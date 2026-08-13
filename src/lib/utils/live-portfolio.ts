import type { PortfolioPosition, PortfolioTrade } from "@/types/dashboard";

/**
 * Live portfolio messages may contain only records changed by the latest
 * quote. Keep the initial REST snapshot and apply those changes to it.
 */
export function mergeLivePositions(
  current: PortfolioPosition[],
  updates: PortfolioPosition[],
): PortfolioPosition[] {
  const positionsById = new Map(current.map((position) => [position.id, position]));

  for (const position of updates) {
    if (position.status === "CLOSED") {
      positionsById.delete(position.id);
      continue;
    }

    positionsById.set(position.id, position);
  }

  return Array.from(positionsById.values());
}

export function mergeLiveTrades(
  current: PortfolioTrade[],
  updates: PortfolioTrade[],
): PortfolioTrade[] {
  const tradesById = new Map(current.map((trade) => [trade.id, trade]));

  for (const trade of updates) {
    tradesById.set(trade.id, trade);
  }

  return Array.from(tradesById.values());
}
