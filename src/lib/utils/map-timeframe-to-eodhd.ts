import type { TradingTimeframe } from "@/types/trading-filter-bar";

export type EodhdFetchPlan = {
  mode: "intraday" | "eod";
  interval: "1m" | "5m" | "1h";
  fromDays: number;
  aggregateBucketSeconds?: number;
};

export function mapTimeframeToEodhdPlan(timeframe: TradingTimeframe): EodhdFetchPlan {
  switch (timeframe) {
    case "1m":
      return { mode: "intraday", interval: "1m", fromDays: 5 };
    case "5m":
      return { mode: "intraday", interval: "5m", fromDays: 30 };
    case "15m":
      return { mode: "intraday", interval: "5m", fromDays: 45, aggregateBucketSeconds: 15 * 60 };
    case "1H":
      return { mode: "intraday", interval: "1h", fromDays: 120 };
    case "4H":
      return { mode: "intraday", interval: "1h", fromDays: 365, aggregateBucketSeconds: 4 * 60 * 60 };
    case "D":
      return { mode: "eod", interval: "1h", fromDays: 365 * 2 };
    case "W":
      return { mode: "eod", interval: "1h", fromDays: 365 * 5, aggregateBucketSeconds: 7 * 24 * 60 * 60 };
    default:
      return { mode: "intraday", interval: "1h", fromDays: 365, aggregateBucketSeconds: 4 * 60 * 60 };
  }
}
