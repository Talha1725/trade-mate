import { normalizeTradingSymbol } from "@/lib/utils/market-symbol-icon";
import type { CryptoIconCode } from "@/types/asset-icon";
import { CRYPTO_SYMBOL_PREFIX_MAP } from "@/constants/market-symbols";

export function resolveCryptoIconCode(symbol: string): CryptoIconCode | null {
  const normalized = normalizeTradingSymbol(symbol);

  if (!normalized) {
    return null;
  }

  for (const [prefix, code] of CRYPTO_SYMBOL_PREFIX_MAP) {
    if (normalized.startsWith(prefix)) {
      return code;
    }
  }

  return null;
}
