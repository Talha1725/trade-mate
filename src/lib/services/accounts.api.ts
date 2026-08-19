import { ROUTES } from "@/constants/routes";
import { get, post } from "@/lib/utils/api";
import { useAuthStore } from "@/lib/stores/auth-store";
import { adminApi } from "./admin.api";
import { auditApi } from "./audit.api";
import type { AccountSummary, AccountsApiOptions, PaginatedAccountsResponse, PaginatedTradesResponse } from "@/types/admin";
import type { Trade } from "@/types/trade";

function mapAccountStatus(status: AccountsApiOptions["status"]) {
  if (!status || status === "All") {
    return undefined;
  }

  switch (status) {
    case "Active":
      return "ACTIVE";
    case "Suspended":
      return "SUSPENDED";
    case "Pending":
      return "CLOSED";
    default:
      return status;
  }
}

function mapTradeStatus(status?: string) {
  if (!status || status === "All") {
    return undefined;
  }

  switch (status) {
    case "Open":
      return "OPEN";
    case "Closed":
      return "CLOSED";
    default:
      return status.toUpperCase();
  }
}

function mapAccount(account: {
  id: string;
  userId: string;
  name: string;
  email: string;
  type: string;
  status: string;
  balance: string;
  equity: string;
  floatingPnl: string;
  marginUsed: string;
  currency: string;
  openPositionsCount: number;
  createdAt?: string;
}): AccountSummary {
  const statusMap: Record<string, AccountSummary["status"]> = {
    ACTIVE: "Active",
    SUSPENDED: "Suspended",
    CLOSED: "Suspended",
  };

  return {
    id: account.id,
    name: account.name || "Trader Account",
    email: account.email || "user@trademate.local",
    balance: parseFloat(account.balance),
    equity: parseFloat(account.equity),
    openPositionsCount: account.openPositionsCount ?? 0,
    status: statusMap[account.status] || "Active",
  };
}

function mapTrade(t: any): Trade {
  return {
    id: t.id,
    symbol: t.symbol,
    type: t.direction === "BUY" ? "Buy" : "Sell",
    vol: parseFloat(t.lots),
    openP: parseFloat(t.entryPrice),
    closeP: t.exitPrice ? parseFloat(t.exitPrice) : 0,
    profit: parseFloat(t.pnl),
    status: t.status === "OPEN" ? "Open" : "Closed",
    exitStatus: t.exitStatus ?? null,
    time: t.openedAt,
    stopLoss: t.stopLoss != null ? parseFloat(t.stopLoss) : null,
    takeProfit: t.takeProfit != null ? parseFloat(t.takeProfit) : null,
    notes: t.notes ?? null,
  } as Trade;
}

