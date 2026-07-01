import { useQuery } from "@tanstack/react-query";

import { chartMarketApi } from "@/lib/services/chart-market.api";
import type { UseChartMarketDataOptions } from "@/types/eodhd";
import type { TradingTimeframe } from "@/types/trading-filter-bar";

export function useChartMarketData(
  symbol: string,
  timeframe: TradingTimeframe,
  options?: UseChartMarketDataOptions,
) {
  const enabled = (options?.enabled ?? true) && !!symbol;

  return useQuery({
    queryKey: ["chart", "eodhd", symbol, timeframe],
    enabled,
    queryFn: () => chartMarketApi.getCandles(symbol, timeframe),
    staleTime: 60_000,
  });
}
