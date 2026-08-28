import { ROUTES } from "@/constants/routes";
import { get, patch, del } from "@/lib/utils/api";
import type { Trade } from "@/types/trade";
import type { AdminTradesQuery, PaginatedTradesResponse } from "@/types/admin";
import { accountsApi } from "@/lib/services/accounts.api";

function mapTrade(t: any): Trade {
  return {
    id: t.id,
    accountId: t.accountId,
    symbol: t.symbol,
    type: t.direction === "BUY" ? "Buy" : "Sell",
    vol: parseFloat(t.lots),
    openP: parseFloat(t.entryPrice),
    closeP: t.exitPrice ? parseFloat(t.exitPrice) : 0,
    profit: parseFloat(t.pnl),
    status: t.status === "OPEN" ? "Open" : "Closed",
    time: t.openedAt,
  } as Trade;
}

export const adminApi = {
  async getAdminTrades(opts?: AdminTradesQuery): Promise<PaginatedTradesResponse> {
    const res = await get<{
      trades: any[];
      total: number;
      page: number;
      limit: number;
      pageCount: number;
    }>(ROUTES.ADMIN.TRADES, {
      params: {
        page: opts?.page ?? 1,
        limit: opts?.limit ?? 25,
        accountId: opts?.accountId,
        status: opts?.status && opts.status !== "All" ? opts.status : undefined,
        search: opts?.search?.trim() || undefined,
      },
    });

    return {
      items: res.trades.map(mapTrade),
      total: res.total,
      page: res.page,
      pageCount: res.pageCount,
      pageSize: res.limit,
    };
  },

  async getAllAdminTrades(opts?: Omit<AdminTradesQuery, "page" | "limit">): Promise<Trade[]> {
    const pageSize = 50;
    const items: Trade[] = [];
    let page = 1;
    let pageCount = 1;

    do {
      const res = await this.getAdminTrades({
        ...opts,
        page,
        limit: pageSize,
      });

      items.push(...res.items);
      pageCount = res.pageCount;
      page += 1;
    } while (page <= pageCount);

    return items;
  },

  async updateAdminTrade(id: string, data: any): Promise<void> {
    await patch(ROUTES.ADMIN.TRADE_BY_ID(id), data);
  },

  async deleteAdminTrade(id: string): Promise<void> {
    await del(ROUTES.ADMIN.TRADE_BY_ID(id));
  },

  async getAdminStats(): Promise<{
    totalAccounts: number;
    totalTrades: number;
    totalProfit: number;
    activePositions: number;
  }> {
    try {
      const [trades, accounts] = await Promise.all([
        this.getAllAdminTrades(),
        accountsApi.getAllAccounts(),
      ]);

      const totalAccounts = accounts.length;
      const totalTrades = trades.length;
      const totalProfit = trades.reduce((sum, trade) => sum + trade.profit, 0);
      const activePositions = accounts.reduce((sum, account) => sum + account.openPositionsCount, 0);

      return {
        totalAccounts,
        totalTrades,
        totalProfit,
        activePositions,
      };
    } catch (e) {
      console.error("Error fetching admin stats", e);
      return {
        totalAccounts: 0,
        totalTrades: 0,
        totalProfit: 0,
        activePositions: 0,
      };
    }
  },
};
