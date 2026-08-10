export type SymbolBreakdownDatum = {
  name: string;
  value: number;
};

export type EquityCurveDatum = {
  name: string;
  equity: number;
};

export type PositionSummary = {
  id: string;
  symbol: string;
  type: "Buy" | "Sell";
  volume: number;
  profit: number;
};

export type RecentActivityItem = {
  id: string;
  symbol: string;
  action: string;
  price: number;
  dateLabel: string;
};

export type StatCardDatum = {
  title: string;
  value: string;
  description: string;
  tone?: "success";
};

export type PortfolioDirection = "BUY" | "SELL";

export type PortfolioStatus = "OPEN" | "CLOSED";

export type PortfolioAccount = {
  id: string;
  userId: string;
  accountNumber: string | null;
  fundingType: string | null;
  name: string;
  type: string;
  status: string;
  accountSize?: string;
  balance: string;
  equity: string;
  floatingPnl: string;
  marginUsed: string;
  currency: string;
};

export type PortfolioPosition = {
  id: string;
  accountId: string;
  symbol: string;
  internalSymbol: string;
  direction: PortfolioDirection;
  lots: string;
  entryPrice: string;
  currentPrice: string | null;
  stopLoss: string | null;
  takeProfit: string | null;
  openedAt: string;
  closedAt: string | null;
  status: PortfolioStatus;
  floatingPnl: string;
  realizedPnl: string | null;
  source: string;
  tradeId: string | null;
};

export type UserPortfolioResponse = {
  account: PortfolioAccount;
  positions: PortfolioPosition[];
};

export type PortfolioTrade = {
  id: string;
  accountId: string;
  userId: string | null;
  symbol: string;
  internalSymbol: string;
  direction: PortfolioDirection;
  lots: string;
  entryPrice: string;
  exitPrice: string | null;
  stopLoss: string | null;
  takeProfit: string | null;
  openedAt: string;
  closedAt: string | null;
  pnl: string;
  status: PortfolioStatus;
  exitStatus: "AUTO" | "MANUAL" | "ADMIN" | null;
  source: string;
  notes: string | null;
  positionId: string | null;
};

export type TradePagination = {
  page: number;
  limit: number;
  total: number;
  pageCount: number;
};

export type AccountLedgerResponse = UserPortfolioResponse & {
  trades: PortfolioTrade[];
  tradePagination: TradePagination;
};

export type TradePositionRecord = PortfolioPosition;

export type TradeOpenResponse = {
  trade: PortfolioTrade;
  position: TradePositionRecord;
  account: PortfolioAccount;
};

export type TradeCloseResponse = {
  trade: PortfolioTrade;
  position: TradePositionRecord;
  account: PortfolioAccount;
};
