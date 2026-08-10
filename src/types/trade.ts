export interface Trade {
  id: string;
  symbol: string;
  type: "Buy" | "Sell";
  vol: number;
  openP: number;
  closeP: number;
  profit: number;
  time: string;
  openedAt?: string;
  closedAt?: string | null;
  accountId?: string;
  status?: "Open" | "Closed";
  exitStatus?: "AUTO" | "MANUAL" | "ADMIN" | null;
  executionType?: "Market" | "Limit";
  stopLoss?: number | null;
  takeProfit?: number | null;
  notes?: string | null;
}

export interface Position {
  ticket: string;
  symbol: string;
  type: "Buy" | "Sell";
  volume: number;
  openPrice: number;
  sl: number | null;
  tp: number | null;
  current: number;
  profit: number;
}

export type TradeEditorProps = {
  accountId: string;
};

export type TradeOrderDirection = "BUY" | "SELL";

export type TradeOpenPayload = {
  accountId: string;
  symbol: string;
  direction: TradeOrderDirection;
  lots: number;
  stopLoss?: number | null;
  takeProfit?: number | null;
};

export type TradeClosePayload = {
  positionId: string;
  closePrice?: number | null;
};

export type AccountMetricsSummary = {
  accountId: string;
  accountNumber: string | null;
  fundingType: string | null;
  name: string;
  balance: number;
  equity: number;
  floatingPnl: number;
  dailyPnl: number;
  winRate?: number;
  bestAsset: {
    symbol: string;
    pnl: number;
    tradeCount: number;
  } | null;
};

export type TradeStatusFilter = "All" | "Open" | "Closed";