export const accountsApi = {
  async discoverAccountIds(): Promise<string[]> {
    const ids = new Set<string>();

    // 1. Logged in admin account
    const session = useAuthStore.getState().session;
    if (session?.user?.id) {
      ids.add(`${session.user.id}-demo-account`);
    }

    // 2. Discover from admin trades
    try {
      const trades = await adminApi.getAllAdminTrades();
      for (const t of trades) {
        if (t.accountId) {
          ids.add(t.accountId);
        }
      }
    } catch (e) {
      console.error("Error discovering from trades", e);
    }

    // 3. Discover from audit logs
    try {
      const logs = await auditApi.getAuditLogs({ limit: 50 });
      for (const log of logs.items) {
        if (log.targetAccountId && log.targetAccountId !== "Multiple" && log.targetAccountId !== "N/A") {
          ids.add(log.targetAccountId);
        }
      }
    } catch (e) {
      console.error("Error discovering from audits", e);
    }

    // 4. Discover from localStorage of provisioned users
    try {
      const saved = localStorage.getItem("provisioned_accounts");
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        for (const id of parsed) {
          ids.add(id);
        }
      }
    } catch {}

    return Array.from(ids);
  },

  async getAccounts(opts?: AccountsApiOptions): Promise<PaginatedAccountsResponse> {
    const { page = 1, limit = 25, search, status } = opts ?? {};
    const res = await get<{
      accounts: Array<{
        id: string;
        userId: string;
        name: string;
        email: string;
        type: string;
        status: string;
        balance: string;
        equity: string;
        floatingPnl: string;
        marginUsed: string;
        currency: string;
        openPositionsCount: number;
      }>;
      total: number;
      page: number;
      limit: number;
      pageCount: number;
    }>(ROUTES.ADMIN.ACCOUNTS, {
      params: {
        page,
        limit,
        search: search?.trim() || undefined,
        status: mapAccountStatus(status),
      },
    });

    return {
      items: res.accounts.map(mapAccount),
      total: res.total,
      page: res.page,
      pageCount: res.pageCount,
      pageSize: res.limit,
    };
  },

  async getAllAccounts(opts?: Omit<AccountsApiOptions, "page" | "limit">): Promise<AccountSummary[]> {
    const pageSize = 50;
    const items: AccountSummary[] = [];
    let page = 1;
    let pageCount = 1;

    do {
      const res = await this.getAccounts({
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

  async getAccountById(id: string): Promise<AccountSummary> {
    const res = await get<{
      account: {
        id: string;
        name: string;
        balance: string;
        equity: string;
        status: string;
      };
      positions: any[];
    }>(ROUTES.ACCOUNT.BY_ID(id));

    const statusMap: Record<string, AccountSummary["status"]> = {
      ACTIVE: "Active",
      SUSPENDED: "Suspended",
      CLOSED: "Suspended",
    };

    let email = "user@trademate.local";
    try {
      const logs = await auditApi.getAuditLogs({ limit: 50 });
      for (const log of logs.items) {
        if (log.targetAccountId === id && log.details.includes("user:")) {
          const parts = log.details.split("user: ");
          if (parts[1]) {
            email = parts[1].trim();
          }
        }
      }
    } catch {}

    return {
      id: res.account.id,
      name: res.account.name || "Trader Account",
      email,
      balance: parseFloat(res.account.balance),
      equity: parseFloat(res.account.equity),
      openPositionsCount: res.positions.filter((p) => p.status === "OPEN").length,
      status: statusMap[res.account.status] || "Active",
    };
  },

  async getAccountTrades(
    id: string,
    opts?: { page?: number; limit?: number; search?: string; status?: "Open" | "Closed" | "All" },
  ): Promise<PaginatedTradesResponse> {
    const { page = 1, limit = 25, search, status } = opts ?? {};
    const res = await get<{
      account: {
        id: string;
        name: string;
        balance: string;
        equity: string;
        status: string;
      };
      positions: any[];
      trades: any[];
      tradePagination: {
        page: number;
        limit: number;
        total: number;
        pageCount: number;
      };
    }>(ROUTES.ACCOUNT.BY_ID(id), {
      params: {
        page,
        limit,
        search: search?.trim() || undefined,
        status: mapTradeStatus(status),
      },
    });

    return {
      items: res.trades.map(mapTrade),
      total: res.tradePagination.total,
      page: res.tradePagination.page,
      pageCount: res.tradePagination.pageCount,
      pageSize: res.tradePagination.limit,
    };
  },

  async updateAccount(id: string, data: Partial<AccountSummary>): Promise<AccountSummary> {
    const current = await this.getAccountById(id);
    return {
      ...current,
      ...data,
    };
  },

  async provisionUser(data: any): Promise<any> {
    const res = await post<{ user: any; account: any }>(ROUTES.ADMIN.USERS, data);
    try {
      if (res.account?.id) {
        const saved = localStorage.getItem("provisioned_accounts");
        const parsed = saved ? (JSON.parse(saved) as string[]) : [];
        if (!parsed.includes(res.account.id)) {
          parsed.push(res.account.id);
          localStorage.setItem("provisioned_accounts", JSON.stringify(parsed));
        }
      }
    } catch {}
    return res;
  },
};
