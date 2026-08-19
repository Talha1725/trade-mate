import { ROUTES } from "@/constants/routes";
import { get } from "@/lib/utils/api";
import type { AuditLogEntry, AuditApiQuery, PaginatedAuditResponse } from "@/types/admin";
import { formatNewYorkDateTime } from "@/lib/utils/date-time";

const ACTION_MAP: Record<string, string> = {
  "Inject Trade": "admin.trade_create",
  "Close Position": "admin.trade_delete",
  "Account Update": "admin.provision_user",
  "Bulk Push": "admin.trade_bulk_push",
  "Modify Trade": "admin.trade_update",
};

function mapAuditAction(action?: string) {
  if (!action || action === "All") {
    return undefined;
  }

  return ACTION_MAP[action] ?? action;
}

export const auditApi = {
  async getAuditLogs(filters?: AuditApiQuery): Promise<PaginatedAuditResponse> {
    const res = await get<{
      auditLogs: any[];
      total: number;
      page: number;
      limit: number;
      pageCount: number;
    }>(ROUTES.ADMIN.AUDIT, {
      params: {
        page: filters?.page ?? 1,
        limit: filters?.limit ?? 25,
        action: mapAuditAction(filters?.action),
        search: filters?.search?.trim() || undefined,
      },
    });

    const items = res.auditLogs.map((log: any): AuditLogEntry => {
      let actionMapped: AuditLogEntry["action"] = "Account Update";
      if (log.action === "admin.trade_create") {
        actionMapped = "Inject Trade";
      } else if (log.action === "admin.trade_bulk_push") {
        actionMapped = "Bulk Push";
      } else if (log.action === "admin.trade_update") {
        actionMapped = "Modify Trade";
      } else if (log.action === "admin.trade_delete") {
        actionMapped = "Close Position";
      } else if (log.action === "admin.provision_user") {
        actionMapped = "Account Update";
      }

      let details = "";
      if (log.payload) {
        if (log.action === "admin.provision_user") {
          details = `user: ${log.payload.user?.email || ""} | name: ${log.payload.user?.name || ""}`;
        } else if (log.action === "admin.trade_create") {
          details = `Injected ${log.payload.trade?.direction || ""} trade of ${log.payload.trade?.lots || ""} lot(s) on ${log.payload.trade?.symbol || ""}`;
        } else if (log.action === "admin.trade_update") {
          details = `Updated trade ${log.payload.after?.tradeId || ""} (P&L: $${log.payload.after?.pnl || "0"})`;
        } else if (log.action === "admin.trade_delete") {
          details = `Deleted trade ${log.payload.tradeId || ""} (P&L was $${log.payload.pnl || "0"})`;
        } else if (log.action === "admin.trade_bulk_push") {
          details = `Bulk pushed ${log.payload.direction || ""} trade of ${log.payload.lots || ""} lot(s) on ${log.payload.symbol || ""} to ${log.payload.pushedCount || 0} accounts`;
        }
      }

      return {
        id: log.id,
        timestamp: formatNewYorkDateTime(log.createdAt),
        adminId: log.adminId || "",
        adminEmail: log.admin?.email || "System",
        action: actionMapped,
        targetAccountId: log.targetAccountId || (log.action === "admin.trade_bulk_push" ? "Multiple" : "N/A"),
        details: details || `Performed action ${log.action}`,
      };
    });

    return {
      items,
      total: res.total,
      page: res.page,
      pageCount: res.pageCount,
      pageSize: res.limit,
    };
  },
};
