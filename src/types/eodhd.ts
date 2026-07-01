import type { TradingTimeframe } from "@/types/trading-filter-bar";

export type ChartCandle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type ChartIndicatorPoint = {
  time: number;
  value: number;
};

export type ChartMarketDataResponse = {
  symbol: string;
  eodhdSymbol: string;
  timeframe: TradingTimeframe;
  candles: ChartCandle[];
  dataSource: "intraday" | "eod";
};

export type UseChartMarketDataOptions = {
  enabled?: boolean;
};

export type EodhdIntradayBar = {
  datetime: string;
  gmtoffset: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type EodhdEodBar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type EodhdRealtimeBar = {
  code: string;
  timestamp: number;
  gmtoffset: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  previousClose?: number;
  change?: number;
  change_p?: number;
};

export type EodhdAssetQuote = {
  symbol: string;
  eodhdSymbol: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  dataSource: "realtime" | "eod";
};

export type EodhdQuotesResponse = {
  quotes: Record<string, EodhdAssetQuote>;
};

export type UseEodhdMarketQuotesOptions = {
  enabled?: boolean;
  refetchInterval?: number;
};
