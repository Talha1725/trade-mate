export type PriceSocketClientMessage =
  | {
      type: "subscribe";
      symbols: string[];
      accountIds?: string[];
    }
  | {
      type: "unsubscribe";
      symbols: string[];
      accountIds?: string[];
    }
  | {
      type: "ping";
    };

export type PriceSocketQuote = {
  symbol: string;
  price: number;
  bid?: number | null;
  ask?: number | null;
  change?: number | null;
  changePercent?: number | null;
  timestamp: string;
  source: string;
};

export type PriceSocketPortfolioMessage = {
  type: "portfolio";
  serverTime: string;
  accountIds: string[];
  accounts: {
    id: string;
    userId: string;
      accountNumber: string | null;
      fundingType: string | null;
      name: string;
      type: string;
      status: string;
      accountSize: string;
      balance: string;
      equity: string;
      floatingPnl: string;
      marginUsed: string;
    currency: string;
  }[];
  positions: {
    id: string;
    accountId: string;
    symbol: string;
    internalSymbol: string;
    direction: "BUY" | "SELL";
    lots: string;
    entryPrice: string;
    currentPrice: string | null;
    stopLoss: string | null;
    takeProfit: string | null;
    openedAt: string;
    closedAt: string | null;
    status: "OPEN" | "CLOSED";
    floatingPnl: string;
    realizedPnl: string | null;
    source: "USER" | "ADMIN" | "AGENT";
    tradeId: string | null;
  }[];
  trades: {
    id: string;
    accountId: string;
    userId: string | null;
    symbol: string;
    internalSymbol: string;
    direction: "BUY" | "SELL";
    lots: string;
    entryPrice: string;
    exitPrice: string | null;
    stopLoss: string | null;
    takeProfit: string | null;
    openedAt: string;
    closedAt: string | null;
    pnl: string;
    status: "OPEN" | "CLOSED";
    exitStatus: "AUTO" | "MANUAL" | "ADMIN" | null;
    source: "USER" | "ADMIN" | "AGENT";
    notes: string | null;
    positionId: string | null;
  }[];
};

export type PriceSocketServerMessage =
  | {
      type: "welcome";
      message: string;
      serverTime: string;
      symbolCount: number;
      accountCount: number;
    }
  | {
      type: "subscribed";
      symbols: string[];
      accountIds: string[];
    }
  | {
      type: "unsubscribed";
      symbols: string[];
      accountIds: string[];
    }
  | {
      type: "snapshot";
      symbols: string[];
      accountIds: string[];
      quotes: PriceSocketQuote[];
      serverTime: string;
    }
  | {
      type: "update";
      quotes: PriceSocketQuote[];
      serverTime: string;
    }
  | PriceSocketPortfolioMessage
  | {
      type: "pong";
      serverTime: string;
    }
  | {
      type: "error";
      message: string;
    };

export type PriceStreamOptions = {
  symbols?: string[];
  accountIds?: string[];
  enabled?: boolean;
  onQuotes?: (quotes: PriceSocketQuote[]) => void;
  onPortfolio?: (payload: PriceSocketPortfolioMessage) => void;
  onError?: (message: string) => void;
};
