import type { ChartMarketDataResponse, EodhdQuotesResponse } from "@/types/eodhd";
import type { TradingTimeframe } from "@/types/trading-filter-bar";

export const chartMarketApi = {
  async getQuotes(symbols: string[]) {
    const params = new URLSearchParams({
      symbols: symbols.join(","),
    });

    const response = await fetch(`/api/market/eodhd-quotes?${params.toString()}`);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(payload?.message ?? "Failed to load market quotes.");
    }

    return response.json() as Promise<EodhdQuotesResponse>;
  },

  async getCandles(symbol: string, timeframe: TradingTimeframe) {
    const params = new URLSearchParams({
      symbol,
      timeframe,
    });

    const response = await fetch(`/api/market/eodhd-candles?${params.toString()}`);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(payload?.message ?? "Failed to load chart candles.");
    }

    return response.json() as Promise<ChartMarketDataResponse>;
  },
};
