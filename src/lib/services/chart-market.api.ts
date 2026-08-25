import { ROUTES } from "@/constant/routes";
import { get } from "@/lib/utils/api";
import type { MarketChartResponse, MarketQuoteResponse } from "@/types/market";
import type { ChartMarketDataResponse, EodhdAssetQuote, EodhdQuotesResponse } from "@/types/eodhd";
import type { TradingTimeframe } from "@/types/trading-filter-bar";

function mapQuote(quote: MarketQuoteResponse["quotes"][number]): EodhdAssetQuote {
  return {
    symbol: quote.symbol,
    eodhdSymbol: quote.symbol,
    price: quote.price,
    change: quote.change ?? 0,
    changePercent: quote.changePercent ?? 0,
    open: quote.price,
    high: quote.price,
    low: quote.price,
    volume: 0,
    timestamp: quote.timestamp,
    dataSource: quote.source === "eodhd-ws" ? "realtime" : "eod",
  };
}

export const chartMarketApi = {
  async getQuotes(symbols: string[]) {
    const response = await get<MarketQuoteResponse>(ROUTES.MARKET.QUOTES, {
      params: { symbols: symbols.join(",") },
    });

    return {
      quotes: Object.fromEntries(response.quotes.map((quote) => [quote.symbol.toUpperCase(), mapQuote(quote)])),
    } satisfies EodhdQuotesResponse;
  },

  async getCandles(symbol: string, timeframe: TradingTimeframe) {
    const response = await get<MarketChartResponse>(ROUTES.MARKET.CHART_DATA, {
      params: { symbol, timeframe },
    });

    return {
      symbol: response.symbol,
      eodhdSymbol: response.symbol,
      timeframe,
      candles: response.candles.map((candle) => ({
        time: Math.floor(new Date(candle.time).getTime() / 1000),
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume ?? 0,
      })),
      dataSource: response.dataSource === "mock" ? "eod" : response.dataSource,
    } satisfies ChartMarketDataResponse;
  },
};
