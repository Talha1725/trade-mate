import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getBucketTime, mergeLiveQuoteIntoCandles } from "@/lib/utils/merge-live-quote-candles";
import type { ChartCandle } from "@/types/eodhd";

const baseCandles: ChartCandle[] = [
  {
    time: Date.parse("2026-08-25T04:00:00.000Z") / 1000,
    open: 78_969,
    high: 81_245,
    low: 78_711,
    close: 80_634,
    volume: 100,
  },
  {
    time: Date.parse("2026-08-25T08:00:00.000Z") / 1000,
    open: 80_000,
    high: 80_100,
    low: 79_950,
    close: 80_050,
    volume: 10,
  },
];

describe("mergeLiveQuoteIntoCandles", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("updates an existing 4H candle from the quote timestamp bucket", () => {
    vi.setSystemTime("2026-08-25T08:50:00.000Z");

    const merged = mergeLiveQuoteIntoCandles(
      baseCandles,
      {
        price: 80_200,
        timestamp: "2026-08-25T08:48:00.000Z",
        high: 80_250,
        low: 79_900,
        volume: 20,
      },
      "4H",
    );

    expect(merged).toHaveLength(2);
    expect(merged.at(-1)).toMatchObject({
      time: Date.parse("2026-08-25T08:00:00.000Z") / 1000,
      open: 80_000,
      high: 80_250,
      low: 79_900,
      close: 80_200,
      volume: 20,
    });
  });

  it("does not create a duplicate when backend already included the live bucket", () => {
    vi.setSystemTime("2026-08-25T08:50:00.000Z");

    const merged = mergeLiveQuoteIntoCandles(
      baseCandles,
      { price: 80_175, timestamp: "2026-08-25T08:48:00.000Z" },
      "4H",
    );

    expect(merged.map((candle) => candle.time)).toEqual([
      Date.parse("2026-08-25T04:00:00.000Z") / 1000,
      Date.parse("2026-08-25T08:00:00.000Z") / 1000,
    ]);
  });

  it("does not append stale or malformed quote timestamps", () => {
    vi.setSystemTime("2026-08-25T08:50:00.000Z");

    const stale = mergeLiveQuoteIntoCandles(
      baseCandles,
      { price: 79_900, timestamp: "2026-08-25T04:48:00.000Z" },
      "4H",
    );
    const malformed = mergeLiveQuoteIntoCandles(
      baseCandles,
      { price: 80_300, timestamp: "not-a-date" },
      "4H",
    );

    expect(stale).toBe(baseCandles);
    expect(malformed).toBe(baseCandles);
  });

  it("does not append a future candle beyond the expected current bucket", () => {
    vi.setSystemTime("2026-08-25T08:50:00.000Z");

    const merged = mergeLiveQuoteIntoCandles(
      baseCandles,
      { price: 82_000, timestamp: "2026-08-25T16:01:00.000Z" },
      "4H",
    );

    expect(merged).toBe(baseCandles);
  });

  it("uses Monday UTC buckets for weekly live quotes", () => {
    expect(
      getBucketTime(Date.parse("2026-08-25T09:15:00.000Z") / 1000, "W"),
    ).toBe(Date.parse("2026-08-24T00:00:00.000Z") / 1000);
  });
});
