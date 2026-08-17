export function formatLegendValue(value: number | null) {
  if (value === null || Number.isNaN(value)) return "--";
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatSignedLegendValue(value: number) {
  const formatted = formatLegendValue(Math.abs(value));
  return value < 0 ? `-${formatted}` : `+${formatted}`;
}

export function formatMeasurementDuration(seconds: number) {
  const value = Math.abs(seconds);
  if (value >= 86400) return `${(value / 86400).toFixed(1).replace(/\.0$/, "")}d`;
  if (value >= 3600) return `${(value / 3600).toFixed(1).replace(/\.0$/, "")}h`;
  if (value >= 60) return `${Math.round(value / 60)}m`;
  return `${Math.round(value)}s`;
}

export function formatMeasurementVolume(value: number) {
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2).replace(/\.00$/, "")}B`;
  if (absolute >= 1_000_000) return `${(value / 1_000_000).toFixed(2).replace(/\.00$/, "")}M`;
  if (absolute >= 1_000) return `${(value / 1_000).toFixed(2).replace(/\.00$/, "")}K`;
  return Math.round(value).toLocaleString("en-US");
}

export function formatTrendlinePrice(value: number) {
  if (Math.abs(value) < 10) return value.toFixed(5);
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function isForexSymbol(symbol: string) {
  const normalized = symbol.trim().toUpperCase().replace(/[^A-Z]/g, "");
  const currencies = new Set(["AUD", "CAD", "CHF", "EUR", "GBP", "JPY", "NZD", "USD"]);
  return normalized.length === 6 && currencies.has(normalized.slice(0, 3)) && currencies.has(normalized.slice(3));
}

export function getChartPriceFormat(symbol: string) {
  return isForexSymbol(symbol)
    ? { type: "price" as const, precision: 5, minMove: 0.00001 }
    : { type: "price" as const, precision: 2, minMove: 0.01 };
}

export function formatChartPrice(value: number, symbol: string) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: isForexSymbol(symbol) ? 5 : 2,
    maximumFractionDigits: isForexSymbol(symbol) ? 5 : 2,
  });
}

export function formatTrendlineTime(time: number) {
  const date = new Date(time * 1000);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = date.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  const year = String(date.getUTCFullYear()).slice(-2);
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${day} ${month} '${year} ${hours}:${minutes}`;
}

export function parseTradeTime(value: string | null | undefined) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp / 1000 : null;
}

