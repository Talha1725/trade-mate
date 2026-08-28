import { describe, expect, it } from "vitest";

import {
  getInstrumentSpec,
  getQuoteToUsdRate,
  getSupplementalQuoteSymbol,
} from "@/lib/utils/instrument-spec";

const assets = [
  { symbol: "EURGBP", category: "FOREX" as const, contractSize: 100_000, quoteCurrency: "GBP", leverage: 100 },
  { symbol: "GBPUSD", category: "FOREX" as const, contractSize: 100_000, quoteCurrency: "USD", leverage: 100 },
  { symbol: "USDJPY", category: "FOREX" as const, contractSize: 100_000, quoteCurrency: "JPY", leverage: 100 },
];

describe("database-driven instrument conversion", () => {
  it("finds the supplemental pair from available assets", () => {
    expect(getSupplementalQuoteSymbol("EURGBP", assets)).toBe("GBPUSD");
    expect(getSupplementalQuoteSymbol("USDJPY", assets)).toBe(null);
  });

  it("uses direct and inverse quote rates without a currency switch", () => {
    const eurGbp = getInstrumentSpec("EURGBP", assets);
    const usdJpy = getInstrumentSpec("USDJPY", assets);

    expect(eurGbp && getQuoteToUsdRate(eurGbp, 0.86, { GBPUSD: 1.27 }, assets)).toBe(1.27);
    expect(usdJpy && getQuoteToUsdRate(usdJpy, 150, {}, assets)).toBeCloseTo(1 / 150);
  });
});
