export type TradeModification = {
  positionId: string;
  symbol: string;
  side: "Buy" | "Sell";
  lots: number;
  markPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  onSubmit: (input: {
    positionId: string;
    stopLoss: number | null;
    takeProfit: number | null;
  }) => Promise<{ status: "PENDING" | "SENT" | "FAILED" | "SKIPPED" }>;
};
