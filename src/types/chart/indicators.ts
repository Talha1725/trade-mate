export type VwapSource = "open" | "high" | "low" | "close" | "hl2" | "hlc3" | "ohlc4";
export type VwapAnchorPeriod = "session" | "week" | "month" | "quarter" | "year" | "decade" | "century";
export type VwapBandMode = "standard-deviation" | "percentage";

export type VwapBandSettings = {
  visible: boolean;
  multiplier: number;
};

export type VwapCalculationSettings = {
  source: VwapSource;
  anchorPeriod: VwapAnchorPeriod;
  bandMode: VwapBandMode;
  bands: [VwapBandSettings, VwapBandSettings, VwapBandSettings];
};

export type VwapPoint = {
  time: number;
  value: number;
  source: number;
  cumulativeVolume: number;
  cumulativePriceVolume: number;
  standardDeviation: number | null;
  anchorId: string;
  upperBands: Array<number | null>;
  lowerBands: Array<number | null>;
};
