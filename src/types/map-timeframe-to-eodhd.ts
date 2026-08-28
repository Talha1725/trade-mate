export type EodhdFetchPlan = {
  mode: "intraday" | "eod";
  interval: "1m" | "5m" | "1h";
  fromDays: number;
  aggregateBucketSeconds?: number;
};
