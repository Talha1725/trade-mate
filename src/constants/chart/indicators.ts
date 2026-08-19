import type { VwapCalculationSettings } from "@/types/chart/indicators";

export const DEFAULT_VWAP_CALCULATION: VwapCalculationSettings = {
  source: "hlc3",
  anchorPeriod: "session",
  bandMode: "standard-deviation",
  bands: [
    { visible: true, multiplier: 1 },
    { visible: false, multiplier: 2 },
    { visible: false, multiplier: 3 },
  ],
};
