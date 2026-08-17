"use client";

import { create } from "zustand";

import type { LivePriceStore } from "@/types/live-price";

function isNewerQuote(next: LivePriceStore["quotes"][string], current?: LivePriceStore["quotes"][string]) {
  if (!current) {
    return true;
  }

  const nextTime = Date.parse(next.timestamp);
  const currentTime = Date.parse(current.timestamp);

  if (!Number.isFinite(nextTime) || !Number.isFinite(currentTime)) {
    return true;
  }

  return nextTime > currentTime || (nextTime === currentTime && next.source === "eodhd-ws" && current.source !== "eodhd-ws");
}

export const useLivePriceStore = create<LivePriceStore>()((set) => ({
  quotes: {},
  setQuotes: (incomingQuotes) =>
    set((state) => {
      const nextQuotes = { ...state.quotes };

      for (const quote of incomingQuotes) {
        const key = quote.symbol.toUpperCase();
        if (isNewerQuote(quote, nextQuotes[key])) {
          nextQuotes[key] = quote;
        }
      }

      return { quotes: nextQuotes };
    }),
}));
