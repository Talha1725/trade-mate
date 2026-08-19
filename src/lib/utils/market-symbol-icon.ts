import type { MarketWatchIcon } from "@/types/market-watch-card";
import { CRYPTO_SYMBOL_BASES, EXACT_SYMBOL_ICON_MAP, SYMBOL_PREFIX_ICON_MAP } from "@/constants/market-symbols";

export function normalizeTradingSymbol(symbol: string) {
  return symbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function getTradingSymbolAliases(symbol: string) {
  const normalized = normalizeTradingSymbol(symbol);

  if (!normalized) {
    return [];
  }

  const aliases = new Set([normalized]);

  for (const base of CRYPTO_SYMBOL_BASES) {
    if (normalized === `${base}USD`) {
      aliases.add(`${base}USDT`);
    } else if (normalized === `${base}USDT`) {
      aliases.add(`${base}USD`);
    }
  }

  return Array.from(aliases);
}

export function resolveMarketWatchIcon(symbol: string): MarketWatchIcon | null {
  const normalized = normalizeTradingSymbol(symbol);

  if (!normalized) {
    return null;
  }

  if (EXACT_SYMBOL_ICON_MAP[normalized]) {
    return EXACT_SYMBOL_ICON_MAP[normalized];
  }

  for (const [prefix, icon] of SYMBOL_PREFIX_ICON_MAP) {
    if (normalized.startsWith(prefix)) {
      return icon;
    }
  }

  return null;
}

export function formatTradingSymbolLabel(symbol: string) {
  const normalized = normalizeTradingSymbol(symbol);

  if (!normalized) {
    return symbol;
  }

  if (normalized.endsWith("USD") && normalized.length > 3) {
    return normalized;
  }

  return normalized;
}
