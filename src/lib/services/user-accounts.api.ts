import { ROUTES } from "@/constants/routes";
import { get } from "@/lib/utils/api";
import type { UserAccountListResponse, UserAccountSummary } from "@/types/account";

export const userAccountsApi = {
  async getAccounts(authToken?: string): Promise<UserAccountListResponse> {
    return get<UserAccountListResponse>(ROUTES.ACCOUNT.LIST, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
    });
  },

  async getAccountById(accountId: string, authToken?: string): Promise<UserAccountSummary | null> {
    const response = await this.getAccounts(authToken);
    return response.accounts.find((account) => account.id === accountId) ?? null;
  },
};

