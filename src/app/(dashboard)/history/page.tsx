"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { TradeHistoryTable } from "@/components/history/trade-history-table";
import { historyApi } from "@/lib/services/history.api";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useSelectedAccountStore } from "@/lib/stores/account-store";
import type { AccountLedgerResponse } from "@/types/dashboard";
import { mapLedgerTrades } from "@/lib/utils/trader-data";
import { useServerTablePagination } from "@/hooks/use-server-table-pagination";

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export default function HistoryPage() {
  const [ledger, setLedger] = React.useState<AccountLedgerResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const token = useAuthStore((state) => state.session?.token ?? null);
  const selectedAccountId = useSelectedAccountStore((state) => state.selectedAccountId);
  const { page, pageSize, setPage, setPageSize } = useServerTablePagination({
    defaultPage: 1,
    defaultPageSize: 10,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
  });

  React.useEffect(() => {
    setPage(1);
  }, [selectedAccountId, setPage]);

  React.useEffect(() => {
    if (!token || !selectedAccountId) {
      setLedger(null);
      setIsLoading(false);
      return;
    }

    let active = true;

    const refreshLedger = async () => {
      setIsLoading(true);
      setLedger(null);

      try {
        const accountLedger = await historyApi.getAccountLedger(selectedAccountId, token, {
          page,
          limit: pageSize,
        });

        if (active) {
          setLedger(accountLedger);
        }
      } catch {
        // Keep the last loaded trade history visible if a refresh fails.
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void refreshLedger();

    return () => {
      active = false;
    };
  }, [page, pageSize, selectedAccountId, token]);

  const trades = React.useMemo(() => mapLedgerTrades(ledger ?? undefined), [ledger]);

  return (
    <AppShell>
      <div className="flex w-full min-w-0 flex-col gap-6">
        <PageHeader
          title="Trade History"
          description="Review past trades and account performance."
        />
        {isLoading && !ledger ? (
          <div className="flex h-[80vh] w-full items-center justify-center">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : (
          <TradeHistoryTable
            trades={trades}
            isLoading={isLoading && !ledger}
            pagination={ledger ? {
              page: ledger.tradePagination.page,
              pageCount: ledger.tradePagination.pageCount,
              totalItems: ledger.tradePagination.total,
              pageSize: ledger.tradePagination.limit,
              pageSizeOptions: PAGE_SIZE_OPTIONS,
              onPageChange: setPage,
              onPageSizeChange: (nextPageSize) => {
                setPage(1);
                setPageSize(nextPageSize);
              },
            } : undefined}
          />
        )}
      </div>
    </AppShell>
  );
}
