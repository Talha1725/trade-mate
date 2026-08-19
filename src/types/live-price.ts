import type { PriceSocketQuote } from "@/types/price";

export type LivePriceStore = {
  quotes: Record<string, PriceSocketQuote>;
  setQuotes: (quotes: PriceSocketQuote[]) => void;
};

export type LiveQuoteMap = Record<string, PriceSocketQuote>;
