import { describe, expect, it } from "vitest";

import { formatChartPrice, formatMeasurementDuration, formatMeasurementVolume, formatTrendlineTime, isForexSymbol } from "@/lib/utils/chart/formatters";

describe("chart formatters", () => {
  it("formats forex and non-forex prices with their existing precision", () => {
    expect(formatChartPrice(1.23456, "EURUSD")).toBe("1.23456");
    expect(formatChartPrice(63478.4, "BTCUSDT")).toBe("63,478.40");
    expect(isForexSymbol("EURUSD")).toBe(true);
    expect(isForexSymbol("BTCUSDT")).toBe(false);
  });

  it("formats measurement labels", () => {
    expect(formatMeasurementDuration(3660)).toBe("1h");
    expect(formatMeasurementVolume(1_250_000)).toBe("1.25M");
    expect(formatTrendlineTime(Date.UTC(2026, 7, 17, 13, 5) / 1000)).toBe("17 Aug '26 13:05");
  });
});

