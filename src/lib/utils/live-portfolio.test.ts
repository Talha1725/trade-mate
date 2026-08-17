import { describe, expect, it } from "vitest";

import { mergeLiveTrades } from "./live-portfolio";
import type { PortfolioTrade } from "@/types/dashboard";

const trade = (id: string, status: PortfolioTrade["status"]): PortfolioTrade => ({
  id,
  accountId: "account",
  userId: null,
  symbol: "BTCUSDT",
  internalSymbol: "BTCUSDT",
  direction: "BUY",
  lots: "0.01",
  entryPrice: "63000",
  exitPrice: status === "CLOSED" ? "63478" : null,
  stopLoss: null,
  takeProfit: null,
  openedAt: "2026-08-17T12:00:00Z",
  closedAt: status === "CLOSED" ? "2026-08-17T13:00:00Z" : null,
  pnl: "4.78",
  status,
  exitStatus: status === "CLOSED" ? "MANUAL" : null,
  source: "test",
  notes: null,
  positionId: "position",
});

describe("live portfolio trade merging", () => {
  it("preserves historical trades when a live update contains a new trade", () => {
    expect(mergeLiveTrades([trade("closed", "CLOSED")], [trade("open", "OPEN")]).map((item) => item.id)).toEqual(["closed", "open"]);
  });

  it("updates an existing trade by id", () => {
    expect(mergeLiveTrades([trade("same", "OPEN")], [trade("same", "CLOSED")])[0].status).toBe("CLOSED");
  });
});
