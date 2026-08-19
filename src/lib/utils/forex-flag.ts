import { normalizeTradingSymbol } from "@/lib/utils/market-symbol-icon";
import type { ResolvedForexPairIcon } from "@/types/forex-flag";
import { FOREX_COMMODITY_ICON_MAP, FOREX_CURRENCY_COUNTRY_MAP } from "@/constants/forex";

export function resolveForexPairIcon(symbol: string): ResolvedForexPairIcon | null {
  const normalized = normalizeTradingSymbol(symbol);

  if (normalized.length !== 6) {
    return null;
  }

  const baseCurrency = normalized.slice(0, 3);
  const quoteCurrency = normalized.slice(3, 6);
  const commodityCode = FOREX_COMMODITY_ICON_MAP[baseCurrency];
  const quoteCountry = FOREX_CURRENCY_COUNTRY_MAP[quoteCurrency];

  if (commodityCode && quoteCountry) {
    return {
      kind: "forex-mixed",
      cryptoCode: commodityCode,
      quoteFlag: quoteCountry,
    };
  }

  const baseCountry = FOREX_CURRENCY_COUNTRY_MAP[baseCurrency];
  const quoteCountryCode = FOREX_CURRENCY_COUNTRY_MAP[quoteCurrency];

  if (!baseCountry || !quoteCountryCode) {
    return null;
  }

  return {
    kind: "forex",
    flagCodes: [baseCountry, quoteCountryCode],
  };
}

export function isForexSymbol(symbol: string) {
  return resolveForexPairIcon(symbol) !== null;
}
