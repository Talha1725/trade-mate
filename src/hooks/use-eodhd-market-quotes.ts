import { useQuery } from "@tanstack/react-query";

import { chartMarketApi } from "@/lib/services/chart-market.api";
import type { UseEodhdMarketQuotesOptions } from "@/types/eodhd";

function normalizeSymbols(symbols: string[]) {
  return Array.from(
    new Set(
      symbols
        .map((symbol) => symbol.trim().toUpperCase())
        .filter(Boolean),
    ),
  ).sort();
}

export function useEodhdMarketQuotes(
  symbols: string[],
  options?: UseEodhdMarketQuotesOptions,
) {
  const normalizedSymbols = normalizeSymbols(symbols);
  const enabled = (options?.enabled ?? true) && normalizedSymbols.length > 0;

  return useQuery({
    queryKey: ["market", "eodhd", "quotes", normalizedSymbols.join(",")],
    enabled,
    queryFn: () => chartMarketApi.getQuotes(normalizedSymbols),
    staleTime: 15_000,
    refetchInterval: options?.refetchInterval ?? 30_000,
  });
}
