import { EODHD_CRYPTO_BASES, EODHD_FOREX_PAIRS } from "@/constants/eodhd-symbols";

export function resolveEodhdSymbol(symbol: string) {
  const normalized = symbol.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

  if (!normalized) {
    return "BTC-USD.CC";
  }

  if (normalized.endsWith("USDT")) {
    const base = normalized.slice(0, -4);
    return `${base}-USD.CC`;
  }

  if (normalized.endsWith("USD")) {
    const base = normalized.slice(0, -3);

    if (EODHD_CRYPTO_BASES.has(base)) {
      return `${base}-USD.CC`;
    }
  }

  if (normalized.endsWith("USD") && normalized.length > 6) {
    const base = normalized.slice(0, -3);
    return `${base}-USD.CC`;
  }

  if (EODHD_FOREX_PAIRS.has(normalized)) {
    return `${normalized}.FOREX`;
  }

  if (/^[A-Z]{6}$/.test(normalized)) {
    return `${normalized}.FOREX`;
  }

  return `${normalized}.US`;
}

export function formatChartSymbolLabel(symbol: string) {
  const normalized = symbol.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

  if (normalized.endsWith("USDT") && normalized.length > 4) {
    const base = normalized.slice(0, -4);
    return `${base}USD`;
  }

  return normalized;
}
