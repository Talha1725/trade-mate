import { ROUTES } from "@/constants/routes"
import { post } from "@/lib/utils/api"
import type {
  TradeInjectionTargetOption,
  TradePreviewData,
  TradeInjectionExecuteResponse,
} from "@/types/admin"
import { accountsApi } from "./accounts.api"

export const injectApi = {
  async getInjectionTargets(): Promise<TradeInjectionTargetOption[]> {
    const accounts = await accountsApi.getAllAccounts({ status: "Active" })
    return accounts.map((a) => ({
      value: a.id,
      label: `${a.name} (${a.id}) - $${a.balance.toLocaleString()}`,
    }))
  },

  async previewInjection(prompt: string): Promise<TradePreviewData & { recommendedScope: "SINGLE" | "BULK" }> {
    return post<TradePreviewData & { recommendedScope: "SINGLE" | "BULK" }>(
      ROUTES.ADMIN.INJECT_PREVIEW,
      { prompt },
      { timeout: 60000 },
    )
  },

  async executeInjection(
    payload: { prompt: string; accountId?: string; accountIds?: string[] },
  ): Promise<TradeInjectionExecuteResponse> {
    return post<TradeInjectionExecuteResponse>(ROUTES.ADMIN.INJECT, payload, { timeout: 60000 })
  },
}
