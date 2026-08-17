import { describe, expect, it } from "vitest";

import { aggregateCandles, calculateEma, calculateVwap } from "./chart-indicators";

const candles = [
  { time: 0, open: 10, high: 12, low: 9, close: 11, volume: 2 },
  { time: 60, open: 11, high: 13, low: 10, close: 12, volume: 3 },
  { time: 120, open: 12, high: 14, low: 11, close: 13, volume: 4 },
];

describe("chart indicators", () => {
  it("aggregates candles into timeframe buckets", () => {
    expect(aggregateCandles(candles, 120)).toEqual([
      { time: 0, open: 10, high: 13, low: 9, close: 12, volume: 5 },
      { time: 120, open: 12, high: 14, low: 11, close: 13, volume: 4 },
    ]);
  });

  it("calculates EMA and VWAP points", () => {
    expect(calculateEma([10, 12, 14], 2)).toEqual([null, 11, 13]);
    expect(calculateVwap(candles).map((point) => point.value)).toEqual([10.666666666666666, 11.266666666666666, 11.88888888888889]);
  });
});
