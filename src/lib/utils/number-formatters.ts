import type { ZeroSign } from "@/types/number-formatters";

function resolveSign(value: number, zeroSign: ZeroSign) {
  if (value > 0) return "+";
  if (value < 0) return "-";
  if (zeroSign === "plus") return "+";
  if (zeroSign === "minus") return "-";
  return "";
}

export function formatCurrency(value: number, currency = "") {
  return `${currency}${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatSignedCurrency(value: number, zeroSign: ZeroSign = "none") {
  const sign = resolveSign(value, zeroSign);
  return `${sign}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatSignedPercent(value: number, zeroSign: ZeroSign = "plus") {
  const sign = resolveSign(value, zeroSign);
  return `${sign}${Math.abs(value).toFixed(2)}%`;
}

export function formatFixedPercent(value: number, fractionDigits = 2) {
  return `${value.toFixed(fractionDigits)}%`;
}

export function formatDisplayPercent(value: number) {
  const clampedValue = Math.max(0, Math.min(100, value));

  if (clampedValue === 0) return "0.00%";
  if (clampedValue < 1) return `${Number(clampedValue.toFixed(2)).toString()}%`;
  if (clampedValue < 10) return `${Number(clampedValue.toFixed(1)).toString()}%`;
  return `${Number(clampedValue.toFixed(0)).toString()}%`;
}
