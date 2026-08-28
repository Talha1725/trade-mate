export type MarketAssetClass = "FOREX" | "CRYPTO" | "STOCK" | "INDEX";

export type MarketSymbolRecord = {
  id: string;
  displaySymbol: string;
  internalSymbol: string;
  providerSymbol: string;
  assetClass: MarketAssetClass;
  name: string;
  exchange?: string | null;
  active: boolean;
};

export type MarketQuote = {
  symbol: string;
  price: number;
  bid?: number | null;
  ask?: number | null;
  change?: number | null;
  changePercent?: number | null;
  timestamp: string;
  source: string;
};

export type MarketCandle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number | null;
};

export type MarketSymbolResponse = {
  symbols: MarketSymbolRecord[];
};

export type MarketQuoteResponse = {
  quotes: MarketQuote[];
};

export type MarketHistoryResponse = {
  symbol: string;
  interval: string;
  candles: MarketCandle[];
  source: string;
};

export type MarketChartResponse = {
  symbol: string;
  timeframe: string;
  candles: MarketCandle[];
  source: string;
  dataSource: "intraday" | "eod" | "mock";
};
