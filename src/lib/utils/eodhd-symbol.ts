const FOREX_PAIRS = new Set([
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "USDCHF",
  "AUDUSD",
  "USDCAD",
  "NZDUSD",
  "XAUUSD",
  "EURJPY",
  "GBPJPY",
]);

export function resolveEodhdSymbol(symbol: string) {
  const normalized = symbol.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

  if (!normalized) {
    return "BTC-USD.CC";
  }

  if (normalized.endsWith("USDT")) {
    const base = normalized.slice(0, -4);
    return `${base}-USD.CC`;
  }

  if (normalized.endsWith("USD") && normalized.length > 6) {
    const base = normalized.slice(0, -3);
    return `${base}-USD.CC`;
  }

  if (FOREX_PAIRS.has(normalized)) {
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
