export type TradeProtectionModification = {
  positionId: string;
  stopLoss: number | null;
  takeProfit: number | null;
};

export type TradeProtectionModificationResponse = {
  sync: {
    status: "PENDING" | "SENT" | "FAILED" | "SKIPPED";
    eventId: string | null;
    lastError?: string | null;
  };
};
