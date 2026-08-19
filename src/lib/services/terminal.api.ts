import { ROUTES } from "@/constants/routes";
import { get, post } from "@/lib/utils/api";
import type {
  AccountLedgerResponse,
  TradeCloseResponse,
  TradeOpenResponse,
  UserPortfolioResponse,
} from "@/types/dashboard";
import type { MarketHistoryResponse, MarketQuoteResponse, MarketSymbolResponse } from "@/types/market";
import type { TradeClosePayload, TradeOpenPayload } from "@/types";

export const terminalApi = {
  getMarketQuotes(symbols: string[], authToken?: string): Promise<MarketQuoteResponse> {
    return get(ROUTES.MARKET.QUOTES, {
      params: { symbols: symbols.join(",") },
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
    });
  },

  getMarketHistory(symbol: string, interval: "1m" | "5m" | "15m" | "1h" | "1d" = "1d", limit = 120): Promise<MarketHistoryResponse> {
    return get(ROUTES.MARKET.HISTORY, { params: { symbol, interval, limit } });
  },

  getMarketSymbols(): Promise<MarketSymbolResponse> {
    return get(ROUTES.MARKET.SYMBOLS);
  },

  getOpenPositions(authToken?: string, accountId?: string): Promise<UserPortfolioResponse> {
    return get(ROUTES.POSITION.LIST, {
      params: accountId ? { accountId } : undefined,
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
    });
  },

  getAccountLedger(accountId: string, authToken?: string): Promise<AccountLedgerResponse> {
    return get(ROUTES.TRADE.ACCOUNT(accountId), {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
    });
  },

  placeOrder(order: TradeOpenPayload, authToken?: string): Promise<TradeOpenResponse> {
    return post(ROUTES.TRADE.OPEN, order, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
    });
  },

  closeTrade(payload: TradeClosePayload, authToken?: string): Promise<TradeCloseResponse> {
    return post(ROUTES.TRADE.CLOSE, payload, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
    });
  },
};
